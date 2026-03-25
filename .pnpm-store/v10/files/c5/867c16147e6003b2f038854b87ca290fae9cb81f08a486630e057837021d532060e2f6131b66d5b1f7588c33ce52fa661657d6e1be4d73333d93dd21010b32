export default TimeSeriesScale;
declare class TimeSeriesScale extends TimeScale {
    /** @type {object[]} */
    _table: object[];
    /** @type {number} */
    _minPos: number;
    /** @type {number} */
    _tableRange: number;
    /**
       * @protected
       */
    protected initOffsets(): void;
    /**
       * Returns an array of {time, pos} objects used to interpolate a specific `time` or position
       * (`pos`) on the scale, by searching entries before and after the requested value. `pos` is
       * a decimal between 0 and 1: 0 being the start of the scale (left or top) and 1 the other
       * extremity (left + width or top + height). Note that it would be more optimized to directly
       * store pre-computed pixels, but the scale dimensions are not guaranteed at the time we need
       * to create the lookup table. The table ALWAYS contains at least two items: min and max.
       * @param {number[]} timestamps
       * @return {object[]}
       * @protected
       */
    protected buildLookupTable(timestamps: number[]): object[];
    /**
      * Generates all timestamps defined in the data.
      * Important: this method can return ticks outside the min and max range, it's the
      * responsibility of the calling code to clamp values if needed.
      * @protected
      */
    protected _generate(): any;
    /**
       * Returns all timestamps
       * @return {number[]}
       * @private
       */
    private _getTimestampsForTable;
}
import TimeScale from "./scale.time.js";
