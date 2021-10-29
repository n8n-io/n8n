/**
 * Custom flowchart type
 * Based on jsplumb Flowchart type https://github.com/jsplumb/jsplumb/blob/fb5fce52794fa52306825bdaa62bf3855cdfd7e0/src/connectors-flowchart.js
 */

(function () {

	"use strict";
	var root = this, _jp = root.jsPlumb, _ju = root.jsPlumbUtil;
	var STRAIGHT = "Straight";
	var ARC = "Arc";

	var Flowchart = function (params) {
		this.type = "N8nFlowchart";
		params = params || {};
		params.stub = params.stub == null ? 30 : params.stub;
		var segments,
			_super = _jp.Connectors.AbstractConnector.apply(this, arguments),
			midpoint = params.midpoint == null ? 0.5 : params.midpoint,
			alwaysRespectStubs = params.alwaysRespectStubs === true,
			yOffset = params.yOffset || 0,
			lastx = null, lasty = null, lastOrientation,
			cornerRadius = params.cornerRadius != null ? params.cornerRadius : 0,
			loopbackMinimum = params.loopbackMinimum || 100,

			sgn = function (n) {
				return n < 0 ? -1 : n === 0 ? 0 : 1;
			},
			segmentDirections = function(segment) {
				return [
					sgn( segment[2] - segment[0] ),
					sgn( segment[3] - segment[1] ),
				];
			},
			/**
					 * helper method to add a segment.
					 */
			addSegment = function (segments, x, y, paintInfo) {
				if (lastx === x && lasty === y) {
					return;
				}
				var lx = lastx == null ? paintInfo.sx : lastx,
					ly = lasty == null ? paintInfo.sy : lasty,
					o = lx === x ? "v" : "h";

				lastx = x;
				lasty = y;
				segments.push([ lx, ly, x, y, o ]);
			},
			segLength = function (s) {
				return Math.sqrt(Math.pow(s[0] - s[2], 2) + Math.pow(s[1] - s[3], 2));
			},
			_cloneArray = function (a) {
				var _a = [];
				_a.push.apply(_a, a);
				return _a;
			},
			writeSegments = function (conn, segments, paintInfo) {
				var current = null, next, currentDirection, nextDirection;
				for (var i = 0; i < segments.length - 1; i++) {

					current = current || _cloneArray(segments[i]);
					next = _cloneArray(segments[i + 1]);

					currentDirection = segmentDirections(current);
					nextDirection = segmentDirections(next);

					if (cornerRadius > 0 && current[4] !== next[4]) {

						var minSegLength = Math.min(segLength(current), segLength(next));
						var radiusToUse = Math.min(cornerRadius, minSegLength / 2);

						current[2] -= currentDirection[0] * radiusToUse;
						current[3] -= currentDirection[1] * radiusToUse;
						next[0] += nextDirection[0] * radiusToUse;
						next[1] += nextDirection[1] * radiusToUse;

						var ac = (currentDirection[1] === nextDirection[0] && nextDirection[0] === 1) ||
															((currentDirection[1] === nextDirection[0] && nextDirection[0] === 0) && currentDirection[0] !== nextDirection[1]) ||
															(currentDirection[1] === nextDirection[0] && nextDirection[0] === -1),
							sgny = next[1] > current[3] ? 1 : -1,
							sgnx = next[0] > current[2] ? 1 : -1,
							sgnEqual = sgny === sgnx,
							cx = (sgnEqual && ac || (!sgnEqual && !ac)) ? next[0] : current[2],
							cy = (sgnEqual && ac || (!sgnEqual && !ac)) ? current[3] : next[1];

						_super.addSegment(conn, STRAIGHT, {
							x1: current[0], y1: current[1], x2: current[2], y2: current[3],
						});

						_super.addSegment(conn, ARC, {
							r: radiusToUse,
							x1: current[2],
							y1: current[3],
							x2: next[0],
							y2: next[1],
							cx: cx,
							cy: cy,
							ac: ac,
						});
					}
					else {
						// dx + dy are used to adjust for line width.
						var dx = (current[2] === current[0]) ? 0 : (current[2] > current[0]) ? (paintInfo.lw / 2) : -(paintInfo.lw / 2),
							dy = (current[3] === current[1]) ? 0 : (current[3] > current[1]) ? (paintInfo.lw / 2) : -(paintInfo.lw / 2);

						_super.addSegment(conn, STRAIGHT, {
							x1: current[0] - dx, y1: current[1] - dy, x2: current[2] + dx, y2: current[3] + dy,
						});
					}
					current = next;
				}
				if (next != null) {
					// last segment
					_super.addSegment(conn, STRAIGHT, {
						x1: next[0], y1: next[1], x2: next[2], y2: next[3],
					});
				}
			};

		this._compute = function (paintInfo, params) {

			segments = [];
			lastx = null;
			lasty = null;
			lastOrientation = null;

			var commonStubCalculator = function () {
					return [paintInfo.startStubX, paintInfo.startStubY, paintInfo.endStubX, paintInfo.endStubY];
				},
				stubCalculators = {
					perpendicular: commonStubCalculator,
					orthogonal: commonStubCalculator,
					opposite: function (axis) {
						var pi = paintInfo,
							idx = axis === "x" ? 0 : 1,
							areInProximity = {
								"x": function () {
									return ( (pi.so[idx] === 1 && (
										( (pi.startStubX > pi.endStubX) && (pi.tx > pi.startStubX) ) ||
																			( (pi.sx > pi.endStubX) && (pi.tx > pi.sx))))) ||

																			( (pi.so[idx] === -1 && (
																				( (pi.startStubX < pi.endStubX) && (pi.tx < pi.startStubX) ) ||
																			( (pi.sx < pi.endStubX) && (pi.tx < pi.sx)))));
								},
								"y": function () {
									return ( (pi.so[idx] === 1 && (
										( (pi.startStubY > pi.endStubY) && (pi.ty > pi.startStubY) ) ||
																			( (pi.sy > pi.endStubY) && (pi.ty > pi.sy))))) ||

																			( (pi.so[idx] === -1 && (
																				( (pi.startStubY < pi.endStubY) && (pi.ty < pi.startStubY) ) ||
																			( (pi.sy < pi.endStubY) && (pi.ty < pi.sy)))));
								},
							};

						if (!alwaysRespectStubs && areInProximity[axis]()) {
							return {
								"x": [(paintInfo.sx + paintInfo.tx) / 2, paintInfo.startStubY, (paintInfo.sx + paintInfo.tx) / 2, paintInfo.endStubY],
								"y": [paintInfo.startStubX, (paintInfo.sy + paintInfo.ty) / 2, paintInfo.endStubX, (paintInfo.sy + paintInfo.ty) / 2],
							}[axis];
						}
						else {
							return [paintInfo.startStubX, paintInfo.startStubY, paintInfo.endStubX, paintInfo.endStubY];
						}
					},
				};

			// calculate Stubs.
			var stubs = stubCalculators[paintInfo.anchorOrientation](paintInfo.sourceAxis),
				idx = paintInfo.sourceAxis === "x" ? 0 : 1,
				oidx = paintInfo.sourceAxis === "x" ? 1 : 0,
				ss = stubs[idx],
				oss = stubs[oidx],
				es = stubs[idx + 2],
				oes = stubs[oidx + 2];

			// add the start stub segment. use stubs for loopback as it will look better, with the loop spaced
			// away from the element.
			addSegment(segments, stubs[0], stubs[1], paintInfo);

			const diffX = paintInfo.endStubX - paintInfo.startStubX;
			const diffY = paintInfo.endStubY - paintInfo.startStubY;
			const direction = diffY > 0 ? 1 : -1;

			var midx = paintInfo.startStubX + ((paintInfo.endStubX - paintInfo.startStubX) * midpoint),
				midy;

			if (diffX < (-1 * loopbackMinimum)) {
				midy = paintInfo.startStubY - (diffX < 0 ? direction * yOffset : 0);
			} else {
				midy = paintInfo.startStubY + ((paintInfo.endStubY - paintInfo.startStubY) * midpoint);
			}

			if (diffX < 0 && diffX > (-1 * yOffset) && Math.abs(diffY) < yOffset) {
				midy = 0;
			}

			var orientations = {x: [0, 1], y: [1, 0]},
				lineCalculators = {
					perpendicular: function (axis) {
						var pi = paintInfo,
							sis = {
								x: [
									[[1, 2, 3, 4], null, [2, 1, 4, 3]],
									null,
									[[4, 3, 2, 1], null, [3, 4, 1, 2]],
								],
								y: [
									[[3, 2, 1, 4], null, [2, 3, 4, 1]],
									null,
									[[4, 1, 2, 3], null, [1, 4, 3, 2]],
								],
							},
							stubs = {
								x: [[pi.startStubX, pi.endStubX], null, [pi.endStubX, pi.startStubX]],
								y: [[pi.startStubY, pi.endStubY], null, [pi.endStubY, pi.startStubY]],
							},
							midLines = {
								x: [[midx, pi.startStubY], [midx, pi.endStubY]],
								y: [[pi.startStubX, midy], [pi.endStubX, midy]],
							},
							linesToEnd = {
								x: [[pi.endStubX, pi.startStubY]],
								y: [[pi.startStubX, pi.endStubY]],
							},
							startToEnd = {
								x: [[pi.startStubX, pi.endStubY], [pi.endStubX, pi.endStubY]],
								y: [[pi.endStubX, pi.startStubY], [pi.endStubX, pi.endStubY]],
							},
							startToMidToEnd = {
								x: [[pi.startStubX, midy], [pi.endStubX, midy], [pi.endStubX, pi.endStubY]],
								y: [[midx, pi.startStubY], [midx, pi.endStubY], [pi.endStubX, pi.endStubY]],
							},
							otherStubs = {
								x: [pi.startStubY, pi.endStubY],
								y: [pi.startStubX, pi.endStubX],
							},
							soIdx = orientations[axis][0], toIdx = orientations[axis][1],
							_so = pi.so[soIdx] + 1,
							_to = pi.to[toIdx] + 1,
							otherFlipped = (pi.to[toIdx] === -1 && (otherStubs[axis][1] < otherStubs[axis][0])) || (pi.to[toIdx] === 1 && (otherStubs[axis][1] > otherStubs[axis][0])),
							stub1 = stubs[axis][_so][0],
							stub2 = stubs[axis][_so][1],
							segmentIndexes = sis[axis][_so][_to];

						if (pi.segment === segmentIndexes[3] || (pi.segment === segmentIndexes[2] && otherFlipped)) {
							return midLines[axis];
						}
						else if (pi.segment === segmentIndexes[2] && stub2 < stub1) {
							return linesToEnd[axis];
						}
						else if ((pi.segment === segmentIndexes[2] && stub2 >= stub1) || (pi.segment === segmentIndexes[1] && !otherFlipped)) {
							return startToMidToEnd[axis];
						}
						else if (pi.segment === segmentIndexes[0] || (pi.segment === segmentIndexes[1] && otherFlipped)) {
							return startToEnd[axis];
						}
					},
					orthogonal: function (axis, startStub, otherStartStub, endStub, otherEndStub) {
						var pi = paintInfo,
							extent = {
								"x": pi.so[0] === -1 ? Math.min(startStub, endStub) : Math.max(startStub, endStub),
								"y": pi.so[1] === -1 ? Math.min(startStub, endStub) : Math.max(startStub, endStub),
							}[axis];

						return {
							"x": [
								[extent, otherStartStub],
								[extent, otherEndStub],
								[endStub, otherEndStub],
							],
							"y": [
								[otherStartStub, extent],
								[otherEndStub, extent],
								[otherEndStub, endStub],
							],
						}[axis];
					},
					opposite: function (axis, ss, oss, es) {
						var pi = paintInfo,
							otherAxis = {"x": "y", "y": "x"}[axis],
							dim = {"x": "height", "y": "width"}[axis],
							comparator = pi["is" + axis.toUpperCase() + "GreaterThanStubTimes2"];

						if (params.sourceEndpoint.elementId === params.targetEndpoint.elementId) {
							var _val = oss + ((1 - params.sourceEndpoint.anchor[otherAxis]) * params.sourceInfo[dim]) + _super.maxStub;
							return {
								"x": [
									[ss, _val],
									[es, _val],
								],
								"y": [
									[_val, ss],
									[_val, es],
								],
							}[axis];

						}
						else if (!comparator || (pi.so[idx] === 1 && ss > es) || (pi.so[idx] === -1 && ss < es)) {
							return {
								"x": [
									[ss, midy],
									[es, midy],
								],
								"y": [
									[midx, ss],
									[midx, es],
								],
							}[axis];
						}
						else if ((pi.so[idx] === 1 && ss < es) || (pi.so[idx] === -1 && ss > es)) {
							return {
								"x": [
									[midx, pi.sy],
									[midx, pi.ty],
								],
								"y": [
									[pi.sx, midy],
									[pi.tx, midy],
								],
							}[axis];
						}
					},
				};

			// compute the rest of the line
			var p = lineCalculators[paintInfo.anchorOrientation](paintInfo.sourceAxis, ss, oss, es, oes);
			if (p) {
				for (var i = 0; i < p.length; i++) {
					addSegment(segments, p[i][0], p[i][1], paintInfo);
				}
			}

			// line to end stub
			addSegment(segments, stubs[2], stubs[3], paintInfo);

			//}

			// end stub to end (common)
			addSegment(segments, paintInfo.tx, paintInfo.ty, paintInfo);



			// write out the segments.
			writeSegments(this, segments, paintInfo);

		};
	};

	_jp.Connectors.N8nFlowchart = Flowchart;
	_ju.extend(_jp.Connectors.Flowchart, _jp.Connectors.AbstractConnector);

}).call(typeof window !== 'undefined' ? window : this);
