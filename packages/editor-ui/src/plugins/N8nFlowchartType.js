(function () {

	"use strict";
	const root = this, _jp = root.jsPlumb, _ju = root.jsPlumbUtil,  _jg = root.Biltong;
	const STRAIGHT = "Straight";
	const ARC = "Arc";

	const _prepareCompute = function (params, overrideTargetEndpoint) {
		let { targetPos, targetEndpoint, getEndpointOffset } = params;
		const gap = params.gap || 0;
		const sourceGap = _ju.isArray(gap) ? gap[0] : gap;
		const targetGap = _ju.isArray(gap) ? gap[1] : gap;
		const stub = params.stub || 0;
		const sourceStub = _ju.isArray(stub) ? stub[0] : stub;
		const targetStub = _ju.isArray(stub) ? stub[1] : stub;

		// if has override, use override
		if (
			overrideTargetEndpoint
		) {
			const target = overrideTargetEndpoint.anchor.lastReturnValue;
			targetPos = [target[0], target[1]];
			targetEndpoint = overrideTargetEndpoint;
		}

		// this.strokeWidth = params.strokeWidth;
		var segment = _jg.quadrant(params.sourcePos, targetPos),
			swapX = targetPos[0] < params.sourcePos[0],
			swapY = targetPos[1] < params.sourcePos[1],
			lw = params.strokeWidth || 1,
			so = params.sourceEndpoint.anchor.getOrientation(params.sourceEndpoint), // source orientation
			to = targetEndpoint.anchor.getOrientation(targetEndpoint), // target orientation
			x = swapX ? targetPos[0] : params.sourcePos[0],
			y = swapY ? targetPos[1] : params.sourcePos[1],
			w = Math.abs(targetPos[0] - params.sourcePos[0]),
			h = Math.abs(targetPos[1] - params.sourcePos[1]);

		// if either anchor does not have an orientation set, we derive one from their relative
		// positions.  we fix the axis to be the one in which the two elements are further apart, and
		// point each anchor at the other element.  this is also used when dragging a new connection.
		if (so[0] === 0 && so[1] === 0 || to[0] === 0 && to[1] === 0) {
			var index = w > h ? 0 : 1, oIndex = [1, 0][index];
			so = [];
			to = [];
			so[index] = params.sourcePos[index] > targetPos[index] ? -1 : 1;
			to[index] = params.sourcePos[index] > targetPos[index] ? 1 : -1;
			so[oIndex] = 0;
			to[oIndex] = 0;
		}

		const sx = swapX ? w + (sourceGap * so[0]) : sourceGap * so[0],
			sy = swapY ? h + (sourceGap * so[1]) : sourceGap * so[1],
			tx = swapX ? targetGap * to[0] : w + (targetGap * to[0]),
			ty = swapY ? targetGap * to[1] : h + (targetGap * to[1]),
			oProduct = ((so[0] * to[0]) + (so[1] * to[1]));

		const sourceStubWithOffset = sourceStub + (getEndpointOffset && params.sourceEndpoint ? getEndpointOffset(params.sourceEndpoint) : 0);
		const targetStubWithOffset = targetStub + (getEndpointOffset && targetEndpoint ? getEndpointOffset(targetEndpoint) : 0);

		var result = {
			sx: sx, sy: sy, tx: tx, ty: ty, lw: lw,
			xSpan: Math.abs(tx - sx),
			ySpan: Math.abs(ty - sy),
			mx: (sx + tx) / 2,
			my: (sy + ty) / 2,
			so: so, to: to, x: x, y: y, w: w, h: h,
			segment: segment,
			startStubX: sx + (so[0] * sourceStubWithOffset),
			startStubY: sy + (so[1] * sourceStubWithOffset),
			endStubX: tx + (to[0] * targetStubWithOffset),
			endStubY: ty + (to[1] * targetStubWithOffset),
			isXGreaterThanStubTimes2: Math.abs(sx - tx) > (sourceStubWithOffset + targetStubWithOffset),
			isYGreaterThanStubTimes2: Math.abs(sy - ty) > (sourceStubWithOffset + targetStubWithOffset),
			opposite: oProduct === -1,
			perpendicular: oProduct === 0,
			orthogonal: oProduct === 1,
			sourceAxis: so[0] === 0 ? "y" : "x",
			points: [x, y, w, h, sx, sy, tx, ty ],
			stubs:[sourceStubWithOffset, targetStubWithOffset],
			sourceEndpoint: params.sourceEndpoint,
			targetEndpoint: targetEndpoint,
			sourcePos: params.sourcePos,
			targetPos: targetEndpoint.anchor.getCurrentLocation(),
		};
		result.anchorOrientation = result.opposite ? "opposite" : result.orthogonal ? "orthogonal" : "perpendicular";
		return result;
	};

	const _findControlPoint = function (point, sourceAnchorPosition, targetAnchorPosition, sourceEndpoint, targetEndpoint, soo, too, majorAnchor, minorAnchor) {
		// determine if the two anchors are perpendicular to each other in their orientation.  we swap the control
		// points around if so (code could be tightened up)
		var perpendicular = soo[0] !== too[0] || soo[1] === too[1],
			p = [];

		if (!perpendicular) {
			if (soo[0] === 0) {
				p.push(sourceAnchorPosition[0] < targetAnchorPosition[0] ? point[0] + minorAnchor : point[0] - minorAnchor);
			}
			else {
				p.push(point[0] - (majorAnchor * soo[0]));
			}

			if (soo[1] === 0) {
				p.push(sourceAnchorPosition[1] < targetAnchorPosition[1] ? point[1] + minorAnchor : point[1] - minorAnchor);
			}
			else {
				p.push(point[1] + (majorAnchor * too[1]));
			}
		}
		else {
			if (too[0] === 0) {
				p.push(targetAnchorPosition[0] < sourceAnchorPosition[0] ? point[0] + minorAnchor : point[0] - minorAnchor);
			}
			else {
				p.push(point[0] + (majorAnchor * too[0]));
			}

			if (too[1] === 0) {
				p.push(targetAnchorPosition[1] < sourceAnchorPosition[1] ? point[1] + minorAnchor : point[1] - minorAnchor);
			}
			else {
				p.push(point[1] + (majorAnchor * soo[1]));
			}
		}

		return p;
	};

	const N8nCustom = function (params) {
		params = params || {};
		this.type = "N8nCustom";

		var _super = _jp.Connectors.AbstractConnector.apply(this, arguments),
			majorAnchor = params.curviness || 150,
			minorAnchor = 10;

		/**
		 * Set target endpoint
		 * (to override default behavior tracking mouse when dragging mouse)
		 * @param {Endpoint} endpoint
		 */
		 this.setTargetEndpoint = function (endpoint) {
			this.overrideTargetEndpoint = endpoint;
		};

		/**
		 * reset target endpoint overriding default behavior
		 */
		this.resetTargetEndpoint = function () {
			this.overrideTargetEndpoint = null;
		};

		this._compute = function (_, params) {
			const paintInfo = _prepareCompute(params, this.overrideTargetEndpoint);
			var sp = paintInfo.sourcePos,
				tp = paintInfo.targetPos,
				_w = Math.abs(sp[0] - tp[0]),
				_h = Math.abs(sp[1] - tp[1]);

			this._computeBezier(paintInfo, sp, tp, _w, _h);
		};

		this._computeBezier = function (paintInfo, sp, tp, _w, _h) {
			var _CP, _CP2,
				_sx = sp[0] < tp[0] ? _w : 0,
				_sy = sp[1] < tp[1] ? _h : 0,
				_tx = sp[0] < tp[0] ? 0 : _w,
				_ty = sp[1] < tp[1] ? 0 : _h;

			_CP = _findControlPoint([_sx, _sy], sp, tp, paintInfo.sourceEndpoint, paintInfo.targetEndpoint, paintInfo.so, paintInfo.to, majorAnchor, minorAnchor);
			_CP2 = _findControlPoint([_tx, _ty], tp, sp, paintInfo.targetEndpoint, paintInfo.sourceEndpoint, paintInfo.to, paintInfo.so, majorAnchor, minorAnchor);

			_super.addSegment(this, "Bezier", {
				x1: _sx, y1: _sy, x2: _tx, y2: _ty,
				cp1x: _CP[0], cp1y: _CP[1], cp2x: _CP2[0], cp2y: _CP2[1],
			});
		};
	};

	_jp.Connectors.N8nCustom = N8nCustom;
	_ju.extend(_jp.Connectors.N8nCustom, _jp.Connectors.AbstractConnector);

}).call(typeof window !== 'undefined' ? window : this);

