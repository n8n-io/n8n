export default Chart;
export type ChartEvent = import('../types/index.js').ChartEvent;
export type Point = import('../types/index.js').Point;
declare class Chart {
    static defaults: import("./core.defaults.js").Defaults;
    static instances: {};
    static overrides: any;
    static registry: import("./core.registry.js").Registry;
    static version: string;
    static getChart: (key: any) => any;
    static register(...items: any[]): void;
    static unregister(...items: any[]): void;
    constructor(item: any, userConfig: any);
    config: Config;
    platform: any;
    id: number;
    ctx: any;
    canvas: any;
    width: any;
    height: any;
    _options: any;
    _aspectRatio: any;
    _layers: any[];
    _metasets: any[];
    _stacks: any;
    boxes: any[];
    currentDevicePixelRatio: any;
    chartArea: any;
    _active: any[];
    _lastEvent: import("../types/index.js").ChartEvent;
    _listeners: {};
    /** @type {?{attach?: function, detach?: function, resize?: function}} */
    _responsiveListeners: {
        attach?: Function;
        detach?: Function;
        resize?: Function;
    };
    _sortedMetasets: any[];
    scales: {};
    _plugins: PluginService;
    $proxies: {};
    _hiddenIndices: {};
    attached: boolean;
    _animationsDisabled: boolean;
    $context: {
        chart: Chart;
        type: string;
    };
    _doResize: (mode?: any) => number;
    _dataChanges: any[];
    get aspectRatio(): any;
    set data(arg: any);
    get data(): any;
    set options(arg: any);
    get options(): any;
    get registry(): import("./core.registry.js").Registry;
    /**
       * @private
       */
    private _initialize;
    clear(): Chart;
    stop(): Chart;
    /**
       * Resize the chart to its container or to explicit dimensions.
       * @param {number} [width]
       * @param {number} [height]
       */
    resize(width?: number, height?: number): void;
    _resizeBeforeDraw: {
        width: number;
        height: number;
    };
    _resize(width: any, height: any): void;
    ensureScalesHaveIDs(): void;
    /**
       * Builds a map of scale ID to scale object for future lookup.
       */
    buildOrUpdateScales(): void;
    /**
       * @private
       */
    private _updateMetasets;
    /**
       * @private
       */
    private _removeUnreferencedMetasets;
    buildOrUpdateControllers(): any[];
    /**
       * Reset the elements of all datasets
       * @private
       */
    private _resetElements;
    /**
      * Resets the chart back to its state before the initial animation
      */
    reset(): void;
    update(mode: any): void;
    _minPadding: number;
    /**
     * @private
     */
    private _updateScales;
    /**
     * @private
     */
    private _checkEventBindings;
    /**
     * @private
     */
    private _updateHiddenIndices;
    /**
     * @private
     */
    private _getUniformDataChanges;
    /**
       * Updates the chart layout unless a plugin returns `false` to the `beforeLayout`
       * hook, in which case, plugins will not be called on `afterLayout`.
       * @private
       */
    private _updateLayout;
    /**
       * Updates all datasets unless a plugin returns `false` to the `beforeDatasetsUpdate`
       * hook, in which case, plugins will not be called on `afterDatasetsUpdate`.
       * @private
       */
    private _updateDatasets;
    /**
       * Updates dataset at index unless a plugin returns `false` to the `beforeDatasetUpdate`
       * hook, in which case, plugins will not be called on `afterDatasetUpdate`.
       * @private
       */
    private _updateDataset;
    render(): void;
    draw(): void;
    /**
       * @private
       */
    private _getSortedDatasetMetas;
    /**
       * Gets the visible dataset metas in drawing order
       * @return {object[]}
       */
    getSortedVisibleDatasetMetas(): object[];
    /**
       * Draws all datasets unless a plugin returns `false` to the `beforeDatasetsDraw`
       * hook, in which case, plugins will not be called on `afterDatasetsDraw`.
       * @private
       */
    private _drawDatasets;
    /**
       * Draws dataset at index unless a plugin returns `false` to the `beforeDatasetDraw`
       * hook, in which case, plugins will not be called on `afterDatasetDraw`.
       * @private
       */
    private _drawDataset;
    /**
     * Checks whether the given point is in the chart area.
     * @param {Point} point - in relative coordinates (see, e.g., getRelativePosition)
     * @returns {boolean}
     */
    isPointInArea(point: Point): boolean;
    getElementsAtEventForMode(e: any, mode: any, options: any, useFinalPosition: any): any;
    getDatasetMeta(datasetIndex: any): any;
    getContext(): {
        chart: Chart;
        type: string;
    };
    getVisibleDatasetCount(): number;
    isDatasetVisible(datasetIndex: any): boolean;
    setDatasetVisibility(datasetIndex: any, visible: any): void;
    toggleDataVisibility(index: any): void;
    getDataVisibility(index: any): boolean;
    /**
       * @private
       */
    private _updateVisibility;
    hide(datasetIndex: any, dataIndex: any): void;
    show(datasetIndex: any, dataIndex: any): void;
    /**
       * @private
       */
    private _destroyDatasetMeta;
    _stop(): void;
    destroy(): void;
    toBase64Image(...args: any[]): any;
    /**
       * @private
       */
    private bindEvents;
    /**
     * @private
     */
    private bindUserEvents;
    /**
     * @private
     */
    private bindResponsiveEvents;
    /**
       * @private
       */
    private unbindEvents;
    updateHoverStyle(items: any, mode: any, enabled: any): void;
    /**
       * Get active (hovered) elements
       * @returns array
       */
    getActiveElements(): any[];
    /**
       * Set active (hovered) elements
       * @param {array} activeElements New active data points
       */
    setActiveElements(activeElements: any[]): void;
    /**
       * Calls enabled plugins on the specified hook and with the given args.
       * This method immediately returns as soon as a plugin explicitly returns false. The
       * returned value can be used, for instance, to interrupt the current action.
       * @param {string} hook - The name of the plugin method to call (e.g. 'beforeUpdate').
       * @param {Object} [args] - Extra arguments to apply to the hook call.
     * @param {import('./core.plugins.js').filterCallback} [filter] - Filtering function for limiting which plugins are notified
       * @returns {boolean} false if any of the plugins return false, else returns true.
       */
    notifyPlugins(hook: string, args?: any, filter?: import('./core.plugins.js').filterCallback): boolean;
    /**
     * Check if a plugin with the specific ID is registered and enabled
     * @param {string} pluginId - The ID of the plugin of which to check if it is enabled
     * @returns {boolean}
     */
    isPluginEnabled(pluginId: string): boolean;
    /**
       * @private
       */
    private _updateHoverStyles;
    /**
       * @private
       */
    private _eventHandler;
    /**
       * Handle an event
       * @param {ChartEvent} e the event to handle
       * @param {boolean} [replay] - true if the event was replayed by `update`
     * @param {boolean} [inChartArea] - true if the event is inside chartArea
       * @return {boolean} true if the chart needs to re-render
       * @private
       */
    private _handleEvent;
    /**
     * @param {ChartEvent} e - The event
     * @param {import('../types/index.js').ActiveElement[]} lastActive - Previously active elements
     * @param {boolean} inChartArea - Is the event inside chartArea
     * @param {boolean} useFinalPosition - Should the evaluation be done with current or final (after animation) element positions
     * @returns {import('../types/index.js').ActiveElement[]} - The active elements
     * @pravate
     */
    _getActiveElements(e: ChartEvent, lastActive: import('../types/index.js').ActiveElement[], inChartArea: boolean, useFinalPosition: boolean): import('../types/index.js').ActiveElement[];
}
import Config from "./core.config.js";
import PluginService from "./core.plugins.js";
