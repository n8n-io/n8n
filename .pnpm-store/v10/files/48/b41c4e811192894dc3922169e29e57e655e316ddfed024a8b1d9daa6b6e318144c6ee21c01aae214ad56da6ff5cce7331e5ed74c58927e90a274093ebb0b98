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
import { InstrumentType } from '../InstrumentDescriptor';
import { binarySearchUB } from '../utils';
function createNewEmptyCheckpoint(boundaries) {
    var counts = boundaries.map(function () { return 0; });
    counts.push(0);
    return {
        buckets: {
            boundaries: boundaries,
            counts: counts,
        },
        sum: 0,
        count: 0,
        hasMinMax: false,
        min: Infinity,
        max: -Infinity,
    };
}
var HistogramAccumulation = /** @class */ (function () {
    function HistogramAccumulation(startTime, _boundaries, _recordMinMax, _current) {
        if (_recordMinMax === void 0) { _recordMinMax = true; }
        if (_current === void 0) { _current = createNewEmptyCheckpoint(_boundaries); }
        this.startTime = startTime;
        this._boundaries = _boundaries;
        this._recordMinMax = _recordMinMax;
        this._current = _current;
    }
    HistogramAccumulation.prototype.record = function (value) {
        // NaN does not fall into any bucket, is not zero and should not be counted,
        // NaN is never greater than max nor less than min, therefore return as there's nothing for us to do.
        if (Number.isNaN(value)) {
            return;
        }
        this._current.count += 1;
        this._current.sum += value;
        if (this._recordMinMax) {
            this._current.min = Math.min(value, this._current.min);
            this._current.max = Math.max(value, this._current.max);
            this._current.hasMinMax = true;
        }
        var idx = binarySearchUB(this._boundaries, value);
        this._current.buckets.counts[idx] += 1;
    };
    HistogramAccumulation.prototype.setStartTime = function (startTime) {
        this.startTime = startTime;
    };
    HistogramAccumulation.prototype.toPointValue = function () {
        return this._current;
    };
    return HistogramAccumulation;
}());
export { HistogramAccumulation };
/**
 * Basic aggregator which observes events and counts them in pre-defined buckets
 * and provides the total sum and count of all observations.
 */
var HistogramAggregator = /** @class */ (function () {
    /**
     * @param _boundaries sorted upper bounds of recorded values.
     * @param _recordMinMax If set to true, min and max will be recorded. Otherwise, min and max will not be recorded.
     */
    function HistogramAggregator(_boundaries, _recordMinMax) {
        this._boundaries = _boundaries;
        this._recordMinMax = _recordMinMax;
        this.kind = AggregatorKind.HISTOGRAM;
    }
    HistogramAggregator.prototype.createAccumulation = function (startTime) {
        return new HistogramAccumulation(startTime, this._boundaries, this._recordMinMax);
    };
    /**
     * Return the result of the merge of two histogram accumulations. As long as one Aggregator
     * instance produces all Accumulations with constant boundaries we don't need to worry about
     * merging accumulations with different boundaries.
     */
    HistogramAggregator.prototype.merge = function (previous, delta) {
        var previousValue = previous.toPointValue();
        var deltaValue = delta.toPointValue();
        var previousCounts = previousValue.buckets.counts;
        var deltaCounts = deltaValue.buckets.counts;
        var mergedCounts = new Array(previousCounts.length);
        for (var idx = 0; idx < previousCounts.length; idx++) {
            mergedCounts[idx] = previousCounts[idx] + deltaCounts[idx];
        }
        var min = Infinity;
        var max = -Infinity;
        if (this._recordMinMax) {
            if (previousValue.hasMinMax && deltaValue.hasMinMax) {
                min = Math.min(previousValue.min, deltaValue.min);
                max = Math.max(previousValue.max, deltaValue.max);
            }
            else if (previousValue.hasMinMax) {
                min = previousValue.min;
                max = previousValue.max;
            }
            else if (deltaValue.hasMinMax) {
                min = deltaValue.min;
                max = deltaValue.max;
            }
        }
        return new HistogramAccumulation(previous.startTime, previousValue.buckets.boundaries, this._recordMinMax, {
            buckets: {
                boundaries: previousValue.buckets.boundaries,
                counts: mergedCounts,
            },
            count: previousValue.count + deltaValue.count,
            sum: previousValue.sum + deltaValue.sum,
            hasMinMax: this._recordMinMax &&
                (previousValue.hasMinMax || deltaValue.hasMinMax),
            min: min,
            max: max,
        });
    };
    /**
     * Returns a new DELTA aggregation by comparing two cumulative measurements.
     */
    HistogramAggregator.prototype.diff = function (previous, current) {
        var previousValue = previous.toPointValue();
        var currentValue = current.toPointValue();
        var previousCounts = previousValue.buckets.counts;
        var currentCounts = currentValue.buckets.counts;
        var diffedCounts = new Array(previousCounts.length);
        for (var idx = 0; idx < previousCounts.length; idx++) {
            diffedCounts[idx] = currentCounts[idx] - previousCounts[idx];
        }
        return new HistogramAccumulation(current.startTime, previousValue.buckets.boundaries, this._recordMinMax, {
            buckets: {
                boundaries: previousValue.buckets.boundaries,
                counts: diffedCounts,
            },
            count: currentValue.count - previousValue.count,
            sum: currentValue.sum - previousValue.sum,
            hasMinMax: false,
            min: Infinity,
            max: -Infinity,
        });
    };
    HistogramAggregator.prototype.toMetricData = function (descriptor, aggregationTemporality, accumulationByAttributes, endTime) {
        return {
            descriptor: descriptor,
            aggregationTemporality: aggregationTemporality,
            dataPointType: DataPointType.HISTOGRAM,
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
                        buckets: pointValue.buckets,
                        count: pointValue.count,
                    },
                };
            }),
        };
    };
    return HistogramAggregator;
}());
export { HistogramAggregator };
//# sourceMappingURL=Histogram.js.map