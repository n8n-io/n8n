export default class DatasetController {
    /**
     * @type {any}
     */
    static defaults: any;
    /**
     * Element type used to generate a meta dataset (e.g. Chart.element.LineElement).
     */
    static datasetElementType: any;
    /**
     * Element type used to generate a meta data (e.g. Chart.element.PointElement).
     */
    static dataElementType: any;
    /**
       * @param {Chart} chart
       * @param {number} datasetIndex
       */
    constructor(chart: Chart, datasetIndex: number);
    chart: import("./core.controller.js").default;
    _ctx: any;
    index: number;
    _cachedDataOpts: {};
    _cachedMeta: any;
    _type: any;
    options: any;
    /** @type {boolean | object} */
    _parsing: boolean | object;
    _data: any;
    _objectData: any;
    _sharedOptions: any;
    _drawStart: any;
    _drawCount: any;
    enableOptionSharing: boolean;
    supportsDecimation: boolean;
    $context: any;
    _syncList: any[];
    datasetElementType: any;
    dataElementType: any;
    initialize(): void;
    updateIndex(datasetIndex: any): void;
    linkScales(): void;
    getDataset(): any;
    getMeta(): any;
    /**
       * @param {string} scaleID
       * @return {Scale}
       */
    getScaleForId(scaleID: string): Scale;
    /**
       * @private
       */
    private _getOtherScale;
    reset(): void;
    /**
       * @private
       */
    private _destroy;
    /**
       * @private
       */
    private _dataCheck;
    addElements(): void;
    buildOrUpdateElements(resetNewElements: any): void;
    /**
       * Merges user-supplied and default dataset-level options
       * @private
       */
    private configure;
    /**
       * @param {number} start
       * @param {number} count
       */
    parse(start: number, count: number): void;
    /**
       * Parse array of primitive values
       * @param {object} meta - dataset meta
       * @param {array} data - data array. Example [1,3,4]
       * @param {number} start - start index
       * @param {number} count - number of items to parse
       * @returns {object} parsed item - item containing index and a parsed value
       * for each scale id.
       * Example: {xScale0: 0, yScale0: 1}
       * @protected
       */
    protected parsePrimitiveData(meta: object, data: any[], start: number, count: number): object;
    /**
       * Parse array of arrays
       * @param {object} meta - dataset meta
       * @param {array} data - data array. Example [[1,2],[3,4]]
       * @param {number} start - start index
       * @param {number} count - number of items to parse
       * @returns {object} parsed item - item containing index and a parsed value
       * for each scale id.
       * Example: {x: 0, y: 1}
       * @protected
       */
    protected parseArrayData(meta: object, data: any[], start: number, count: number): object;
    /**
       * Parse array of objects
       * @param {object} meta - dataset meta
       * @param {array} data - data array. Example [{x:1, y:5}, {x:2, y:10}]
       * @param {number} start - start index
       * @param {number} count - number of items to parse
       * @returns {object} parsed item - item containing index and a parsed value
       * for each scale id. _custom is optional
       * Example: {xScale0: 0, yScale0: 1, _custom: {r: 10, foo: 'bar'}}
       * @protected
       */
    protected parseObjectData(meta: object, data: any[], start: number, count: number): object;
    /**
       * @protected
       */
    protected getParsed(index: any): any;
    /**
       * @protected
       */
    protected getDataElement(index: any): any;
    /**
       * @protected
       */
    protected applyStack(scale: any, parsed: any, mode: any): any;
    /**
       * @protected
       */
    protected updateRangeFromParsed(range: any, scale: any, parsed: any, stack: any): void;
    /**
       * @protected
       */
    protected getMinMax(scale: any, canStack: any): {
        min: number;
        max: number;
    };
    getAllParsedValues(scale: any): number[];
    /**
       * @return {number|boolean}
       * @protected
       */
    protected getMaxOverflow(): number | boolean;
    /**
       * @protected
       */
    protected getLabelAndValue(index: any): {
        label: string;
        value: string;
    };
    /**
       * @private
       */
    private _update;
    /**
       * @param {string} mode
       */
    update(mode: string): void;
    draw(): void;
    /**
       * Returns a set of predefined style properties that should be used to represent the dataset
       * or the data if the index is specified
       * @param {number} index - data index
       * @param {boolean} [active] - true if hover
       * @return {object} style object
       */
    getStyle(index: number, active?: boolean): object;
    /**
       * @protected
       */
    protected getContext(index: any, active: any, mode: any): any;
    /**
       * @param {string} [mode]
       * @protected
       */
    protected resolveDatasetElementOptions(mode?: string): any;
    /**
       * @param {number} index
       * @param {string} [mode]
       * @protected
       */
    protected resolveDataElementOptions(index: number, mode?: string): any;
    /**
       * @private
       */
    private _resolveElementOptions;
    /**
       * @private
       */
    private _resolveAnimations;
    /**
       * Utility for getting the options object shared between elements
       * @protected
       */
    protected getSharedOptions(options: any): any;
    /**
       * Utility for determining if `options` should be included in the updated properties
       * @protected
       */
    protected includeOptions(mode: any, sharedOptions: any): boolean;
    /**
     * @todo v4, rename to getSharedOptions and remove excess functions
     */
    _getSharedOptions(start: any, mode: any): {
        sharedOptions: any;
        includeOptions: boolean;
    };
    /**
       * Utility for updating an element with new properties, using animations when appropriate.
       * @protected
       */
    protected updateElement(element: any, index: any, properties: any, mode: any): void;
    /**
       * Utility to animate the shared options, that are potentially affecting multiple elements.
       * @protected
       */
    protected updateSharedOptions(sharedOptions: any, mode: any, newOptions: any): void;
    /**
       * @private
       */
    private _setStyle;
    removeHoverStyle(element: any, datasetIndex: any, index: any): void;
    setHoverStyle(element: any, datasetIndex: any, index: any): void;
    /**
       * @private
       */
    private _removeDatasetHoverStyle;
    /**
       * @private
       */
    private _setDatasetHoverStyle;
    /**
       * @private
       */
    private _resyncElements;
    /**
       * @private
       */
    private _insertElements;
    updateElements(element: any, start: any, count: any, mode: any): void;
    /**
       * @private
       */
    private _removeElements;
    /**
       * @private
     */
    private _sync;
    _onDataPush(...args: any[]): void;
    _onDataPop(): void;
    _onDataShift(): void;
    _onDataSplice(start: any, count: any, ...args: any[]): void;
    _onDataUnshift(...args: any[]): void;
}
export type Chart = import('./core.controller.js').default;
export type Scale = import('./core.scale.js').default;
