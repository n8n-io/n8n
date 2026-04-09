/**
 * @typedef { import('./core.controller.js').default } Chart
 * @typedef { import('../types/index.js').ChartEvent } ChartEvent
 * @typedef { import('../plugins/plugin.tooltip.js').default } Tooltip
 */
/**
 * @callback filterCallback
 * @param {{plugin: object, options: object}} value
 * @param {number} [index]
 * @param {array} [array]
 * @param {object} [thisArg]
 * @return {boolean}
 */
export default class PluginService {
    _init: {
        plugin: any;
        options: any;
    }[];
    /**
       * Calls enabled plugins for `chart` on the specified hook and with the given args.
       * This method immediately returns as soon as a plugin explicitly returns false. The
       * returned value can be used, for instance, to interrupt the current action.
       * @param {Chart} chart - The chart instance for which plugins should be called.
       * @param {string} hook - The name of the plugin method to call (e.g. 'beforeUpdate').
       * @param {object} [args] - Extra arguments to apply to the hook call.
     * @param {filterCallback} [filter] - Filtering function for limiting which plugins are notified
       * @returns {boolean} false if any of the plugins return false, else returns true.
       */
    notify(chart: Chart, hook: string, args?: object, filter?: filterCallback): boolean;
    /**
       * @private
       */
    private _notify;
    invalidate(): void;
    _oldCache: {
        plugin: any;
        options: any;
    }[];
    _cache: {
        plugin: any;
        options: any;
    }[];
    /**
       * @param {Chart} chart
       * @private
       */
    private _descriptors;
    _createDescriptors(chart: any, all: any): {
        plugin: any;
        options: any;
    }[];
    /**
       * @param {Chart} chart
       * @private
       */
    private _notifyStateChanges;
}
export type Chart = import('./core.controller.js').default;
export type ChartEvent = import('../types/index.js').ChartEvent;
export type Tooltip = any;
export type filterCallback = (value: {
    plugin: object;
    options: object;
}, index?: number, array?: any[], thisArg?: object) => boolean;