// (function () {
// 	/**
// 	 * Custom flowchart type
// 	 * Based on jsplumb Flowchart type https://github.com/jsplumb/jsplumb/blob/fb5fce52794fa52306825bdaa62bf3855cdfd7e0/src/connectors-flowchart.js
// 	 *
// 	 * @param stub {number} length of stub segments
// 	 * @param getEndpointOffset {Function} callback to offset stub length based on endpoint
// 	 * @param midpoint {number} float percent of halfway point of segments
// 	 * @param loopbackVerticalLength {number} height of vertical segment when looping
// 	 * @param cornerRadius {number} radius of flowchart connectors
// 	 * @param loopbackMinimum {number} minimum threshold before looping behavior takes effect
// 	 * @param gap {number | [number, number]} gap between connector and source/target endpoints
// 	 */

// 	var Flowchart = function (params) {
// 		this.type = "N8nFlowchart";
// 		params = params || {};
// 		params.stub = params.stub == null ? 30 : params.stub;
// 		params.getEndpointOffset = params.getEndpointOffset;
// 		var segments,
// 			_super = _jp.Connectors.N8nAbstractConnector.apply(this, arguments),
// 			midpoint = params.midpoint == null ? 0.5 : params.midpoint,
// 			alwaysRespectStubs = params.alwaysRespectStubs === true,
// 			loopbackVerticalLength = params.loopbackVerticalLength || 0,
// 			lastx = null, lasty = null, lastOrientation,
// 			cornerRadius = params.cornerRadius != null ? params.cornerRadius : 0,
// 			loopbackMinimum = params.loopbackMinimum || 100,

