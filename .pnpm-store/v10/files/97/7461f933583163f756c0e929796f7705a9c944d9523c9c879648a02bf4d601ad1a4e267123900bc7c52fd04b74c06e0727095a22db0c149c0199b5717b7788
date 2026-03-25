export default class LineElement extends Element<import("../types/basic.js").AnyObject, import("../types/basic.js").AnyObject> {
    static id: string;
    /**
     * @type {any}
     */
    static defaults: any;
    static descriptors: {
        _scriptable: boolean;
        _indexable: (name: any) => boolean;
    };
    constructor(cfg: any);
    animated: boolean;
    options: any;
    _chart: any;
    _loop: any;
    _fullLoop: any;
    _path: any;
    _points: any;
    _segments: import("../helpers/helpers.segment.js").Segment[];
    _decimated: boolean;
    _pointsUpdated: boolean;
    _datasetIndex: any;
    updateControlPoints(chartArea: any, indexAxis: any): void;
    set points(arg: any);
    get points(): any;
    get segments(): import("../helpers/helpers.segment.js").Segment[];
    /**
       * First non-skipped point on this line
       * @returns {PointElement|undefined}
       */
    first(): PointElement | undefined;
    /**
       * Last non-skipped point on this line
       * @returns {PointElement|undefined}
       */
    last(): PointElement | undefined;
    /**
       * Interpolate a point in this line at the same value on `property` as
       * the reference `point` provided
       * @param {PointElement} point - the reference point
       * @param {string} property - the property to match on
       * @returns {PointElement|undefined}
       */
    interpolate(point: PointElement, property: string): PointElement | undefined;
    /**
       * Append a segment of this line to current path.
       * @param {CanvasRenderingContext2D} ctx
       * @param {object} segment
       * @param {number} segment.start - start index of the segment, referring the points array
       * @param {number} segment.end - end index of the segment, referring the points array
       * @param {boolean} segment.loop - indicates that the segment is a loop
       * @param {object} params
       * @param {boolean} params.move - move to starting point (vs line to it)
       * @param {boolean} params.reverse - path the segment from end to start
       * @param {number} params.start - limit segment to points starting from `start` index
       * @param {number} params.end - limit segment to points ending at `start` + `count` index
       * @returns {undefined|boolean} - true if the segment is a full loop (path should be closed)
       */
    pathSegment(ctx: CanvasRenderingContext2D, segment: {
        start: number;
        end: number;
        loop: boolean;
    }, params: {
        move: boolean;
        reverse: boolean;
        start: number;
        end: number;
    }): undefined | boolean;
    /**
       * Append all segments of this line to current path.
       * @param {CanvasRenderingContext2D|Path2D} ctx
       * @param {number} [start]
       * @param {number} [count]
       * @returns {undefined|boolean} - true if line is a full loop (path should be closed)
       */
    path(ctx: CanvasRenderingContext2D | Path2D, start?: number, count?: number): undefined | boolean;
    /**
       * Draw
       * @param {CanvasRenderingContext2D} ctx
       * @param {object} chartArea
       * @param {number} [start]
       * @param {number} [count]
       */
    draw(ctx: CanvasRenderingContext2D, chartArea: object, start?: number, count?: number): void;
}
export type PointElement = import('./element.point.js').default;
import Element from "../core/core.element.js";
