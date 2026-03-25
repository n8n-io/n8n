"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const JsHistogramIterator_1 = require("./JsHistogramIterator");
const { pow, floor, log2 } = Math;
/**
 * Used for iterating through histogram values according to percentile levels. The iteration is
 * performed in steps that start at 0% and reduce their distance to 100% according to the
 * <i>percentileTicksPerHalfDistance</i> parameter, ultimately reaching 100% when all recorded histogram
 * values are exhausted.
 */
class PercentileIterator extends JsHistogramIterator_1.default {
    /**
     * @param histogram The histogram this iterator will operate on
     * @param percentileTicksPerHalfDistance The number of equal-sized iteration steps per half-distance to 100%.
     */
    constructor(histogram, percentileTicksPerHalfDistance) {
        super();
        this.percentileTicksPerHalfDistance = 0;
        this.percentileLevelToIterateTo = 0;
        this.percentileLevelToIterateFrom = 0;
        this.reachedLastRecordedValue = false;
        this.doReset(histogram, percentileTicksPerHalfDistance);
    }
    /**
     * Reset iterator for re-use in a fresh iteration over the same histogram data set.
     *
     * @param percentileTicksPerHalfDistance The number of iteration steps per half-distance to 100%.
     */
    reset(percentileTicksPerHalfDistance) {
        this.doReset(this.histogram, percentileTicksPerHalfDistance);
    }
    doReset(histogram, percentileTicksPerHalfDistance) {
        super.resetIterator(histogram);
        this.percentileTicksPerHalfDistance = percentileTicksPerHalfDistance;
        this.percentileLevelToIterateTo = 0;
        this.percentileLevelToIterateFrom = 0;
        this.reachedLastRecordedValue = false;
    }
    hasNext() {
        if (super.hasNext())
            return true;
        if (!this.reachedLastRecordedValue && this.arrayTotalCount > 0) {
            this.percentileLevelToIterateTo = 100;
            this.reachedLastRecordedValue = true;
            return true;
        }
        return false;
    }
    incrementIterationLevel() {
        this.percentileLevelToIterateFrom = this.percentileLevelToIterateTo;
        // The choice to maintain fixed-sized "ticks" in each half-distance to 100% [starting
        // from 0%], as opposed to a "tick" size that varies with each interval, was made to
        // make the steps easily comprehensible and readable to humans. The resulting percentile
        // steps are much easier to browse through in a percentile distribution output, for example.
        //
        // We calculate the number of equal-sized "ticks" that the 0-100 range will be divided
        // by at the current scale. The scale is detemined by the percentile level we are
        // iterating to. The following math determines the tick size for the current scale,
        // and maintain a fixed tick size for the remaining "half the distance to 100%"
        // [from either 0% or from the previous half-distance]. When that half-distance is
        // crossed, the scale changes and the tick size is effectively cut in half.
        // percentileTicksPerHalfDistance = 5
        // percentileReportingTicks = 10,
        const percentileReportingTicks = this.percentileTicksPerHalfDistance *
            pow(2, floor(log2(100 / (100 - this.percentileLevelToIterateTo))) + 1);
        this.percentileLevelToIterateTo += 100 / percentileReportingTicks;
    }
    reachedIterationLevel() {
        if (this.countAtThisValue === 0) {
            return false;
        }
        const currentPercentile = (100 * this.totalCountToCurrentIndex) / this.arrayTotalCount;
        return currentPercentile >= this.percentileLevelToIterateTo;
    }
    getPercentileIteratedTo() {
        return this.percentileLevelToIterateTo;
    }
    getPercentileIteratedFrom() {
        return this.percentileLevelToIterateFrom;
    }
}
exports.default = PercentileIterator;
//# sourceMappingURL=PercentileIterator.js.map