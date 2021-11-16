/**
 * Custom connector type
 * Based on jsplumb Flowchart and Bezier types
 *
 * https://github.com/jsplumb/jsplumb
 * https://github.com/jsplumb/jsplumb/blob/fb5fce52794fa52306825bdaa62bf3855cdfd7e0/src/connectors-flowchart.js
 * https://github.com/jsplumb/jsplumb/blob/fb5fce52794fa52306825bdaa62bf3855cdfd7e0/src/connectors-bezier.js
 *
 * Dual licensed under the MIT and GPL2 licenses.
 */
(function () {

	"use strict";
	var root = this, _jp = root.jsPlumb, _ju = root.jsPlumbUtil,  _jg = root.Biltong;
	var STRAIGHT = "Straight";
	var ARC = "Arc";

	/**
	 * Custom connector type
	 *
	 * @param stub {number} length of stub segments in flowchart
	 * @param getEndpointOffset {Function} callback to offset stub length based on endpoint in flowchart
	 * @param midpoint {number} float percent of halfway point of segments in flowchart
	 * @param loopbackVerticalLength {number} height of vertical segment when looping in flowchart
	 * @param cornerRadius {number} radius of flowchart connectors
	 * @param loopbackMinimum {number} minimum threshold before looping behavior takes effect in flowchart
	 * @param targetGap {number} gap between connector and target endpoint in both flowchart and bezier
	 */
	const N8nCustom = function (params) {
		params = params || {};
		this.type = "N8nCustom";

		params.stub = params.stub == null ? 30 : params.stub;

		// temp
		if (!window.localStorage.getItem('BEZIER_CURVINESS_COEFFICIENT')) {
			window.localStorage.setItem('BEZIER_CURVINESS_COEFFICIENT', '0.25');
		}

		if (!window.localStorage.getItem('BEZIER_Z_OFFSET')) {
			window.localStorage.setItem('BEZIER_Z_OFFSET', '75');
		}

		var _super = _jp.Connectors.AbstractConnector.apply(this, arguments),
			minorAnchor = 10,
			majorAnchor = 0,
			segments,
			midpoint = params.midpoint == null ? 0.5 : params.midpoint,
			alwaysRespectStubs = params.alwaysRespectStubs === true,
			loopbackVerticalLength = params.loopbackVerticalLength || 0,
			lastx = null, lasty = null,
			cornerRadius = params.cornerRadius != null ? params.cornerRadius : 0,
			loopbackMinimum = params.loopbackMinimum || 100,
			curvinessCoeffient = parseFloat(window.localStorage.getItem('BEZIER_CURVINESS_COEFFICIENT')),
			zBezierOffset = parseFloat(window.localStorage.getItem('BEZIER_Z_OFFSET')),
			targetGap = params.targetGap || 0,
			stub = params.stub || 0;

		const STRAIGHT_LINE_MINIMUM = 20;

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

		this._compute = function (originalPaintInfo, params) {
			const paintInfo = _getPaintInfo(params, { targetGap, stub, overrideTargetEndpoint: this.overrideTargetEndpoint });
			Object.keys(paintInfo).forEach((key) => {
				// override so that bounding box is calculated correctly wheen target override is set
				originalPaintInfo[key] = paintInfo[key];
			});

			if (paintInfo.tx < 0) {
				this._computeFlowchart(paintInfo);
			}
			else {
				this._computeBezier(paintInfo);
			}
		};

		this._computeBezier = function (paintInfo) {
			var sp = paintInfo.sourcePos,
				tp = paintInfo.targetPos,
				_w = Math.abs(sp[0] - tp[0]) - paintInfo.targetGap,
				_h = Math.abs(sp[1] - tp[1]);

			var _CP, _CP2,
				_sx = sp[0] < tp[0] ? _w : 0,
				_sy = sp[1] < tp[1] ? _h : 0,
				_tx = sp[0] < tp[0] ? 0 : _w,
				_ty = sp[1] < tp[1] ? 0 : _h;

			if (paintInfo.ySpan <= STRAIGHT_LINE_MINIMUM) {
				minorAnchor = 0.1;
				majorAnchor = 0.1;
			}
			else {
				majorAnchor = paintInfo.xSpan * curvinessCoeffient + zBezierOffset;
			}

			_CP = _findControlPoint([_sx, _sy], sp, tp, paintInfo.sourceEndpoint, paintInfo.targetEndpoint, paintInfo.so, paintInfo.to, majorAnchor, minorAnchor);
			_CP2 = _findControlPoint([_tx, _ty], tp, sp, paintInfo.targetEndpoint, paintInfo.sourceEndpoint, paintInfo.to, paintInfo.so, majorAnchor, minorAnchor);

			_super.addSegment(this, "Bezier", {
				x1: _sx, y1: _sy, x2: _tx, y2: _ty,
				cp1x: _CP[0], cp1y: _CP[1], cp2x: _CP2[0], cp2y: _CP2[1],
			});
		};

		/**
		 * helper method to add a segment.
		 */
		const addFlowchartSegment = function (segments, x, y, paintInfo) {
			if (lastx === x && lasty === y) {
				return;
			}
			var lx = lastx == null ? paintInfo.sx : lastx,
				ly = lasty == null ? paintInfo.sy : lasty,
				o = lx === x ? "v" : "h";

			lastx = x;
			lasty = y;
			segments.push([ lx, ly, x, y, o ]);
		};

		this._computeFlowchart = function (paintInfo) {

			segments = [];
			lastx = null;
			lasty = null;

			// calculate Stubs.
			var stubs = calcualteStubSegment(paintInfo, {alwaysRespectStubs});

			// add the start stub segment. use stubs for loopback as it will look better, with the loop spaced
			// away from the element.
			addFlowchartSegment(segments, stubs[0], stubs[1], paintInfo);

			// compute the rest of the line
			var p = calculateLineSegment(paintInfo, stubs, {midpoint, loopbackMinimum, loopbackVerticalLength});
			if (p) {
				for (var i = 0; i < p.length; i++) {
					addFlowchartSegment(segments, p[i][0], p[i][1], paintInfo);
				}
			}

			// line to end stub
			addFlowchartSegment(segments, stubs[2], stubs[3], paintInfo);

			// end stub to end (common)
			addFlowchartSegment(segments, paintInfo.tx, paintInfo.ty, paintInfo);

			// write out the segments.
			writeFlowchartSegments(_super, this, segments, paintInfo, cornerRadius);
		};
	};

	_jp.Connectors.N8nCustom = N8nCustom;
	_ju.extend(_jp.Connectors.N8nCustom, _jp.Connectors.AbstractConnector);


	function _findControlPoint(point, sourceAnchorPosition, targetAnchorPosition, sourceEndpoint, targetEndpoint, soo, too, majorAnchor, minorAnchor) {
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


	function sgn(n) {
		return n < 0 ? -1 : n === 0 ? 0 : 1;
	};

	function getFlowchartSegmentDirections(segment) {
		return [
			sgn( segment[2] - segment[0] ),
			sgn( segment[3] - segment[1] ),
		];
	};

	function getSegmentLength(s) {
		return Math.sqrt(Math.pow(s[0] - s[2], 2) + Math.pow(s[1] - s[3], 2));
	};

	function _cloneArray(a) {
		var _a = [];
		_a.push.apply(_a, a);
		return _a;
	};

	function writeFlowchartSegments(_super, conn, segments, paintInfo, cornerRadius) {
		var current = null, next, currentDirection, nextDirection;
		for (var i = 0; i < segments.length - 1; i++) {

			current = current || _cloneArray(segments[i]);
			next = _cloneArray(segments[i + 1]);

			currentDirection = getFlowchartSegmentDirections(current);
			nextDirection = getFlowchartSegmentDirections(next);

			if (cornerRadius > 0 && current[4] !== next[4]) {

				var minSegLength = Math.min(getSegmentLength(current), getSegmentLength(next));
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

	const lineCalculators = {
		opposite: function (paintInfo, {axis, startStub, endStub, idx, midx, midy}) {
			var pi = paintInfo,
				comparator = pi["is" + axis.toUpperCase() + "GreaterThanStubTimes2"];

			if (!comparator || (pi.so[idx] === 1 && startStub > endStub) || (pi.so[idx] === -1 && startStub < endStub)) {
				return {
					"x": [
						[startStub, midy],
						[endStub, midy],
					],
					"y": [
						[midx, startStub],
						[midx, endStub],
					],
				}[axis];
			}
			else if ((pi.so[idx] === 1 && startStub < endStub) || (pi.so[idx] === -1 && startStub > endStub)) {
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

	const stubCalculators = {
		opposite: function (paintInfo, {axis, alwaysRespectStubs}) {
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

	function calcualteStubSegment(paintInfo, {alwaysRespectStubs}) {
		return stubCalculators['opposite'](paintInfo, {axis: paintInfo.sourceAxis, alwaysRespectStubs});
	}

	function calculateLineSegment(paintInfo, stubs, { midpoint, loopbackVerticalLength, loopbackMinimum }) {
		const axis = paintInfo.sourceAxis,
			idx = paintInfo.sourceAxis === "x" ? 0 : 1,
			oidx = paintInfo.sourceAxis === "x" ? 1 : 0,
			startStub = stubs[idx],
			otherStartStub = stubs[oidx],
			endStub = stubs[idx + 2],
			otherEndStub = stubs[oidx + 2];

		const diffX = paintInfo.endStubX - paintInfo.startStubX;
		const diffY = paintInfo.endStubY - paintInfo.startStubY;
		const direction = diffY >= 0 ? 1 : -1; // vertical direction of loop, above or below source

		var midx = paintInfo.startStubX + ((paintInfo.endStubX - paintInfo.startStubX) * midpoint),
			midy;

		if (diffX < (-1 * loopbackMinimum)) {
			// loop backward behavior
			midy = paintInfo.startStubY - (diffX < 0 ? direction * loopbackVerticalLength : 0);
		} else {
			// original flowchart behavior
			midy = paintInfo.startStubY + ((paintInfo.endStubY - paintInfo.startStubY) * midpoint);
		}

		return lineCalculators['opposite'](paintInfo, {axis, startStub, otherStartStub, endStub, otherEndStub, idx, oidx, midx, midy});
	}

	function _getPaintInfo(params, { targetGap, stub, overrideTargetEndpoint }) {
		let { targetPos, targetEndpoint } = params;

		if (
			overrideTargetEndpoint
		) {
			targetPos = overrideTargetEndpoint.anchor.getCurrentLocation();
			targetEndpoint = overrideTargetEndpoint;
		}

		const sourceGap = 0;

		stub = stub || 0;
		const sourceStub = _ju.isArray(stub) ? stub[0] : stub;
		const targetStub = _ju.isArray(stub) ? stub[1] : stub;

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

		const sourceStubWithOffset = sourceStub + (params.getEndpointOffset && params.sourceEndpoint ? params.getEndpointOffset(params.sourceEndpoint) : 0);
		const targetStubWithOffset = targetStub + (params.getEndpointOffset && targetEndpoint ? params.getEndpointOffset(targetEndpoint) : 0);

		// same as paintinfo generated by jsplumb AbstractConnector type
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
			anchorOrientation: "opposite", // always opposite since our endpoints are always opposite (source orientation is left (1) and target orientaiton is right (-1))

			/** custom keys added */
			sourceEndpoint: params.sourceEndpoint,
			targetEndpoint: targetEndpoint,
			sourcePos: params.sourcePos,
			targetPos: targetEndpoint.anchor.getCurrentLocation(),
			targetGap,
		};

		return result;
	};


}).call(typeof window !== 'undefined' ? window : this);
