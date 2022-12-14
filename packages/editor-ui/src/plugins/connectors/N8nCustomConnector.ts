import { PointXY, log, extend, quadrant } from '@jsplumb/util';

import {
	Connection,
	ArcSegment,
	AbstractConnector,
	ConnectorComputeParams,
	PaintGeometry,
	Endpoint,
	StraightSegment,
	Orientation,
} from '@jsplumb/core';
import { AnchorPlacement, ConnectorOptions, Geometry, PaintAxis, Segment } from '@jsplumb/common';
import { BezierSegment } from '@jsplumb/connector-bezier';
import { isArray } from 'lodash';
import { deepCopy } from 'n8n-workflow';

const STRAIGHT = 'Straight';
const ARC = 'Arc';

export interface N8nConnectorOptions extends ConnectorOptions {}
type SegmentDirection = -1 | 0 | 1;
type FlowchartSegment = [number, number, number, number, string];
type StubPositions = [number, number, number, number];

const lineCalculators = {
	opposite(
		paintInfo: PaintGeometry,
		{
			axis,
			startStub,
			endStub,
			idx,
			midx,
			midy,
		}: {
			axis: 'x' | 'y';
			startStub: number;
			endStub: number;
			idx: number;
			midx: number;
			midy: number;
		},
	) {
		const pi = paintInfo,
			comparator = pi[('is' + axis.toUpperCase() + 'GreaterThanStubTimes2') as keyof PaintGeometry];

		if (
			!comparator ||
			(pi.so[idx] === 1 && startStub > endStub) ||
			(pi.so[idx] === -1 && startStub < endStub)
		) {
			return {
				x: [
					[startStub, midy],
					[endStub, midy],
				],
				y: [
					[midx, startStub],
					[midx, endStub],
				],
			}[axis];
		} else if (
			(pi.so[idx] === 1 && startStub < endStub) ||
			(pi.so[idx] === -1 && startStub > endStub)
		) {
			return {
				x: [
					[midx, pi.sy],
					[midx, pi.ty],
				],
				y: [
					[pi.sx, midy],
					[pi.tx, midy],
				],
			}[axis];
		}
	},
};

const stubCalculators = {
	opposite(
		paintInfo: PaintGeometry,
		{ axis, alwaysRespectStubs }: { axis: 'x' | 'y'; alwaysRespectStubs: boolean },
	): StubPositions {
		const pi = paintInfo,
			idx = axis === 'x' ? 0 : 1,
			areInProximity = {
				x() {
					return (
						(pi.so[idx] === 1 &&
							((pi.startStubX > pi.endStubX && pi.tx > pi.startStubX) ||
								(pi.sx > pi.endStubX && pi.tx > pi.sx))) ||
						(pi.so[idx] === -1 &&
							((pi.startStubX < pi.endStubX && pi.tx < pi.startStubX) ||
								(pi.sx < pi.endStubX && pi.tx < pi.sx)))
					);
				},
				y() {
					return (
						(pi.so[idx] === 1 &&
							((pi.startStubY > pi.endStubY && pi.ty > pi.startStubY) ||
								(pi.sy > pi.endStubY && pi.ty > pi.sy))) ||
						(pi.so[idx] === -1 &&
							((pi.startStubY < pi.endStubY && pi.ty < pi.startStubY) ||
								(pi.sy < pi.endStubY && pi.ty < pi.sy)))
					);
				},
			};

		if (!alwaysRespectStubs && areInProximity[axis]()) {
			return {
				x: [
					(paintInfo.sx + paintInfo.tx) / 2,
					paintInfo.startStubY,
					(paintInfo.sx + paintInfo.tx) / 2,
					paintInfo.endStubY,
				] as StubPositions,
				y: [
					paintInfo.startStubX,
					(paintInfo.sy + paintInfo.ty) / 2,
					paintInfo.endStubX,
					(paintInfo.sy + paintInfo.ty) / 2,
				] as StubPositions,
			}[axis];
		} else {
			return [
				paintInfo.startStubX,
				paintInfo.startStubY,
				paintInfo.endStubX,
				paintInfo.endStubY,
			] as StubPositions;
		}
	},
};

