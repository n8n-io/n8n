/*
 * Copyright The OpenTelemetry Authors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
var __read = (this && this.__read) || function (o, n) {
    var m = typeof Symbol === "function" && o[Symbol.iterator];
    if (!m) return o;
    var i = m.call(o), r, ar = [], e;
    try {
        while ((n === void 0 || n-- > 0) && !(r = i.next()).done) ar.push(r.value);
    }
    catch (error) { e = { error: error }; }
    finally {
        try {
            if (r && !r.done && (m = i["return"])) m.call(i);
        }
        finally { if (e) throw e.error; }
    }
    return ar;
};
import { AggregatorKind, } from './types';
import { DataPointType, } from '../export/MetricData';
import { diag } from '@opentelemetry/api';
import { InstrumentType } from '../InstrumentDescriptor';
import { Buckets } from './exponential-histogram/Buckets';
import { getMapping } from './exponential-histogram/mapping/getMapping';
import { nextGreaterSquare } from './exponential-histogram/util';
// HighLow is a utility class used for computing a common scale for
// two exponential histogram accumulations
var HighLow = /** @class */ (function () {
    function HighLow(low, high) {
        this.low = low;
        this.high = high;
    }
    HighLow.combine = function (h1, h2) {
        return new HighLow(Math.min(h1.low, h2.low), Math.max(h1.high, h2.high));
    };
    return HighLow;
}());
var MAX_SCALE = 20;
var DEFAULT_MAX_SIZE = 160;
var MIN_MAX_SIZE = 2;
var ExponentialHistogramAccumulation = /** @class */ (function () {
    function ExponentialHistogramAccumulation(startTime, _maxSize, _recordMinMax, _sum, _count, _zeroCount, _min, _max, _positive, _negative, _mapping) {
        if (startTime === void 0) { startTime = startTime; }
        if (_maxSize === void 0) { _maxSize = DEFAULT_MAX_SIZE; }
        if (_recordMinMax === void 0) { _recordMinMax = true; }
        if (_sum === void 0) { _sum = 0; }
        if (_count === void 0) { _count = 0; }
        if (_zeroCount === void 0) { _zeroCount = 0; }
        if (_min === void 0) { _min = Number.POSITIVE_INFINITY; }
        if (_max === void 0) { _max = Number.NEGATIVE_INFINITY; }
        if (_positive === void 0) { _positive = new Buckets(); }
        if (_negative === void 0) { _negative = new Buckets(); }
        if (_mapping === void 0) { _mapping = getMapping(MAX_SCALE); }
        this.startTime = startTime;
        this._maxSize = _maxSize;
        this._recordMinMax = _recordMinMax;
        this._sum = _sum;
        this._count = _count;
        this._zeroCount = _zeroCount;
        this._min = _min;
        this._max = _max;
        this._positive = _positive;
        this._negative = _negative;
        this._mapping = _mapping;
        if (this._maxSize < MIN_MAX_SIZE) {
            diag.warn("Exponential Histogram Max Size set to " + this._maxSize + ",                 changing to the minimum size of: " + MIN_MAX_SIZE);
            this._maxSize = MIN_MAX_SIZE;
        }
    }
    /**
     * record updates a histogram with a single count
     * @param {Number} value
     */
    ExponentialHistogramAccumulation.prototype.record = function (value) {
        this.updateByIncrement(value, 1);
    };
    /**
     * Sets the start time for this accumulation
     * @param {HrTime} startTime
     */
    ExponentialHistogramAccumulation.prototype.setStartTime = function (startTime) {
        this.startTime = startTime;
    };
    /**
     * Returns the datapoint representation of this accumulation
     * @param {HrTime} startTime
     */
    ExponentialHistogramAccumulation.prototype.toPointValue = function () {
        return {
            hasMinMax: this._recordMinMax,
            min: this.min,
            max: this.max,
            sum: this.sum,
            positive: {
                offset: this.positive.offset,
                bucketCounts: this.positive.counts(),
            },
            negative: {
                offset: this.negative.offset,
                bucketCounts: this.negative.counts(),
            },
            count: this.count,
            scale: this.scale,
            zeroCount: this.zeroCount,
        };
    };
    Object.defineProperty(ExponentialHistogramAccumulation.prototype, "sum", {
        /**
         * @returns {Number} The sum of values recorded by this accumulation
         */
        get: function () {
            return this._sum;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(ExponentialHistogramAccumulation.prototype, "min", {
        /**
         * @returns {Number} The minimum value recorded by this accumulation
         */
        get: function () {
            return this._min;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(ExponentialHistogramAccumulation.prototype, "max", {
        /**
         * @returns {Number} The maximum value recorded by this accumulation
         */
        get: function () {
            return this._max;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(ExponentialHistogramAccumulation.prototype, "count", {
        /**
         * @returns {Number} The count of values recorded by this accumulation
         */
        get: function () {
            return this._count;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(ExponentialHistogramAccumulation.prototype, "zeroCount", {
        /**
         * @returns {Number} The number of 0 values recorded by this accumulation
         */
        get: function () {
            return this._zeroCount;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(ExponentialHistogramAccumulation.prototype, "scale", {
        /**
         * @returns {Number} The scale used by this accumulation
         */
        get: function () {
            if (this._count === this._zeroCount) {
                // all zeros! scale doesn't matter, use zero
                return 0;
            }
            return this._mapping.scale;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(ExponentialHistogramAccumulation.prototype, "positive", {
        /**
         * positive holds the positive values
         * @returns {Buckets}
         */
        get: function () {
            return this._positive;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(ExponentialHistogramAccumulation.prototype, "negative", {
        /**
         * negative holds the negative values by their absolute value
         * @returns {Buckets}
         */
        get: function () {
            return this._negative;
        },
        enumerable: false,
        configurable: true
    });
    /**
     * updateByIncr supports updating a histogram with a non-negative
     * increment.
     * @param value
     * @param increment
     */
    ExponentialHistogramAccumulation.prototype.updateByIncrement = function (value, increment) {
        // NaN does not fall into any bucket, is not zero and should not be counted,
        // NaN is never greater than max nor less than min, therefore return as there's nothing for us to do.
        if (Number.isNaN(value)) {
            return;
        }
        if (value > this._max) {
            this._max = value;
        }
        if (value < this._min) {
            this._min = value;
        }
        this._count += increment;
        if (value === 0) {
            this._zeroCount += increment;
            return;
        }
        this._sum += value * increment;
        if (value > 0) {
            this._updateBuckets(this._positive, value, increment);
        }
        else {
            this._updateBuckets(this._negative, -value, increment);
        }
    };
    /**
     * merge combines data from previous value into self
     * @param {ExponentialHistogramAccumulation} previous
     */
    ExponentialHistogramAccumulation.prototype.merge = function (previous) {
        if (this._count === 0) {
            this._min = previous.min;
            this._max = previous.max;
        }
        else if (previous.count !== 0) {
            if (previous.min < this.min) {
                this._min = previous.min;
            }
            if (previous.max > this.max) {
                this._max = previous.max;
            }
        }
        this.startTime = previous.startTime;
        this._sum += previous.sum;
        this._count += previous.count;
        this._zeroCount += previous.zeroCount;
        var minScale = this._minScale(previous);
        this._downscale(this.scale - minScale);
        this._mergeBuckets(this.positive, previous, previous.positive, minScale);
        this._mergeBuckets(this.negative, previous, previous.negative, minScale);
    };
    /**
     * diff subtracts other from self
     * @param {ExponentialHistogramAccumulation} other
     */
    ExponentialHistogramAccumulation.prototype.diff = function (other) {
        this._min = Infinity;
        this._max = -Infinity;
        this._sum -= other.sum;
        this._count -= other.count;
        this._zeroCount -= other.zeroCount;
        var minScale = this._minScale(other);
        this._downscale(this.scale - minScale);
        this._diffBuckets(this.positive, other, other.positive, minScale);
        this._diffBuckets(this.negative, other, other.negative, minScale);
    };
    /**
     * clone returns a deep copy of self
     * @returns {ExponentialHistogramAccumulation}
     */
    ExponentialHistogramAccumulation.prototype.clone = function () {
        return new ExponentialHistogramAccumulation(this.startTime, this._maxSize, this._recordMinMax, this._sum, this._count, this._zeroCount, this._min, this._max, this.positive.clone(), this.negative.clone(), this._mapping);
    };
    /**
     * _updateBuckets maps the incoming value to a bucket index for the current
     * scale. If the bucket index is outside of the range of the backing array,
     * it will rescale the backing array and update the mapping for the new scale.
     */
    ExponentialHistogramAccumulation.prototype._updateBuckets = function (buckets, value, increment) {
        var index = this._mapping.mapToIndex(value);
        // rescale the mapping if needed
        var rescalingNeeded = false;
        var high = 0;
        var low = 0;
        if (buckets.length === 0) {
            buckets.indexStart = index;
            buckets.indexEnd = buckets.indexStart;
            buckets.indexBase = buckets.indexStart;
        }
        else if (index < buckets.indexStart &&
            buckets.indexEnd - index >= this._maxSize) {
            rescalingNeeded = true;
            low = index;
            high = buckets.indexEnd;
        }
        else if (index > buckets.indexEnd &&
            index - buckets.indexStart >= this._maxSize) {
            rescalingNeeded = true;
            low = buckets.indexStart;
            high = index;
        }
        // rescale and compute index at new scale
        if (rescalingNeeded) {
            var change = this._changeScale(high, low);
            this._downscale(change);
            index = this._mapping.mapToIndex(value);
        }
        this._incrementIndexBy(buckets, index, increment);
    };
    /**
     * _incrementIndexBy increments the count of the bucket specified by `index`.
     * If the index is outside of the range [buckets.indexStart, buckets.indexEnd]
     * the boundaries of the backing array will be adjusted and more buckets will
     * be added if needed.
     */
    ExponentialHistogramAccumulation.prototype._incrementIndexBy = function (buckets, index, increment) {
        if (increment === 0) {
            // nothing to do for a zero increment, can happen during a merge operation
            return;
        }
        if (buckets.length === 0) {
            buckets.indexStart = buckets.indexEnd = buckets.indexBase = index;
        }
        if (index < buckets.indexStart) {
            var span = buckets.indexEnd - index;
            if (span >= buckets.backing.length) {
                this._grow(buckets, span + 1);
            }
            buckets.indexStart = index;
        }
        else if (index > buckets.indexEnd) {
            var span = index - buckets.indexStart;
            if (span >= buckets.backing.length) {
                this._grow(buckets, span + 1);
            }
            buckets.indexEnd = index;
        }
        var bucketIndex = index - buckets.indexBase;
        if (bucketIndex < 0) {
            bucketIndex += buckets.backing.length;
        }
        buckets.incrementBucket(bucketIndex, increment);
    };
    /**
     * grow resizes the backing array by doubling in size up to maxSize.
     * This extends the array with a bunch of zeros and copies the
     * existing counts to the same position.
     */
    ExponentialHistogramAccumulation.prototype._grow = function (buckets, needed) {
        var size = buckets.backing.length;
        var bias = buckets.indexBase - buckets.indexStart;
        var oldPositiveLimit = size - bias;
        var newSize = nextGreaterSquare(needed);
        if (newSize > this._maxSize) {
            newSize = this._maxSize;
        }
        var newPositiveLimit = newSize - bias;
        buckets.backing.growTo(newSize, oldPositiveLimit, newPositiveLimit);
    };
    /**
     * _changeScale computes how much downscaling is needed by shifting the
     * high and low values until they are separated by no more than size.
     */
    ExponentialHistogramAccumulation.prototype._changeScale = function (high, low) {
        var change = 0;
        while (high - low >= this._maxSize) {
            high >>= 1;
            low >>= 1;
            change++;
        }
        return change;
    };
    /**
     * _downscale subtracts `change` from the current mapping scale.
     */
    ExponentialHistogramAccumulation.prototype._downscale = function (change) {
        if (change === 0) {
            return;
        }
        if (change < 0) {
            // Note: this should be impossible. If we get here it's because
            // there is a bug in the implementation.
            throw new Error("impossible change of scale: " + this.scale);
        }
        var newScale = this._mapping.scale - change;
        this._positive.downscale(change);
        this._negative.downscale(change);
        this._mapping = getMapping(newScale);
    };
    /**
     * _minScale is used by diff and merge to compute an ideal combined scale
     */
    ExponentialHistogramAccumulation.prototype._minScale = function (other) {
        var minScale = Math.min(this.scale, other.scale);
        var highLowPos = HighLow.combine(this._highLowAtScale(this.positive, this.scale, minScale), this._highLowAtScale(other.positive, other.scale, minScale));
        var highLowNeg = HighLow.combine(this._highLowAtScale(this.negative, this.scale, minScale), this._highLowAtScale(other.negative, other.scale, minScale));
        return Math.min(minScale - this._changeScale(highLowPos.high, highLowPos.low), minScale - this._changeScale(highLowNeg.high, highLowNeg.low));
    };
    /**
     * _highLowAtScale is used by diff and merge to compute an ideal combined scale.
     */
    ExponentialHistogramAccumulation.prototype._highLowAtScale = function (buckets, currentScale, newScale) {
        if (buckets.length === 0) {
            return new HighLow(0, -1);
        }
        var shift = currentScale - newScale;
        return new HighLow(buckets.indexStart >> shift, buckets.indexEnd >> shift);
    };
    /**
     * _mergeBuckets translates index values from another histogram and
     * adds the values into the corresponding buckets of this histogram.
     */
    ExponentialHistogramAccumulation.prototype._mergeBuckets = function (ours, other, theirs, scale) {
        var theirOffset = theirs.offset;
        var theirChange = other.scale - scale;
        for (var i = 0; i < theirs.length; i++) {
            this._incrementIndexBy(ours, (theirOffset + i) >> theirChange, theirs.at(i));
        }
    };
    /**
     * _diffBuckets translates index values from another histogram and
     * subtracts the values in the corresponding buckets of this histogram.
     */
    ExponentialHistogramAccumulation.prototype._diffBuckets = function (ours, other, theirs, scale) {
        var theirOffset = theirs.offset;
        var theirChange = other.scale - scale;
        for (var i = 0; i < theirs.length; i++) {
            var ourIndex = (theirOffset + i) >> theirChange;
            var bucketIndex = ourIndex - ours.indexBase;
            if (bucketIndex < 0) {
                bucketIndex += ours.backing.length;
            }
            ours.decrementBucket(bucketIndex, theirs.at(i));
        }
        ours.trim();
    };
    return ExponentialHistogramAccumulation;
}());
export { ExponentialHistogramAccumulation };
/**
 * Aggregator for ExponentialHistogramAccumulations
 */
var ExponentialHistogramAggregator = /** @class */ (function () {
    /**
     * @param _maxSize Maximum number of buckets for each of the positive
     *    and negative ranges, exclusive of the zero-bucket.
     * @param _recordMinMax If set to true, min and max will be recorded.
     *    Otherwise, min and max will not be recorded.
     */
    function ExponentialHistogramAggregator(_maxSize, _recordMinMax) {
        this._maxSize = _maxSize;
        this._recordMinMax = _recordMinMax;
        this.kind = AggregatorKind.EXPONENTIAL_HISTOGRAM;
    }
    ExponentialHistogramAggregator.prototype.createAccumulation = function (startTime) {
        return new ExponentialHistogramAccumulation(startTime, this._maxSize, this._recordMinMax);
    };
    /**
     * Return the result of the merge of two exponential histogram accumulations.
     */
    ExponentialHistogramAggregator.prototype.merge = function (previous, delta) {
        var result = delta.clone();
        result.merge(previous);
        return result;
    };
    /**
     * Returns a new DELTA aggregation by comparing two cumulative measurements.
     */
    ExponentialHistogramAggregator.prototype.diff = function (previous, current) {
        var result = current.clone();
        result.diff(previous);
        return result;
    };
    ExponentialHistogramAggregator.prototype.toMetricData = function (descriptor, aggregationTemporality, accumulationByAttributes, endTime) {
        return {
            descriptor: descriptor,
            aggregationTemporality: aggregationTemporality,
            dataPointType: DataPointType.EXPONENTIAL_HISTOGRAM,
            dataPoints: accumulationByAttributes.map(function (_a) {
                var _b = __read(_a, 2), attributes = _b[0], accumulation = _b[1];
                var pointValue = accumulation.toPointValue();
                // determine if instrument allows negative values.
                var allowsNegativeValues = descriptor.type === InstrumentType.GAUGE ||
                    descriptor.type === InstrumentType.UP_DOWN_COUNTER ||
                    descriptor.type === InstrumentType.OBSERVABLE_GAUGE ||
                    descriptor.type === InstrumentType.OBSERVABLE_UP_DOWN_COUNTER;
                return {
                    attributes: attributes,
                    startTime: accumulation.startTime,
                    endTime: endTime,
                    value: {
                        min: pointValue.hasMinMax ? pointValue.min : undefined,
                        max: pointValue.hasMinMax ? pointValue.max : undefined,
                        sum: !allowsNegativeValues ? pointValue.sum : undefined,
                        positive: {
                            offset: pointValue.positive.offset,
                            bucketCounts: pointValue.positive.bucketCounts,
                        },
                        negative: {
                            offset: pointValue.negative.offset,
                            bucketCounts: pointValue.negative.bucketCounts,
                        },
                        count: pointValue.count,
                        scale: pointValue.scale,
                        zeroCount: pointValue.zeroCount,
                    },
                };
            }),
        };
    };
    return ExponentialHistogramAggregator;
}());
export { ExponentialHistogramAggregator };
//# sourceMappingURL=ExponentialHistogram.js.map