// 			sgn = function (n) {
// 				return n < 0 ? -1 : n === 0 ? 0 : 1;
// 			},
// 			segmentDirections = function(segment) {
// 				return [
// 					sgn( segment[2] - segment[0] ),
// 					sgn( segment[3] - segment[1] ),
// 				];
// 			},
// 			/**
// 					 * helper method to add a segment.
// 					 */
// 			addSegment = function (segments, x, y, paintInfo) {
// 				if (lastx === x && lasty === y) {
// 					return;
// 				}
// 				var lx = lastx == null ? paintInfo.sx : lastx,
// 					ly = lasty == null ? paintInfo.sy : lasty,
// 					o = lx === x ? "v" : "h";

// 				lastx = x;
// 				lasty = y;
// 				segments.push([ lx, ly, x, y, o ]);
// 			},
// 			segLength = function (s) {
// 				return Math.sqrt(Math.pow(s[0] - s[2], 2) + Math.pow(s[1] - s[3], 2));
// 			},
// 			_cloneArray = function (a) {
// 				var _a = [];
// 				_a.push.apply(_a, a);
// 				return _a;
// 			},
// 			writeSegments = function (conn, segments, paintInfo) {
// 				var current = null, next, currentDirection, nextDirection;
// 				for (var i = 0; i < segments.length - 1; i++) {

// 					current = current || _cloneArray(segments[i]);
// 					next = _cloneArray(segments[i + 1]);

// 					currentDirection = segmentDirections(current);
// 					nextDirection = segmentDirections(next);

// 					if (cornerRadius > 0 && current[4] !== next[4]) {

// 						var minSegLength = Math.min(segLength(current), segLength(next));
// 						var radiusToUse = Math.min(cornerRadius, minSegLength / 2);

// 						current[2] -= currentDirection[0] * radiusToUse;
// 						current[3] -= currentDirection[1] * radiusToUse;
// 						next[0] += nextDirection[0] * radiusToUse;
// 						next[1] += nextDirection[1] * radiusToUse;