export class N8nConnector extends AbstractConnector {
	static type = 'N8nConnector';
	type = N8nConnector.type;

	majorAnchor: number;
	minorAnchor: number;
	// segments: Segment[];
	midpoint: number;
	alwaysRespectStubs: boolean;
	loopbackVerticalLength: number;
	lastx: number | null;
	lasty: number | null;
	cornerRadius: number;
	loopbackMinimum: number;
	curvinessCoeffient: number;
	zBezierOffset: number;
	targetGap: number;
	overrideTargetEndpoint: Endpoint | null;
	getEndpointOffset: Function | null;
	private internalSegments: FlowchartSegment[] = [];
	// stub: number;

	constructor(public connection: Connection, params: N8nConnectorOptions) {
		console.log('Hello from');

		super(connection, params);
		params = params || {};
		this.majorAnchor = params.curviness || 150;
		this.minorAnchor = 10;
		// this.minorAnchor = 0; // seems to be angle at which connector leaves endpoint
		// this.majorAnchor = 0; // translates to curviness of bezier curve
		// this.segments;
		this.stub = params.stub || 0;
		this.midpoint = params.midpoint === null ? 0.5 : params.midpoint;
		this.alwaysRespectStubs = params.alwaysRespectStubs === true;
		this.loopbackVerticalLength = params.loopbackVerticalLength || 0;
		this.lastx = null;
		this.lasty = null;
		this.cornerRadius = params.cornerRadius !== null ? params.cornerRadius : 0;
		this.loopbackMinimum = params.loopbackMinimum || 100;
		this.curvinessCoeffient = 0.4;
		this.zBezierOffset = 40;
		this.targetGap = params.targetGap || 0;
		this.stub = params.stub || 0;
		this.overrideTargetEndpoint = params.overrideTargetEndpoint || null;
		this.getEndpointOffset = params.getEndpointOffset || null;
	}

	getDefaultStubs(): [number, number] {
		return [30, 30];
	}

	sgn(n: number) {
		return n < 0 ? -1 : n === 0 ? 0 : 1;
	}

	getFlowchartSegmentDirections(segment: FlowchartSegment): [number, number] {
		return [this.sgn(segment[2] - segment[0]), this.sgn(segment[3] - segment[1])];
	}

	getSegmentLength(s: FlowchartSegment) {
		return Math.sqrt(Math.pow(s[0] - s[2], 2) + Math.pow(s[1] - s[3], 2));
	}

	protected _findControlPoint(
		point: PointXY,
		sourceAnchorPosition: AnchorPlacement,
		targetAnchorPosition: AnchorPlacement,
		soo: [number, number],
		too: [number, number],
	): PointXY {
		// determine if the two anchors are perpendicular to each other in their orientation.  we swap the control
		// points around if so (code could be tightened up)
		const perpendicular = soo[0] !== too[0] || soo[1] === too[1],
			p: PointXY = {
				x: 0,
				y: 0,
			};

		if (!perpendicular) {
			if (soo[0] === 0) {
				p.x =
					sourceAnchorPosition.curX < targetAnchorPosition.curX
						? point.x + this.minorAnchor
						: point.x - this.minorAnchor;
			} else {
				p.x = point.x - this.majorAnchor * soo[0];
			}

			if (soo[1] === 0) {
				p.y =
					sourceAnchorPosition.curY < targetAnchorPosition.curY
						? point.y + this.minorAnchor
						: point.y - this.minorAnchor;
			} else {
				p.y = point.y + this.majorAnchor * too[1];
			}
		} else {
			if (too[0] === 0) {
				p.x =
					targetAnchorPosition.curX < sourceAnchorPosition.curX
						? point.x + this.minorAnchor
						: point.x - this.minorAnchor;
			} else {
				p.x = point.x + this.majorAnchor * too[0];
			}

			if (too[1] === 0) {
				p.y =
					targetAnchorPosition.curY < sourceAnchorPosition.curY
						? point.y + this.minorAnchor
						: point.y - this.minorAnchor;
			} else {
				p.y = point.y + this.majorAnchor * soo[1];
			}
		}

		return p;
	}

