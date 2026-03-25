export default class TimeScale extends Scale {
    static id: string;
    /**
     * @type {any}
     */
    static defaults: any;
    /**
       * @param {object} props
       */
    constructor(props: object);
    /** @type {{data: number[], labels: number[], all: number[]}} */
    _cache: {
        data: number[];
        labels: number[];
        all: number[];
    };
    /** @type {Unit} */
    _unit: Unit;
    /** @type {Unit=} */
    _majorUnit: Unit | undefined;
    _offsets: {};
    _normalized: boolean;
    _parseOpts: {
        parser: any;
        round: any;
        isoWeekday: any;
    };
    init(scaleOpts: any, opts?: {}): void;
    _adapter: DateAdapter;
    /**
       * @param {*} raw
       * @param {number?} [index]
       * @return {number}
       */
    parse(raw: any, index?: number | null): number;
    /**
       * @private
       */
    private _getLabelBounds;
    /**
       * Returns the start and end offsets from edges in the form of {start, end}
       * where each value is a relative width to the scale and ranges between 0 and 1.
       * They add extra margins on the both sides by scaling down the original scale.
       * Offsets are added when the `offset` option is true.
       * @param {number[]} timestamps
       * @protected
       */
    protected initOffsets(timestamps?: number[]): void;
    /**
       * Generates a maximum of `capacity` timestamps between min and max, rounded to the
       * `minor` unit using the given scale time `options`.
       * Important: this method can return ticks outside the min and max range, it's the
       * responsibility of the calling code to clamp values if needed.
       * @protected
       */
    protected _generate(): number[];
    /**
       * @param {number} value
       * @return {string}
       */
    getLabelForValue(value: number): string;
    /**
       * @param {number} value
       * @param {string|undefined} format
       * @return {string}
       */
    format(value: number, format: string | undefined): string;
    /**
       * Function to format an individual tick mark
       * @param {number} time
       * @param {number} index
       * @param {object[]} ticks
       * @param {string|undefined} [format]
       * @return {string}
       * @private
       */
    private _tickFormatFunction;
    /**
       * @param {object[]} ticks
       */
    generateTickLabels(ticks: object[]): void;
    /**
       * @param {number} value - Milliseconds since epoch (1 January 1970 00:00:00 UTC)
       * @return {number}
       */
    getDecimalForValue(value: number): number;
    /**
       * @param {number} value - Milliseconds since epoch (1 January 1970 00:00:00 UTC)
       * @return {number}
       */
    getPixelForValue(value: number): number;
    /**
       * @param {number} pixel
       * @return {number}
       */
    getValueForPixel(pixel: number): number;
    /**
       * @param {string} label
       * @return {{w:number, h:number}}
       * @private
       */
    private _getLabelSize;
    /**
       * @param {number} exampleTime
       * @return {number}
       * @private
       */
    private _getLabelCapacity;
    /**
       * @protected
       */
    protected getDataTimestamps(): any;
    /**
       * @protected
       */
    protected getLabelTimestamps(): number[];
    /**
       * @param {number[]} values
       * @protected
       */
    protected normalize(values: number[]): number[];
}
export type Unit = import('../core/core.adapters.js').TimeUnit;
export type Interval = {
    common: boolean;
    size: number;
    steps?: number;
};
export type DateAdapter = import('../core/core.adapters.js').DateAdapter;
import Scale from "../core/core.scale.js";
