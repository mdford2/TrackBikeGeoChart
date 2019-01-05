(function(){
	"use strict";

	var root = this,
		Chart = root.Chart,
		helpers = Chart.helpers;

	var defaultConfig = {

		///Boolean - Whether grid lines are shown across the chart
		scaleShowGridLines : true,

		//String - Colour of the grid lines
		scaleGridLineColor : "rgba(0,0,0,.05)",

		//Number - Width of the grid lines
		scaleGridLineWidth : 1,

		//Boolean - Whether to show horizontal lines (except X axis)
		scaleShowHorizontalLines: true,

		//Boolean - Whether to show vertical lines (except Y axis)
		scaleShowVerticalLines: true,

		//Boolean - Whether the line is curved between points
		bezierCurve : true,

		//Number - Tension of the bezier curve between points
		bezierCurveTension : 0.4,

		//Boolean - Whether to show a dot for each point
		pointDot : true,

		//Number - Radius of each point dot in pixels
		pointDotRadius : 5,

		//Number - Pixel width of point dot stroke
		pointDotStrokeWidth : 2,

		//Number - amount extra to add to the radius to cater for hit detection outside the drawn point
		pointHitDetectionRadius : 0,

		//Boolean - Whether to show a stroke for datasets
		datasetStroke : true,

		//Number - Pixel width of dataset stroke
		datasetStrokeWidth : 2,

		//Boolean - Whether to fill the dataset with a colour
		datasetFill : true,

		//String - A legend template
		legendTemplate : "<ul class=\"<%=name.toLowerCase()%>-legend\"><% for (var i=0; i<datasets.length; i++){%><li><span style=\"background-color:<%=datasets[i].strokeColor%>\"><%if(datasets[i].label){%><%=datasets[i].label%><%}%></span></li><%}%></ul>",

		//Boolean - Whether to horizontally center the label and point dot inside the grid
		offsetGridLines : false,

		//Number - Pixel width of the graph legend. Not displayed if 0.
		legendWidth : 180,

		disabledColor : "rgba(0,0,0,.02)"

	};


	Chart.Legend = Chart.Element.extend({
		initialize : function(){
			this.font = helpers.fontString(this.fontSize,this.fontStyle,this.fontFamily);

			this.titleFont = helpers.fontString(this.titleFontSize,this.titleFontStyle,this.titleFontFamily);

			this.height = (this.labels.length * this.fontSize) + ((this.labels.length-1) * (this.fontSize/2)) + (this.yPadding*2) + this.titleFontSize *1.5;

			this.ctx.font = this.titleFont;

			var titleWidth = this.ctx.measureText(this.title).width,
				//Label has a legend square as well so account for this.
				labelWidth = helpers.longestText(this.ctx,this.font,this.labels) + this.fontSize + 3,
				longestTextWidth = helpers.max([labelWidth,titleWidth]);

			this.width = longestTextWidth + (this.xPadding*2);

			this.x -= this.width;
		},
		getLineHeight : function(index){
			var baseLineHeight = this.y - (this.height/2) + this.yPadding,
				afterTitleIndex = index-1;

			//If the index is zero, we're getting the title
			if (index === 0){
				return baseLineHeight + this.titleFontSize/2;
			} else{
				return baseLineHeight + ((this.fontSize*1.5*afterTitleIndex) + this.fontSize/2) + this.titleFontSize * 1.5;
			}

		},
		getReverseLineHeight : function(height) {
			var baseLineHeight = this.y - (this.height/2) + this.yPadding;

			if(height <= baseLineHeight + this.titleFontSize/2) {
				return -1;
			}
			return Math.floor((height + this.fontSize/2 - baseLineHeight - this.titleFontSize * 1.5 - this.fontSize/2) / (this.fontSize*1.5));
		},
		containsPoint : function(point) {
			if(this.x <= point.x && point.x <= this.x + this.width) {
				if(this.y - this.height/2 <= point.y && point.y <= this.y + this.height/2) {
					return true;
				}
			}
			return false;
		},
		draw : function(){
			// Custom Tooltips
			if(this.custom){
				this.custom(this);
			}
			else{
				helpers.drawRoundedRectangle(this.ctx,this.x,this.y - this.height/2,this.width,this.height,this.cornerRadius);
				var ctx = this.ctx;
				ctx.fillStyle = this.fillColor;
				ctx.fill();
				ctx.closePath();

				ctx.textAlign = "left";
				ctx.textBaseline = "middle";
				ctx.fillStyle = this.titleTextColor;
				ctx.font = this.titleFont;

				ctx.fillText(this.title,this.x + this.xPadding, this.getLineHeight(0));

				ctx.font = this.font;

				helpers.each(this.datasets, function(dataset, index){
					var label = helpers.template("<%= label %>", dataset);
					ctx.fillStyle = this.textColor;
					ctx.fillText(label,this.x + this.xPadding + this.fontSize + 3, this.getLineHeight(index + 1));

					//A bit gnarly, but clearing this rectangle breaks when using explorercanvas (clears whole canvas)
					//ctx.clearRect(this.x + this.xPadding, this.getLineHeight(index + 1) - this.fontSize/2, this.fontSize, this.fontSize);
					//Instead we'll make a white filled block to put the legendColour palette over.

					ctx.fillStyle = this.legendColorBackground;
					ctx.fillRect(this.x + this.xPadding, this.getLineHeight(index + 1) - this.fontSize/2, this.fontSize, this.fontSize);

					if(dataset.enabled) {
						ctx.fillStyle = dataset.pointColor;
						ctx.fillRect(this.x + this.xPadding, this.getLineHeight(index + 1) - this.fontSize/2, this.fontSize, this.fontSize);
					}
				},this);
			}
		}
	});


	Chart.Type.extend({
		name: "Graph",
		defaults : defaultConfig,
		initialize:  function(data){
			//Declare the extension of the default point, to cater for the options passed in to the constructor
			this.PointClass = Chart.Point.extend({
				offsetGridLines : this.options.offsetGridLines,
				strokeWidth : this.options.pointDotStrokeWidth,
				radius : this.options.pointDotRadius,
				display: this.options.pointDot,
				hitDetectionRadius : this.options.pointHitDetectionRadius,
				ctx : this.chart.ctx,
				xvalue : null,
				// inRange : function(mouseX){
				// 	return (Math.pow(mouseX-this.x, 2) < Math.pow(this.radius + this.hitDetectionRadius,2));
				// }
				inRange : function(mouseX, mouseY){
					return (Math.abs(mouseX-this.x, 2) < Math.abs(this.radius + this.hitDetectionRadius,2)) &&
								(Math.abs(mouseY-this.y, 2) < Math.abs(this.radius + this.hitDetectionRadius,2));
				},
				pointDistance : function(mouseX, mouseY) {
					return Math.pow(mouseX-this.x, 2) + Math.pow(mouseY-this.y, 2); 
				}
			});

			this.datasets = [];
			var legendLabels = [], legendColors = [];

			//Set up tooltip events on the chart
			if (this.options.showTooltips){
				helpers.bindEvents(this, this.options.tooltipEvents, function(evt){
					var activePoints, eventPosition = helpers.getRelativePosition(evt);
					if (this.legend.containsPoint(eventPosition)) {
						var index = this.legend.getReverseLineHeight(eventPosition.y);
						if (index >= 0) {
							activePoints = this.datasets[index].points;
						}
					} else {
						activePoints = (evt.type !== 'mouseout') ? this.getPointsAtEvent(evt) : [];
					}
					this.eachPoints(function(point){
						point.restore(['fillColor', 'strokeColor']);
					});
					helpers.each(activePoints, function(activePoint){
						activePoint.fillColor = activePoint.highlightFill;
						activePoint.strokeColor = activePoint.highlightStroke;
					});
					this.showTooltip(activePoints);
				});
			}

			//Iterate through each of the datasets, and build this into a property of the chart
			helpers.each(data.datasets,function(dataset){
				var datasetObject = {
					enabled : dataset.hasOwnProperty("enabled") ? dataset.enabled : true,
					label : dataset.label || null,
					fillColor : dataset.fillColor,
					strokeColor : dataset.strokeColor,
					pointColor : dataset.pointColor,
					pointStrokeColor : dataset.pointStrokeColor,
					points : []
				};

				this.datasets.push(datasetObject);

				legendLabels.push(helpers.template("<%= label %>", dataset));
				legendColors.push({fill: dataset.pointColor}); //, stroke: dataset.pointStrokeColor});

				if (datasetObject.enabled) {
					helpers.each(dataset.data,function(dataPoint,index){
						//Add a new point for each piece of data, passing any required data to draw.
						datasetObject.points.push(new this.PointClass({
							value : dataPoint,
							xvalue : dataset.xdata[index],
							label : dataset.labels[index],
							datasetLabel: dataset.label,
							strokeColor : dataset.pointStrokeColor,
							fillColor : dataset.pointColor,
							highlightFill : dataset.pointHighlightFill || dataset.pointColor,
							highlightStroke : dataset.pointHighlightStroke || dataset.pointStrokeColor
						}));
					},this);
				} else {
					helpers.each(dataset.data,function(dataPoint,index){
						//Add a new point for each piece of data, passing any required data to draw.
						datasetObject.points.push(new this.PointClass({
							value : dataPoint,
							xvalue : dataset.xdata[index],
							label : dataset.labels[index],
							datasetLabel: dataset.label,
							strokeColor : this.options.disabledColor,
							fillColor : this.options.disabledColor,
							highlightFill : dataset.pointHighlightFill || dataset.pointColor,
							highlightStroke : dataset.pointHighlightStroke || dataset.pointStrokeColor
						}));
					},this);	
				}

				this.buildScale(data.labels);


				this.eachPoints(function(point, index){
					helpers.extend(point, {
						//x: this.scale.calculateX(index),
						x: this.scale.xendPoint,
						y: this.scale.endPoint
					});
					point.save();
				}, this);

			},this);


			this.legend = new Chart.Legend({
						x: this.chart.width,
						y: this.chart.height/2,
						
						datasets: this.datasets,
						labels: legendLabels,
						legendColors: legendColors,

						title: helpers.template("\tModels\t",legendLabels),
						chart: this.chart,
						ctx: this.chart.ctx,

						custom: this.options.customTooltips,
						xPadding: this.options.tooltipXPadding,
						yPadding: this.options.tooltipYPadding,
						xOffset: this.options.tooltipXOffset,
						fillColor: this.options.tooltipFillColor,
						textColor: this.options.tooltipFontColor,
						fontFamily: this.options.tooltipFontFamily,
						fontStyle: this.options.tooltipFontStyle,
						fontSize: this.options.tooltipFontSize,
						titleTextColor: this.options.tooltipTitleFontColor,
						titleFontFamily: this.options.tooltipTitleFontFamily,
						titleFontStyle: this.options.tooltipTitleFontStyle,
						titleFontSize: this.options.tooltipTitleFontSize,
						cornerRadius: this.options.tooltipCornerRadius,
						legendColorBackground : this.options.multiTooltipKeyBackground
					});

			helpers.bindEvents(this, ["click"], function(evt){
					var eventPosition = helpers.getRelativePosition(evt);
					if (this.legend.containsPoint(eventPosition)) {
						var index = this.legend.getReverseLineHeight(eventPosition.y);
						if (index >= 0) {
							this.enableDisableDataset(index);
							this.draw();
						}
					}
				});


			this.render();
		},
		enableDisableDataset : function (index) {
			var dataset = this.datasets[index];
			if(dataset.enabled) {
				dataset.enabled = false;
				helpers.each(dataset.points, function(dataPoint,index){
					dataPoint.strokeColor = this.options.disabledColor;
					dataPoint.fillColor = this.options.disabledColor;
					//dataPoint.highlightFill = this.options.disabledColor;
					//dataPoint.highlightStroke = this.options.disabledColor;
					dataPoint.save();
				}, this);
			} else {
				dataset.enabled = true;
				helpers.each(dataset.points, function(dataPoint,index){
					dataPoint.strokeColor = dataset.pointStrokeColor;
					dataPoint.fillColor = dataset.pointColor;
					//dataPoint.highlightFill = dataset.pointColor;
					//dataPoint.highlightStroke = dataset.pointStrokeColor;
					dataPoint.save();
				});
			}
		},
		showTooltip : function(ChartElements, forceRedraw){
			// Only redraw the chart if we've actually changed what we're hovering on.
			if (typeof this.activeElements === 'undefined') this.activeElements = [];

			var isChanged = (function(Elements){
				var changed = false;

				if (Elements.length !== this.activeElements.length){
					changed = true;
					return changed;
				}

				helpers.each(Elements, function(element, index){
					if (element !== this.activeElements[index]){
						changed = true;
					}
				}, this);
				return changed;
			}).call(this, ChartElements);

			if (!isChanged && !forceRedraw){
				return;
			}
			else{
				this.activeElements = ChartElements;
			}
			this.draw();
			if(this.options.customTooltips){
				this.options.customTooltips(false);
			}
			if (ChartElements.length == 1){ //> 0){
				helpers.each(ChartElements, function(Element) {
					var tooltipPosition = Element.tooltipPosition();
					new Chart.Tooltip({
						x: Math.round(tooltipPosition.x),
						y: Math.round(tooltipPosition.y),
						xPadding: this.options.tooltipXPadding,
						yPadding: this.options.tooltipYPadding,
						fillColor: this.options.tooltipFillColor,
						textColor: this.options.tooltipFontColor,
						fontFamily: this.options.tooltipFontFamily,
						fontStyle: this.options.tooltipFontStyle,
						fontSize: this.options.tooltipFontSize,
						caretHeight: this.options.tooltipCaretSize,
						cornerRadius: this.options.tooltipCornerRadius,
						text: helpers.template(this.options.tooltipTemplate, Element),
						chart: this.chart,
						custom: this.options.customTooltips
					}).draw();
				}, this);
			}
			return this;
		},
		update : function(){
			this.scale.update();
			// Reset any highlight colours before updating.
			helpers.each(this.activeElements, function(activeElement){
				activeElement.restore(['fillColor', 'strokeColor']);
			});
			this.eachPoints(function(point){
				point.save();
			});
			this.render();
		},
		eachPoints : function(callback){
			helpers.each(this.datasets,function(dataset){
				helpers.each(dataset.points,callback,this);
			},this);
		},
		getPointsAtEvent : function(e){
			var pt, thisdist;
			var dist = 10000000000;
			var pointsArray = [],
				eventPosition = helpers.getRelativePosition(e);
			if(eventPosition.x < this.scale.xstartPoint || eventPosition.x > this.scale.xendPoint ||
					eventPosition.y < this.scale.startPoint || eventPosition.y > this.scale.endPoint) {
			 	return pointsArray;
			}
			helpers.each(this.datasets, function(dataset) {
				if (dataset.enabled) {
					helpers.each(dataset.points, function(point) {
						thisdist = point.pointDistance(eventPosition.x, eventPosition.y);
						if(dist > thisdist) {
							dist = thisdist;
							pt = point;
						}
					});
				}
			}, this);
			pointsArray.push(pt);

			return pointsArray;
		},
		buildScale : function(labels){
			var self = this;

			var dataTotal = function(){
				var values = [];
				self.eachPoints(function(point){
					values.push(point.value);
				});

				return values;
			}, 
			xdataTotal = function() {
				var values = [];
				self.eachPoints(function(point){
					values.push(point.xvalue);
				});

				return values;
			};

			var scaleOptions = {
				templateString : this.options.scaleLabel,
				height : this.chart.height,
				width : this.chart.width,
				ctx : this.chart.ctx,
				textColor : this.options.scaleFontColor,
				offsetGridLines : this.options.offsetGridLines,
				fontSize : this.options.scaleFontSize,
				fontStyle : this.options.scaleFontStyle,
				fontFamily : this.options.scaleFontFamily,
				valuesCount : labels.length,
				beginAtZero : this.options.scaleBeginAtZero,
				integersOnly : this.options.scaleIntegersOnly,
				legendWidth : this.options.legendWidth,
				calculateYRange : function(currentHeight){
					var updatedRanges = helpers.calculateScaleRange(
						dataTotal(),
						currentHeight,
						this.fontSize,
						this.beginAtZero,
						this.integersOnly
					);
					helpers.extend(this, updatedRanges);
				},
				calculateX : function(value){
					var scalingFactor = (this.xendPoint - this.xstartPoint) / (this.xmax - this.xmin);
					return this.xstartPoint + (scalingFactor * (value - this.xmin));
				},
				calculateXLabelRotation : function() {
					this.ctx.font = this.font;

					var firstWidth = this.ctx.measureText(this.xLabels[0]).width,
						lastWidth = this.ctx.measureText(this.xLabels[this.xLabels.length - 1]).width;

					this.xScalePaddingRight = lastWidth/2 + 3 + this.legendWidth;
					this.xScalePaddingLeft = Math.max(firstWidth/2, this.yLabelWidth);
					this.xLabelWidth = helpers.longestText(this.ctx,this.font,this.xLabels);

					//Add a bunch of things for Graph
					this.xstartPoint = this.xScalePaddingLeft + this.padding; //this.yLabelWidth + this.padding;
					this.xendPoint = this.width - this.xScalePaddingRight - this.padding; //- this.xScalePaddingLeft; // -5 to pad labels
					this.xmin = helpers.min(xdataTotal());
					this.xmax = helpers.max(xdataTotal());
				},
				// calculateXRange : function(currentWidth) {
				// 	var updatedRanges = helpers.calculateScaleRange(
				// 		xdataTotal(),
				// 		currentWidth,
				// 		this.fontSize,
				// 		this.beginAtZero,
				// 		this.integersOnly
				// 	);
				// 	helpers.extend(this, updatedRanges);
				// },
				xLabels : labels,//calculateXLabels(),
				font : helpers.fontString(this.options.scaleFontSize, this.options.scaleFontStyle, this.options.scaleFontFamily),
				lineWidth : this.options.scaleLineWidth,
				lineColor : this.options.scaleLineColor,
				showHorizontalLines : this.options.scaleShowHorizontalLines,
				showVerticalLines : this.options.scaleShowVerticalLines,
				gridLineWidth : (this.options.scaleShowGridLines) ? this.options.scaleGridLineWidth : 0,
				gridLineColor : (this.options.scaleShowGridLines) ? this.options.scaleGridLineColor : "rgba(0,0,0,0)",
				padding: (this.options.showScale) ? 0 : this.options.pointDotRadius + this.options.pointDotStrokeWidth,
				showLabels : this.options.scaleShowLabels,
				display : this.options.showScale
			};

			if (this.options.scaleOverride){
				helpers.extend(scaleOptions, {
					calculateYRange: helpers.noop,
					steps: this.options.scaleSteps,
					stepValue: this.options.scaleStepWidth,
					min: this.options.scaleStartValue,
					max: this.options.scaleStartValue + (this.options.scaleSteps * this.options.scaleStepWidth)
				});
			}


			this.scale = new Chart.Scale(scaleOptions);
		},
		reflow : function(){
			var newScaleProps = helpers.extend({
				height : this.chart.height,
				width : this.chart.width
			});
			this.scale.update(newScaleProps);
		},
		draw : function(ease){
			var easingDecimal = ease || 1;
			this.clear();

			var ctx = this.chart.ctx;

			// Some helper methods for getting the next/prev points
			var hasValue = function(item){
				return item.value !== null;
			},
			nextPoint = function(point, collection, index){
				return helpers.findNextWhere(collection, hasValue, index) || point;
			},
			previousPoint = function(point, collection, index){
				return helpers.findPreviousWhere(collection, hasValue, index) || point;
			};

			if (!this.scale) return;
			this.scale.draw(easingDecimal);


			helpers.each(this.datasets,function(dataset){
				var pointsWithValues = helpers.where(dataset.points, hasValue);

				//Transition each point first so that the line and point drawing isn't out of sync
				//We can use this extra loop to calculate the control points of this dataset also in this loop

				helpers.each(dataset.points, function(point, index){
					if (point.hasValue()){
						point.transition({
							y : this.scale.calculateY(point.value),
							x : this.scale.calculateX(point.xvalue)
						}, easingDecimal);
					}
				},this);

				//Draw the line between all the points
				ctx.lineWidth = this.options.datasetStrokeWidth;
				if (dataset.enabled) {
					ctx.strokeStyle = dataset.strokeColor;
				} else {
					ctx.strokeStyle = this.options.disabledColor;
				}
				ctx.beginPath();

				helpers.each(pointsWithValues, function(point, index){
 					if (index === 0){
						ctx.moveTo(point.x, point.y);
 					}
 					else{
							ctx.lineTo(point.x,point.y);
 					}
				}, this);

				if (this.options.datasetStroke) {
					ctx.stroke();
				}

				//Now draw the points over the line
				//A little inefficient double looping, but better than the line
				//lagging behind the point positions
				helpers.each(pointsWithValues,function(point){
					point.draw();
				});
			},this);

			this.legend.draw();
		}
	});


}).call(this);