	writeFlowchartSegments(paintInfo: PaintGeometry) {
		let current: FlowchartSegment = [];
		let next: FlowchartSegment = [];
		let currentDirection: [number, number];
		let nextDirection: [number, number];

		for (let i = 0; i < this.internalSegments.length - 1; i++) {
			current = current || (deepCopy(this.internalSegments[i]) as FlowchartSegment);
			next = deepCopy(this.internalSegments[i + 1]) as FlowchartSegment;

			currentDirection = this.getFlowchartSegmentDirections(current);
			nextDirection = this.getFlowchartSegmentDirections(next);

			if (this.cornerRadius > 0 && current[4] !== next[4]) {
				const minSegLength = Math.min(this.getSegmentLength(current), this.getSegmentLength(next));
				const radiusToUse = Math.min(this.cornerRadius, minSegLength / 2);

				current[2] -= currentDirection[0] * radiusToUse;
				current[3] -= currentDirection[1] * radiusToUse;
				next[0] += nextDirection[0] * radiusToUse;
				next[1] += nextDirection[1] * radiusToUse;

				const ac =
						(currentDirection[1] === nextDirection[0] && nextDirection[0] === 1) ||
						(currentDirection[1] === nextDirection[0] &&
							nextDirection[0] === 0 &&
							currentDirection[0] !== nextDirection[1]) ||
						(currentDirection[1] === nextDirection[0] && nextDirection[0] === -1),
					sgny = next[1] > current[3] ? 1 : -1,
					sgnx = next[0] > current[2] ? 1 : -1,
					sgnEqual = sgny === sgnx,
					cx = (sgnEqual && ac) || (!sgnEqual && !ac) ? next[0] : current[2],
					cy = (sgnEqual && ac) || (!sgnEqual && !ac) ? current[3] : next[1];

				this._addSegment(StraightSegment, {
					x1: current[0],
					y1: current[1],
					x2: current[2],
					y2: current[3],
				});

				this._addSegment(ArcSegment, {
					r: radiusToUse,
					x1: current[2],
					y1: current[3],
					x2: next[0],
					y2: next[1],
					cx,
					cy,
					ac,
				});
			} else {
				// dx + dy are used to adjust for line width.
				const dx =
						current[2] === current[0]
							? 0
							: current[2] > current[0]
							? paintInfo.w / 2
							: -(paintInfo.w / 2),
					dy =
						current[3] === current[1]
							? 0
							: current[3] > current[1]
							? paintInfo.w / 2
							: -(paintInfo.w / 2);

				this._addSegment(StraightSegment, {
					x1: current[0] - dx,
					y1: current[1] - dy,
					x2: current[2] + dx,
					y2: current[3] + dy,
				});
			}
			current = next;
		}
		if (next !== null) {
			// last segment
			this._addSegment(StraightSegment, {
				x1: next[0],
				y1: next[1],
				x2: next[2],
				y2: next[3],
			});
		}
	}

	calcualteStubSegment(paintInfo: PaintGeometry): StubPositions {
		return stubCalculators['opposite'](paintInfo, {
			axis: paintInfo.sourceAxis,
			alwaysRespectStubs: this.alwaysRespectStubs,
		});
	}