// 						var ac = (currentDirection[1] === nextDirection[0] && nextDirection[0] === 1) ||
// 															((currentDirection[1] === nextDirection[0] && nextDirection[0] === 0) && currentDirection[0] !== nextDirection[1]) ||
// 															(currentDirection[1] === nextDirection[0] && nextDirection[0] === -1),
// 							sgny = next[1] > current[3] ? 1 : -1,
// 							sgnx = next[0] > current[2] ? 1 : -1,
// 							sgnEqual = sgny === sgnx,
// 							cx = (sgnEqual && ac || (!sgnEqual && !ac)) ? next[0] : current[2],
// 							cy = (sgnEqual && ac || (!sgnEqual && !ac)) ? current[3] : next[1];

// 						_super.addSegment(conn, STRAIGHT, {
// 							x1: current[0], y1: current[1], x2: current[2], y2: current[3],
// 						});

// 						_super.addSegment(conn, ARC, {
// 							r: radiusToUse,
// 							x1: current[2],
// 							y1: current[3],
// 							x2: next[0],
// 							y2: next[1],
// 							cx: cx,
// 							cy: cy,
// 							ac: ac,
// 						});
// 					}
// 					else {
// 						// dx + dy are used to adjust for line width.
// 						var dx = (current[2] === current[0]) ? 0 : (current[2] > current[0]) ? (paintInfo.lw / 2) : -(paintInfo.lw / 2),
// 							dy = (current[3] === current[1]) ? 0 : (current[3] > current[1]) ? (paintInfo.lw / 2) : -(paintInfo.lw / 2);

// 						_super.addSegment(conn, STRAIGHT, {
// 							x1: current[0] - dx, y1: current[1] - dy, x2: current[2] + dx, y2: current[3] + dy,
// 						});
// 					}
// 					current = next;
// 				}
// 				if (next != null) {
// 					// last segment
// 					_super.addSegment(conn, STRAIGHT, {
// 						x1: next[0], y1: next[1], x2: next[2], y2: next[3],
// 					});
// 				}
// 			};

// 		this._compute = function (paintInfo, connParams) {

// 			segments = [];
// 			lastx = null;
// 			lasty = null;
// 			lastOrientation = null;

// 			var commonStubCalculator = function () {
// 					return [paintInfo.startStubX, paintInfo.startStubY, paintInfo.endStubX, paintInfo.endStubY];
// 				},
// 				stubCalculators = {
// 					perpendicular: commonStubCalculator,
// 					orthogonal: commonStubCalculator,
// 					opposite: function (axis) {
// 						var pi = paintInfo,
// 							idx = axis === "x" ? 0 : 1,
// 							areInProximity = {
// 								"x": function () {
// 									return ( (pi.so[idx] === 1 && (
// 										( (pi.startStubX > pi.endStubX) && (pi.tx > pi.startStubX) ) ||
// 																			( (pi.sx > pi.endStubX) && (pi.tx > pi.sx))))) ||

// 																			( (pi.so[idx] === -1 && (
// 																				( (pi.startStubX < pi.endStubX) && (pi.tx < pi.startStubX) ) ||
// 																			( (pi.sx < pi.endStubX) && (pi.tx < pi.sx)))));
// 								},
// 								"y": function () {
// 									return ( (pi.so[idx] === 1 && (
// 										( (pi.startStubY > pi.endStubY) && (pi.ty > pi.startStubY) ) ||
// 																			( (pi.sy > pi.endStubY) && (pi.ty > pi.sy))))) ||

// 																			( (pi.so[idx] === -1 && (
// 																				( (pi.startStubY < pi.endStubY) && (pi.ty < pi.startStubY) ) ||
// 																			( (pi.sy < pi.endStubY) && (pi.ty < pi.sy)))));
// 								},
// 							};

// 						if (!alwaysRespectStubs && areInProximity[axis]()) {
// 							return {
// 								"x": [(paintInfo.sx + paintInfo.tx) / 2, paintInfo.startStubY, (paintInfo.sx + paintInfo.tx) / 2, paintInfo.endStubY],
// 								"y": [paintInfo.startStubX, (paintInfo.sy + paintInfo.ty) / 2, paintInfo.endStubX, (paintInfo.sy + paintInfo.ty) / 2],
// 							}[axis];
// 						}
// 						else {
// 							return [paintInfo.startStubX, paintInfo.startStubY, paintInfo.endStubX, paintInfo.endStubY];
// 						}
// 					},
// 				};

