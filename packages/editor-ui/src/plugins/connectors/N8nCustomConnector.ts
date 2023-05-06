import type { PointXY } from '@jsplumb/util';
import { quadrant } from '@jsplumb/util';

import type {
	Connection,
	ConnectorComputeParams,
	PaintGeometry,
	Endpoint,
	Orientation,
} from '@jsplumb/core';
import { ArcSegment, AbstractConnector, StraightSegment } from '@jsplumb/core';
import type { AnchorPlacement, ConnectorOptions, Geometry, PaintAxis } from '@jsplumb/common';
import { BezierSegment } from '@jsplumb/connector-bezier';
import { isArray } from 'lodash-es';
import { deepCopy } from 'n8n-workflow';

export interface N8nConnectorOptions extends ConnectorOptions {}
interface N8nConnectorPaintGeometry extends PaintGeometry {
	sourceEndpoint: Endpoint;
	targetEndpoint: Endpoint;
	sourcePos: AnchorPlacement;
	targetPos: AnchorPlacement;
	targetGap: number;
	lw: number;
}

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
	midpoint: number;
	alwaysRespectStubs: boolean;
	loopbackVerticalLength: number;
	lastx: number | null;
	lasty: number | null;
	cornerRadius: number;
	loopbackMinimum: number;
	curvinessCoefficient: number;
	zBezierOffset: number;
	targetGap: number;
	overrideTargetEndpoint: Endpoint | null;
	getEndpointOffset: Function | null;
	private internalSegments: FlowchartSegment[] = [];

	constructor(public connection: Connection, params: N8nConnectorOptions) {
		super(connection, params);
		params = params || {};
		this.minorAnchor = 0; // seems to be angle at which connector leaves endpoint
		this.majorAnchor = 0; // translates to curviness of bezier curve
		this.stub = params.stub || 0;
		this.midpoint = 0.5;
		this.alwaysRespectStubs = params.alwaysRespectStubs === true;
		this.loopbackVerticalLength = params.loopbackVerticalLength || 0;
		this.lastx = null;
		this.lasty = null;
		this.cornerRadius = params.cornerRadius !== null ? params.cornerRadius : 0;
		this.loopbackMinimum = params.loopbackMinimum || 100;
		this.curvinessCoefficient = 0.4;
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

	writeFlowchartSegments(paintInfo: N8nConnectorPaintGeometry) {
		let current: FlowchartSegment = null;
		let next: FlowchartSegment = null;
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
							? paintInfo.lw / 2
							: -(paintInfo.lw / 2),
					dy =
						current[3] === current[1]
							? 0
							: current[3] > current[1]
							? paintInfo.lw / 2
							: -(paintInfo.lw / 2);

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

	calculateStubSegment(paintInfo: PaintGeometry): StubPositions {
		return stubCalculators['opposite'](paintInfo, {
			axis: paintInfo.sourceAxis,
			alwaysRespectStubs: this.alwaysRespectStubs,
		});
	}

	calculateLineSegment(paintInfo: PaintGeometry, stubs: StubPositions) {
		const axis = paintInfo.sourceAxis;
		const idx = paintInfo.sourceAxis === 'x' ? 0 : 1;
		const startStub = stubs[idx];
		const endStub = stubs[idx + 2];

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
		return lineCalculators['opposite'](paintInfo, { axis, startStub, endStub, idx, midx, midy });
	}

	_getPaintInfo(params: ConnectorComputeParams): N8nConnectorPaintGeometry {
		let targetPos = params.targetPos;
		let targetEndpoint: Endpoint = params.targetEndpoint;
		if (this.overrideTargetEndpoint) {
			targetPos = this.overrideTargetEndpoint._anchor.computedPosition as AnchorPlacement;
			targetEndpoint = this.overrideTargetEndpoint;
		}

		this.stub = this.stub || 0;
		const sourceGap = 0;
		const sourceStub = isArray(this.stub) ? this.stub[0] : this.stub;
		const targetStub = isArray(this.stub) ? this.stub[1] : this.stub;
		const segment = quadrant(params.sourcePos, targetPos);
		const swapX = targetPos.curX < params.sourcePos.curX;
		const swapY = targetPos.curY < params.sourcePos.curY;
		const lw = params.strokeWidth || 1;
		const x = swapX ? targetPos.curX : params.sourcePos.curX;
		const y = swapY ? targetPos.curY : params.sourcePos.curY;
		const w = Math.abs(targetPos.curX - params.sourcePos.curX);
		const h = Math.abs(targetPos.curY - params.sourcePos.curY);
		let so: Orientation = [params.sourcePos.ox, params.sourcePos.oy];
		let to: Orientation = [targetPos.ox, targetPos.oy];

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
			so[oIndex] = 0;
			to[oIndex] = 0;
		}

		const sx = swapX ? w + sourceGap * so[0] : sourceGap * so[0],
			sy = swapY ? h + sourceGap * so[1] : sourceGap * so[1],
			tx = swapX ? this.targetGap * to[0] : w + this.targetGap * to[0],
			ty = swapY ? this.targetGap * to[1] : h + this.targetGap * to[1],
			oProduct = so[0] * to[0] + so[1] * to[1];

		const sourceStubWithOffset =
			sourceStub +
			(this.getEndpointOffset && params.sourceEndpoint
				? this.getEndpointOffset(params.sourceEndpoint)
				: 0);

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
			anchorOrientation: 'opposite', // always opposite since our endpoints are always opposite (source orientation is left (1) and target orientation is right (-1))

			/** custom keys added */
			sourceEndpoint: params.sourceEndpoint,
			targetEndpoint,
			sourcePos: params.sourcePos,
			targetPos,
			targetGap: this.targetGap,
		};

		return result;
	}

	_compute(originalPaintInfo: PaintGeometry, connParams: ConnectorComputeParams) {
		const paintInfo = this._getPaintInfo(connParams);
		// Set the type of key as key of paintInfo
		// TODO: Check if this is the best way to do this
		// Object.assign(originalPaintInfo, paintInfo);
		Object.keys(paintInfo).forEach((key) => {
			if (key === undefined) return;
			// override so that bounding box is calculated correctly when target override is set
			originalPaintInfo[key as keyof PaintGeometry] = paintInfo[key as keyof PaintGeometry];
		});

		try {
			if (paintInfo.tx < 0) {
				this._computeFlowchart(paintInfo);
			} else {
				this._computeBezier(paintInfo);
			}
		} catch (error) {}
	}
	/**
	 * Set target endpoint
	 * (to override default behavior tracking mouse when dragging mouse)
	 * @param {Endpoint} endpoint
	 */
	setTargetEndpoint(endpoint: Endpoint) {
		this.overrideTargetEndpoint = endpoint;
	}
	resetTargetEndpoint() {
		this.overrideTargetEndpoint = null;
	}
	_computeBezier(paintInfo: N8nConnectorPaintGeometry) {
		const sp = paintInfo.sourcePos;
		const tp = paintInfo.targetPos;
		const _w = Math.abs(sp.curX - tp.curX) - this.targetGap;
		const _h = Math.abs(sp.curY - tp.curY);
		const _sx = sp.curX < tp.curX ? _w : 0;
		const _sy = sp.curY < tp.curY ? _h : 0;
		const _tx = sp.curX < tp.curX ? 0 : _w;
		const _ty = sp.curY < tp.curY ? 0 : _h;

		if (paintInfo.ySpan <= 20 || (paintInfo.ySpan <= 100 && paintInfo.xSpan <= 100)) {
			this.majorAnchor = 0.1;
		} else {
			this.majorAnchor = paintInfo.xSpan * this.curvinessCoefficient + this.zBezierOffset;
		}

		const _CP = this._findControlPoint({ x: _sx, y: _sy }, sp, tp, paintInfo.so, paintInfo.to);
		const _CP2 = this._findControlPoint({ x: _tx, y: _ty }, tp, sp, paintInfo.to, paintInfo.so);

		const bezRes = {
			x1: _sx,
			y1: _sy,
			x2: _tx,
			y2: _ty,
			cp1x: _CP.x,
			cp1y: _CP.y,
			cp2x: _CP2.x,
			cp2y: _CP2.y,
		};
		this._addSegment(BezierSegment, bezRes);
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

	_computeFlowchart(paintInfo: N8nConnectorPaintGeometry) {
		this.segments = [];
		this.lastx = null;
		this.lasty = null;

		this.internalSegments = [];

		// calculate Stubs.
		const stubs = this.calculateStubSegment(paintInfo);

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
		return g;
	}
}