	calculateLineSegment(paintInfo: PaintGeometry, stubs: StubPositions) {
		const axis = paintInfo.sourceAxis;
		const idx = paintInfo.sourceAxis === 'x' ? 0 : 1;
		// oidx = paintInfo.sourceAxis === "x" ? 1 : 0,
		const startStub = stubs[idx];
		// otherStartStub: number = stubs[oidx],
		const endStub = stubs[idx + 2];
		// otherEndStub = stubs[oidx + 2];

		const diffX = paintInfo.endStubX - paintInfo.startStubX;
		const diffY = paintInfo.endStubY - paintInfo.startStubY;
		const direction = -1; // vertical direction of loop, always below source

		const midx = paintInfo.startStubX + (paintInfo.endStubX - paintInfo.startStubX) * this.midpoint;
		let midy: number;

		if (diffY >= 0 || diffX < -1 * this.loopbackMinimum) {
			// loop backward behavior
			midy = paintInfo.startStubY - (diffX < 0 ? direction * this.loopbackVerticalLength : 0);
		} else {
			// original flowchart behavior
			midy = paintInfo.startStubY + (paintInfo.endStubY - paintInfo.startStubY) * this.midpoint;
		}
		// axis, startStub, endStub, idx, midx, midy
		return lineCalculators['opposite'](paintInfo, { axis, startStub, endStub, idx, midx, midy });
	}

