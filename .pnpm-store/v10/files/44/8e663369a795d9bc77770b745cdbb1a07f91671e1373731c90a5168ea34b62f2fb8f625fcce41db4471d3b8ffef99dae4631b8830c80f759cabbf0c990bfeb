export default class BarController extends DatasetController {
    static id: string;
    /**
     * @type {any}
     */
    static overrides: any;
    /**
       * Overriding primitive data parsing since we support mixed primitive/array
       * data for float bars
       * @protected
       */
    protected parsePrimitiveData(meta: any, data: any, start: any, count: any): any[];
    /**
       * Overriding array data parsing since we support mixed primitive/array
       * data for float bars
       * @protected
       */
    protected parseArrayData(meta: any, data: any, start: any, count: any): any[];
    /**
       * Overriding object data parsing since we support mixed primitive/array
       * value-scale data for float bars
       * @protected
       */
    protected parseObjectData(meta: any, data: any, start: any, count: any): any[];
    update(mode: any): void;
    /**
       * Returns the stacks based on groups and bar visibility.
       * @param {number} [last] - The dataset index
       * @param {number} [dataIndex] - The data index of the ruler
       * @returns {string[]} The list of stack IDs
       * @private
       */
    private _getStacks;
    /**
       * Returns the effective number of stacks based on groups and bar visibility.
       * @private
       */
    private _getStackCount;
    _getAxisCount(): number;
    getFirstScaleIdForIndexAxis(): string;
    _getAxis(): string[];
    /**
       * Returns the stack index for the given dataset based on groups and bar visibility.
       * @param {number} [datasetIndex] - The dataset index
       * @param {string} [name] - The stack name to find
     * @param {number} [dataIndex]
       * @returns {number} The stack index
       * @private
       */
    private _getStackIndex;
    /**
       * @private
       */
    private _getRuler;
    /**
       * Note: pixel values are not clamped to the scale area.
       * @private
       */
    private _calculateBarValuePixels;
    /**
       * @private
       */
    private _calculateBarIndexPixels;
}
import DatasetController from "../core/core.datasetController.js";