// 			// calculate Stubs.
// 			var stubs = stubCalculators[paintInfo.anchorOrientation](paintInfo.sourceAxis),
// 				idx = paintInfo.sourceAxis === "x" ? 0 : 1,
// 				oidx = paintInfo.sourceAxis === "x" ? 1 : 0,
// 				ss = stubs[idx],
// 				oss = stubs[oidx],
// 				es = stubs[idx + 2],
// 				oes = stubs[oidx + 2];

// 			// add the start stub segment. use stubs for loopback as it will look better, with the loop spaced
// 			// away from the element.
// 			addSegment(segments, stubs[0], stubs[1], paintInfo);

// 			const diffX = paintInfo.endStubX - paintInfo.startStubX;
// 			const diffY = paintInfo.endStubY - paintInfo.startStubY;
// 			const direction = diffY >= 0 ? 1 : -1; // vertical direction of loop, above or below source

// 			var midx = paintInfo.startStubX + ((paintInfo.endStubX - paintInfo.startStubX) * midpoint),
// 				midy;

// 			if (diffX < (-1 * loopbackMinimum)) {
// 				// loop backward behavior
// 				midy = paintInfo.startStubY - (diffX < 0 ? direction * loopbackVerticalLength : 0);
// 			} else {
// 				// original flowchart behavior
// 				midy = paintInfo.startStubY + ((paintInfo.endStubY - paintInfo.startStubY) * midpoint);
// 			}

// 			var orientations = {x: [0, 1], y: [1, 0]},
// 				lineCalculators = {
// 					perpendicular: function (axis) {
// 						var pi = paintInfo,
// 							sis = {
// 								x: [
// 									[[1, 2, 3, 4], null, [2, 1, 4, 3]],
// 									null,
// 									[[4, 3, 2, 1], null, [3, 4, 1, 2]],
// 								],
// 								y: [
// 									[[3, 2, 1, 4], null, [2, 3, 4, 1]],
// 									null,
// 									[[4, 1, 2, 3], null, [1, 4, 3, 2]],
// 								],
// 							},
// 							stubs = {
// 								x: [[pi.startStubX, pi.endStubX], null, [pi.endStubX, pi.startStubX]],
// 								y: [[pi.startStubY, pi.endStubY], null, [pi.endStubY, pi.startStubY]],
// 							},
// 							midLines = {
// 								x: [[midx, pi.startStubY], [midx, pi.endStubY]],
// 								y: [[pi.startStubX, midy], [pi.endStubX, midy]],
// 							},
// 							linesToEnd = {
// 								x: [[pi.endStubX, pi.startStubY]],
// 								y: [[pi.startStubX, pi.endStubY]],
// 							},
// 							startToEnd = {
// 								x: [[pi.startStubX, pi.endStubY], [pi.endStubX, pi.endStubY]],
// 								y: [[pi.endStubX, pi.startStubY], [pi.endStubX, pi.endStubY]],
// 							},
// 							startToMidToEnd = {
// 								x: [[pi.startStubX, midy], [pi.endStubX, midy], [pi.endStubX, pi.endStubY]],
// 								y: [[midx, pi.startStubY], [midx, pi.endStubY], [pi.endStubX, pi.endStubY]],
// 							},
// 							otherStubs = {
// 								x: [pi.startStubY, pi.endStubY],
// 								y: [pi.startStubX, pi.endStubX],
// 							},
// 							soIdx = orientations[axis][0], toIdx = orientations[axis][1],
// 							_so = pi.so[soIdx] + 1,
// 							_to = pi.to[toIdx] + 1,
// 							otherFlipped = (pi.to[toIdx] === -1 && (otherStubs[axis][1] < otherStubs[axis][0])) || (pi.to[toIdx] === 1 && (otherStubs[axis][1] > otherStubs[axis][0])),
// 							stub1 = stubs[axis][_so][0],
// 							stub2 = stubs[axis][_so][1],
// 							segmentIndexes = sis[axis][_so][_to];