	_getPaintInfo(params: ConnectorComputeParams): PaintGeometry {
		// console.log("🚀 ~ file: N8nCustomConnector.ts:315 ~ N8nConnector ~ _getPaintInfo ~ originalPaintInfo", originalPaintInfo);
		let targetPos: AnchorPlacement = params.targetPos;
		let targetEndpoint: Endpoint = params.targetEndpoint;
		if (this.overrideTargetEndpoint) {
			console.log(
				'🚀 ~ file: N8nCustomConnector.ts:320 ~ N8nConnector ~ _getPaintInfo ~ overrideTargetEndpoint',
				this.overrideTargetEndpoint,
			);
			targetPos = this.overrideTargetEndpoint._anchor.currentLocation;
			targetEndpoint = this.overrideTargetEndpoint;
		}

		const sourceGap = 0;

		this.stub = this.stub || 0;
		const sourceStub = isArray(this.stub) ? this.stub[0] : this.stub;
		const targetStub = isArray(this.stub) ? this.stub[1] : this.stub;

		const segment = quadrant(params.sourcePos, targetPos);
		const swapX = targetPos.curX < params.sourcePos.curX;
		const swapY = targetPos.curY < params.sourcePos.curY;
		const lw = params.strokeWidth || 1;
		let so: Orientation = [params.sourcePos.ox, params.sourcePos.oy];
		let to: Orientation = [params.targetPos.ox, params.targetPos.oy];
		const x = swapX ? targetPos.curX : params.sourcePos.curX;
		const y = swapY ? targetPos.curY : params.sourcePos.curY;
		const w = Math.abs(targetPos.curX - params.sourcePos.curX);
		const h = Math.abs(targetPos.curY - params.sourcePos.curY);

		// if either anchor does not have an orientation set, we derive one from their relative
		// positions.  we fix the axis to be the one in which the two elements are further apart, and
		// point each anchor at the other element.  this is also used when dragging a new connection.
		if ((so[0] === 0 && so[1] === 0) || (to[0] === 0 && to[1] === 0)) {
			const index = w > h ? 'curX' : 'curY';
			const indexNum = w > h ? 0 : 1;
			const oIndex = [1, 0][indexNum];
			so = [];
			to = [];
			so[indexNum] = params.sourcePos[index] > targetPos[index] ? -1 : 1;
			to[indexNum] = params.sourcePos[index] > targetPos[index] ? 1 : -1;
			console.log(
				'🚀 ~ file: N8nCustomConnector.ts:350 ~ N8nConnector ~ _getPaintInfo ~ so',
				so,
				to,
			);
			so[oIndex] = 0;
			to[oIndex] = 0;
			console.log(
				'🚀 ~ file: N8nCustomConnector.ts:352 ~ N8nConnector ~ _getPaintInfo ~ params.sourcePos[index] > targetPos[index]',
				params.sourcePos[index],
				targetPos[index],
			);
		}

		const sx = swapX ? w + sourceGap * so[0] : sourceGap * so[0],
			sy = swapY ? h + sourceGap * so[1] : sourceGap * so[1],
			tx = swapX ? this.targetGap * to[0] : w + this.targetGap * to[0],
			ty = swapY ? this.targetGap * to[1] : h + this.targetGap * to[1],
			oProduct = so[0] * to[0] + so[1] * to[1];

		console.log(
			'🚀 ~ file: N8nCustomConnector.ts:367 ~ N8nConnector ~ _getPaintInfo ~ this.getEndpointOffset',
			this.getEndpointOffset,
		);
		// console.log("🚀 ~ file: N8nCustomConnector.ts:358 ~ N8nConnector ~ _getPaintInfo ~ sx", sx);
		const sourceStubWithOffset =
			sourceStub +
			(this.getEndpointOffset && params.sourceEndpoint
				? this.getEndpointOffset(params.sourceEndpoint)
				: 0);
		// console.log("🚀 ~ file: N8nCustomConnector.ts:364 ~ N8nConnector ~ _getPaintInfo ~ sourceStubWithOffset", sourceStubWithOffset);
		const targetStubWithOffset =
			targetStub +
			(this.getEndpointOffset && targetEndpoint ? this.getEndpointOffset(targetEndpoint) : 0);

		// same as paintinfo generated by jsplumb AbstractConnector type
		const result = {
			sx,
			sy,
			tx,
			ty,
			lw,
			xSpan: Math.abs(tx - sx),
			ySpan: Math.abs(ty - sy),
			mx: (sx + tx) / 2,
			my: (sy + ty) / 2,
			so,
			to,
			x,
			y,
			w,
			h,
			segment,
			startStubX: sx + so[0] * sourceStubWithOffset,
			startStubY: sy + so[1] * sourceStubWithOffset,
			endStubX: tx + to[0] * targetStubWithOffset,
			endStubY: ty + to[1] * targetStubWithOffset,
			isXGreaterThanStubTimes2: Math.abs(sx - tx) > sourceStubWithOffset + targetStubWithOffset,
			isYGreaterThanStubTimes2: Math.abs(sy - ty) > sourceStubWithOffset + targetStubWithOffset,
			opposite: oProduct === -1,
			perpendicular: oProduct === 0,
			orthogonal: oProduct === 1,
			sourceAxis: so[0] === 0 ? 'y' : ('x' as PaintAxis),
			points: [x, y, w, h, sx, sy, tx, ty] as [
				number,
				number,
				number,
				number,
				number,
				number,
				number,
				number,
			],
			stubs: [sourceStubWithOffset, targetStubWithOffset] as [number, number],
			anchorOrientation: 'opposite', // always opposite since our endpoints are always opposite (source orientation is left (1) and target orientaiton is right (-1))

			/** custom keys added */
			sourceEndpoint: params.sourceEndpoint,
			targetEndpoint,
			sourcePos: params.sourcePos,
			targetPos: targetEndpoint._anchor.currentLocation,
			targetGap: this.targetGap,
		};
		// console.log("🚀 ~ file: N8nCustomConnector.ts:397 ~ N8nConnector ~ _getPaintInfo ~ so", so);

		console.log(
			'🚀 ~ file: N8nCustomConnector.ts:399 ~ N8nConnector ~ _getPaintInfo ~ result',
			result,
		);
		return result;
	}

	_compute(originalPaintInfo: PaintGeometry, connParams: ConnectorComputeParams) {
		console.log(
			'🚀 ~ file: N8nCustomConnector.ts:406 ~ N8nConnector ~ _compute ~ connParams',
			connParams,
		);
		console.log(
			'🚀 ~ file: N8nCustomConnector.ts:406 ~ N8nConnector ~ _compute ~ originalPaintInfo',
			originalPaintInfo,
		);
		const paintInfo = this._getPaintInfo(connParams);
		// Set the type of key as key of paintInfo
		// TODO: Check if this is the best way to do this
		Object.assign(originalPaintInfo, paintInfo);
		// Object.keys(paintInfo).forEach((key) => {
		// 	if(key === undefined) return;
		// 	// override so that bounding box is calculated correctly when target override is set
		// 	originalPaintInfo[key as keyof PaintGeometry] = paintInfo[key as keyof PaintGeometry];
		// });

		if (paintInfo.tx < 0) {
			this._computeFlowchart(paintInfo);
		} else {
			this._computeBezier(paintInfo, connParams);
		}
	}

