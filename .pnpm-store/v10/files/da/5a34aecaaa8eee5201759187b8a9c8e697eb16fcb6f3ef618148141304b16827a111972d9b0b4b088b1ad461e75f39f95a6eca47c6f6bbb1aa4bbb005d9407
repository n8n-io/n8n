export default class Scale extends Element<import("../types/basic.js").AnyObject, import("../types/basic.js").AnyObject> {
    constructor(cfg: any);
    /** @type {string} */
    id: string;
    /** @type {string} */
    type: string;
    /** @type {any} */
    options: any;
    /** @type {CanvasRenderingContext2D} */
    ctx: CanvasRenderingContext2D;
    /** @type {Chart} */
    chart: Chart;
    /** @type {number} */
    top: number;
    /** @type {number} */
    bottom: number;
    /** @type {number} */
    left: number;
    /** @type {number} */
    right: number;
    /** @type {number} */
    width: number;
    /** @type {number} */
    height: number;
    _margins: {
        left: number;
        right: number;
        top: number;
        bottom: number;
    };
    /** @type {number} */
    maxWidth: number;
    /** @type {number} */
    maxHeight: number;
    /** @type {number} */
    paddingTop: number;
    /** @type {number} */
    paddingBottom: number;
    /** @type {number} */
    paddingLeft: number;
    /** @type {number} */
    paddingRight: number;
    /** @type {string=} */
    axis: string | undefined;
    /** @type {number=} */
    labelRotation: number | undefined;
    min: any;
    max: any;
    _range: {
        min: number;
        max: number;
    };
    /** @type {Tick[]} */
    ticks: Tick[];
    /** @type {object[]|null} */
    _gridLineItems: object[] | null;
    /** @type {object[]|null} */
    _labelItems: object[] | null;
    /** @type {object|null} */
    _labelSizes: object | null;
    _length: number;
    _maxLength: number;
    _longestTextCache: {};
    /** @type {number} */
    _startPixel: number;
    /** @type {number} */
    _endPixel: number;
    _reversePixels: boolean;
    _userMax: any;
    _userMin: any;
    _suggestedMax: any;
    _suggestedMin: any;
    _ticksLength: number;
    _borderValue: number;
    _cache: {};
    _dataLimitsCached: boolean;
    $context: any;
    /**
       * @param {any} options
       * @since 3.0
       */
    init(options: any): void;
    /**
       * Parse a supported input value to internal representation.
       * @param {*} raw
       * @param {number} [index]
       * @since 3.0
       */
    parse(raw: any, index?: number): any;
    /**
       * @return {{min: number, max: number, minDefined: boolean, maxDefined: boolean}}
       * @protected
       * @since 3.0
       */
    protected getUserBounds(): {
        min: number;
        max: number;
        minDefined: boolean;
        maxDefined: boolean;
    };
    /**
       * @param {boolean} canStack
       * @return {{min: number, max: number}}
       * @protected
       * @since 3.0
       */
    protected getMinMax(canStack: boolean): {
        min: number;
        max: number;
    };
    /**
       * Get the padding needed for the scale
       * @return {{top: number, left: number, bottom: number, right: number}} the necessary padding
       * @private
       */
    private getPadding;
    /**
       * Returns the scale tick objects
       * @return {Tick[]}
       * @since 2.7
       */
    getTicks(): Tick[];
    /**
       * @return {string[]}
       */
    getLabels(): string[];
    /**
     * @return {import('../types.js').LabelItem[]}
     */
    getLabelItems(chartArea?: import("../types.js").ChartArea): import('../types.js').LabelItem[];
    beforeLayout(): void;
    beforeUpdate(): void;
    /**
       * @param {number} maxWidth - the max width in pixels
       * @param {number} maxHeight - the max height in pixels
       * @param {{top: number, left: number, bottom: number, right: number}} margins - the space between the edge of the other scales and edge of the chart
       *   This space comes from two sources:
       *     - padding - space that's required to show the labels at the edges of the scale
       *     - thickness of scales or legends in another orientation
       */
    update(maxWidth: number, maxHeight: number, margins: {
        top: number;
        left: number;
        bottom: number;
        right: number;
    }): void;
    /**
       * @protected
       */
    protected configure(): void;
    _alignToPixels: any;
    afterUpdate(): void;
    beforeSetDimensions(): void;
    setDimensions(): void;
    afterSetDimensions(): void;
    _callHooks(name: any): void;
    beforeDataLimits(): void;
    determineDataLimits(): void;
    afterDataLimits(): void;
    beforeBuildTicks(): void;
    /**
       * @return {object[]} the ticks
       */
    buildTicks(): object[];
    afterBuildTicks(): void;
    beforeTickToLabelConversion(): void;
    /**
       * Convert ticks to label strings
       * @param {Tick[]} ticks
       */
    generateTickLabels(ticks: Tick[]): void;
    afterTickToLabelConversion(): void;
    beforeCalculateLabelRotation(): void;
    calculateLabelRotation(): void;
    afterCalculateLabelRotation(): void;
    afterAutoSkip(): void;
    beforeFit(): void;
    fit(): void;
    _calculatePadding(first: any, last: any, sin: any, cos: any): void;
    /**
       * Handle margins and padding interactions
       * @private
       */
    private _handleMargins;
    afterFit(): void;
    /**
       * @return {boolean}
       */
    isHorizontal(): boolean;
    /**
       * @return {boolean}
       */
    isFullSize(): boolean;
    /**
       * @param {Tick[]} ticks
       * @private
       */
    private _convertTicksToLabels;
    /**
       * @return {{ first: object, last: object, widest: object, highest: object, widths: Array, heights: array }}
       * @private
       */
    private _getLabelSizes;
    /**
       * Returns {width, height, offset} objects for the first, last, widest, highest tick
       * labels where offset indicates the anchor point offset from the top in pixels.
       * @return {{ first: object, last: object, widest: object, highest: object, widths: Array, heights: array }}
       * @private
       */
    private _computeLabelSizes;
    /**
       * Used to get the label to display in the tooltip for the given value
       * @param {*} value
       * @return {string}
       */
    getLabelForValue(value: any): string;
    /**
       * Returns the location of the given data point. Value can either be an index or a numerical value
       * The coordinate (0, 0) is at the upper-left corner of the canvas
       * @param {*} value
       * @param {number} [index]
       * @return {number}
       */
    getPixelForValue(value: any, index?: number): number;
    /**
       * Used to get the data value from a given pixel. This is the inverse of getPixelForValue
       * The coordinate (0, 0) is at the upper-left corner of the canvas
       * @param {number} pixel
       * @return {*}
       */
    getValueForPixel(pixel: number): any;
    /**
       * Returns the location of the tick at the given index
       * The coordinate (0, 0) is at the upper-left corner of the canvas
       * @param {number} index
       * @return {number}
       */
    getPixelForTick(index: number): number;
    /**
       * Utility for getting the pixel location of a percentage of scale
       * The coordinate (0, 0) is at the upper-left corner of the canvas
       * @param {number} decimal
       * @return {number}
       */
    getPixelForDecimal(decimal: number): number;
    /**
       * @param {number} pixel
       * @return {number}
       */
    getDecimalForPixel(pixel: number): number;
    /**
       * Returns the pixel for the minimum chart value
       * The coordinate (0, 0) is at the upper-left corner of the canvas
       * @return {number}
       */
    getBasePixel(): number;
    /**
       * @return {number}
       */
    getBaseValue(): number;
    /**
       * @protected
       */
    protected getContext(index: any): any;
    /**
       * @return {number}
       * @private
       */
    private _tickSize;
    /**
       * @return {boolean}
       * @private
       */
    private _isVisible;
    /**
       * @private
       */
    private _computeGridLineItems;
    /**
       * @private
       */
    private _computeLabelItems;
    _getXAxisLabelAlignment(): string;
    _getYAxisLabelAlignment(tl: any): {
        textAlign: string;
        x: any;
    };
    /**
       * @private
       */
    private _computeLabelArea;
    /**
     * @protected
     */
    protected drawBackground(): void;
    getLineWidthForValue(value: any): any;
    /**
       * @protected
       */
    protected drawGrid(chartArea: any): void;
    /**
       * @protected
       */
    protected drawBorder(): void;
    /**
       * @protected
       */
    protected drawLabels(chartArea: any): void;
    /**
       * @protected
       */
    protected drawTitle(): void;
    draw(chartArea: any): void;
    /**
       * @return {object[]}
       * @private
       */
    private _layers;
    /**
       * Returns visible dataset metas that are attached to this scale
       * @param {string} [type] - if specified, also filter by dataset type
       * @return {object[]}
       */
    getMatchingVisibleMetas(type?: string): object[];
    /**
       * @param {number} index
       * @return {object}
       * @protected
       */
    protected _resolveTickFontOptions(index: number): object;
    /**
     * @protected
     */
    protected _maxDigits(): number;
}
export type Chart = import('../types/index.js').Chart;
export type Tick = {
    value: number | string;
    label?: string;
    major?: boolean;
    $context?: any;
};
import Element from "./core.element.js";