// 						if (pi.segment === segmentIndexes[3] || (pi.segment === segmentIndexes[2] && otherFlipped)) {
// 							return midLines[axis];
// 						}
// 						else if (pi.segment === segmentIndexes[2] && stub2 < stub1) {
// 							return linesToEnd[axis];
// 						}
// 						else if ((pi.segment === segmentIndexes[2] && stub2 >= stub1) || (pi.segment === segmentIndexes[1] && !otherFlipped)) {
// 							return startToMidToEnd[axis];
// 						}
// 						else if (pi.segment === segmentIndexes[0] || (pi.segment === segmentIndexes[1] && otherFlipped)) {
// 							return startToEnd[axis];
// 						}
// 					},
// 					orthogonal: function (axis, startStub, otherStartStub, endStub, otherEndStub) {
// 						var pi = paintInfo,
// 							extent = {
// 								"x": pi.so[0] === -1 ? Math.min(startStub, endStub) : Math.max(startStub, endStub),
// 								"y": pi.so[1] === -1 ? Math.min(startStub, endStub) : Math.max(startStub, endStub),
// 							}[axis];

// 						return {
// 							"x": [
// 								[extent, otherStartStub],
// 								[extent, otherEndStub],
// 								[endStub, otherEndStub],
// 							],
// 							"y": [
// 								[otherStartStub, extent],
// 								[otherEndStub, extent],
// 								[otherEndStub, endStub],
// 							],
// 						}[axis];
// 					},
// 					opposite: function (axis, ss, oss, es) {
// 						var pi = paintInfo,
// 							otherAxis = {"x": "y", "y": "x"}[axis],
// 							dim = {"x": "height", "y": "width"}[axis],
// 							comparator = pi["is" + axis.toUpperCase() + "GreaterThanStubTimes2"];

// 						if (connParams.sourceEndpoint.elementId === connParams.targetEndpoint.elementId) {
// 							var _val = oss + ((1 - connParams.sourceEndpoint.anchor[otherAxis]) * connParams.sourceInfo[dim]) + _super.maxStub;
// 							return {
// 								"x": [
// 									[ss, _val],
// 									[es, _val],
// 								],
// 								"y": [
// 									[_val, ss],
// 									[_val, es],
// 								],
// 							}[axis];

// 						}
// 						else if (!comparator || (pi.so[idx] === 1 && ss > es) || (pi.so[idx] === -1 && ss < es)) {
// 							return {
// 								"x": [
// 									[ss, midy],
// 									[es, midy],
// 								],
// 								"y": [
// 									[midx, ss],
// 									[midx, es],
// 								],
// 							}[axis];
// 						}
// 						else if ((pi.so[idx] === 1 && ss < es) || (pi.so[idx] === -1 && ss > es)) {
// 							return {
// 								"x": [
// 									[midx, pi.sy],
// 									[midx, pi.ty],
// 								],
// 								"y": [
// 									[pi.sx, midy],
// 									[pi.tx, midy],
// 								],
// 							}[axis];
// 						}
// 					},
// 				};

// 			// compute the rest of the line
// 			var p = lineCalculators[paintInfo.anchorOrientation](paintInfo.sourceAxis, ss, oss, es, oes);
// 			if (p) {
// 				for (var i = 0; i < p.length; i++) {
// 					addSegment(segments, p[i][0], p[i][1], paintInfo);
// 				}
// 			}

// 			// line to end stub
// 			addSegment(segments, stubs[2], stubs[3], paintInfo);

// 			//}

// 			// end stub to end (common)
// 			addSegment(segments, paintInfo.tx, paintInfo.ty, paintInfo);



// 			// write out the segments.
// 			writeSegments(this, segments, paintInfo);

// 		};
// 	};

// 	_jp.Connectors.N8nFlowchart = Flowchart;
// 	_ju.extend(_jp.Connectors.N8nFlowchart, _jp.Connectors.N8nAbstractConnector);

// }).call(typeof window !== 'undefined' ? window : this);