	_computeBezier(paintInfo: PaintGeometry, p: N8nConnectorOptions) {
		const sp = p.sourcePos;
		const tp = p.targetPos;
		const _w = Math.abs(sp.curX - tp.curX) - this.targetGap;
		const _h = Math.abs(sp.curY - tp.curY);
		const _sx = sp.curX < tp.curX ? _w : 0;
		const _sy = sp.curY < tp.curY ? _h : 0;
		const _tx = sp.curX < tp.curX ? 0 : _w;
		const _ty = sp.curY < tp.curY ? 0 : _h;

		if (paintInfo.ySpan <= 20 || (paintInfo.ySpan <= 100 && paintInfo.xSpan <= 100)) {
			this.majorAnchor = 0.1;
		} else {
			this.majorAnchor = paintInfo.xSpan * this.curvinessCoeffient + this.zBezierOffset;
		}
		console.log(
			'🚀 ~ file: N8nCustomConnector.ts:447 ~ N8nConnector ~ _computeBezier ~ this.majorAnchor ',
			this.majorAnchor,
			this.minorAnchor,
		);

		const _CP = this._findControlPoint({ x: _sx, y: _sy }, sp, tp, paintInfo.so, paintInfo.to);
		console.log('🚀 ~ file: N8nCustomConnector.ts:456 ~ N8nConnector ~ _computeBezier ~ _CP', _CP, {
			_sx,
			_sy,
		});
		const _CP2 = this._findControlPoint({ x: _tx, y: _ty }, tp, sp, paintInfo.to, paintInfo.so);
		console.log(
			'🚀 ~ file: N8nCustomConnector.ts:464 ~ N8nConnector ~ _computeBezier ~ _CP2',
			_CP2,
		);

		this._addSegment(BezierSegment, {
			x1: _sx,
			y1: _sy,
			x2: _tx,
			y2: _ty,
			cp1x: _CP.x,
			cp1y: _CP.y,
			cp2x: _CP2.x,
			cp2y: _CP2.y,
		});
	}

	addFlowchartSegment(x: number, y: number, paintInfo: PaintGeometry) {
		if (this.lastx === x && this.lasty === y) {
			return;
		}
		const lx = this.lastx === null ? paintInfo.sx : this.lastx;
		const ly = this.lasty === null ? paintInfo.sy : this.lasty;
		const o = lx === x ? 'v' : 'h';

		this.lastx = x;
		this.lasty = y;
		this.internalSegments.push([lx, ly, x, y, o]);
	}

	_computeFlowchart(paintInfo: PaintGeometry) {
		this.segments = [];
		this.lastx = null;
		this.lasty = null;

		// calculate Stubs.
		const stubs = this.calcualteStubSegment(paintInfo);

		// add the start stub segment. use stubs for loopback as it will look better, with the loop spaced
		// away from the element.
		this.addFlowchartSegment(stubs[0], stubs[1], paintInfo);

		// compute the rest of the line
		const p = this.calculateLineSegment(paintInfo, stubs);
		if (p) {
			for (let i = 0; i < p.length; i++) {
				this.addFlowchartSegment(p[i][0], p[i][1], paintInfo);
			}
		}

		// line to end stub
		this.addFlowchartSegment(stubs[2], stubs[3], paintInfo);

		// end stub to end (common)
		this.addFlowchartSegment(paintInfo.tx, paintInfo.ty, paintInfo);

		// write out the segments.
		this.writeFlowchartSegments(paintInfo);
	}

	transformGeometry(g: Geometry, dx: number, dy: number): Geometry {
		console.log('🚀 ~ file: N8nCustomConnector.ts:512 ~ N8nConnector ~ transformGeometry ~ g', g);
		return g;
	}
}
