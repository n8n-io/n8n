"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_AGGREGATION = exports.EXPONENTIAL_HISTOGRAM_AGGREGATION = exports.HISTOGRAM_AGGREGATION = exports.LAST_VALUE_AGGREGATION = exports.SUM_AGGREGATION = exports.DROP_AGGREGATION = exports.DefaultAggregation = exports.ExponentialHistogramAggregation = exports.ExplicitBucketHistogramAggregation = exports.HistogramAggregation = exports.LastValueAggregation = exports.SumAggregation = exports.DropAggregation = void 0;
const api = require("@opentelemetry/api");
const aggregator_1 = require("../aggregator");
const MetricData_1 = require("../export/MetricData");
/**
 * The default drop aggregation.
 */
class DropAggregation {
    static DEFAULT_INSTANCE = new aggregator_1.DropAggregator();
    createAggregator(_instrument) {
        return DropAggregation.DEFAULT_INSTANCE;
    }
}
exports.DropAggregation = DropAggregation;
/**
 * The default sum aggregation.
 */
class SumAggregation {
    static MONOTONIC_INSTANCE = new aggregator_1.SumAggregator(true);
    static NON_MONOTONIC_INSTANCE = new aggregator_1.SumAggregator(false);
    createAggregator(instrument) {
        switch (instrument.type) {
            case MetricData_1.InstrumentType.COUNTER:
            case MetricData_1.InstrumentType.OBSERVABLE_COUNTER:
            case MetricData_1.InstrumentType.HISTOGRAM: {
                return SumAggregation.MONOTONIC_INSTANCE;
            }
            default: {
                return SumAggregation.NON_MONOTONIC_INSTANCE;
            }
        }
    }
}
exports.SumAggregation = SumAggregation;
/**
 * The default last value aggregation.
 */
class LastValueAggregation {
    static DEFAULT_INSTANCE = new aggregator_1.LastValueAggregator();
    createAggregator(_instrument) {
        return LastValueAggregation.DEFAULT_INSTANCE;
    }
}
exports.LastValueAggregation = LastValueAggregation;
/**
 * The default histogram aggregation.

 */
class HistogramAggregation {
    static DEFAULT_INSTANCE = new aggregator_1.HistogramAggregator([0, 5, 10, 25, 50, 75, 100, 250, 500, 750, 1000, 2500, 5000, 7500, 10000], true);
    createAggregator(_instrument) {
        return HistogramAggregation.DEFAULT_INSTANCE;
    }
}
exports.HistogramAggregation = HistogramAggregation;
/**
 * The explicit bucket histogram aggregation.
 */
class ExplicitBucketHistogramAggregation {
    _recordMinMax;
    _boundaries;
    /**
     * @param boundaries the bucket boundaries of the histogram aggregation
     * @param _recordMinMax If set to true, min and max will be recorded. Otherwise, min and max will not be recorded.
     */
    constructor(boundaries, _recordMinMax = true) {
        this._recordMinMax = _recordMinMax;
        if (boundaries == null) {
            throw new Error('ExplicitBucketHistogramAggregation should be created with explicit boundaries, if a single bucket histogram is required, please pass an empty array');
        }
        // Copy the boundaries array for modification.
        boundaries = boundaries.concat();
        // We need to an ordered set to be able to correctly compute count for each
        // boundary since we'll iterate on each in order.
        boundaries = boundaries.sort((a, b) => a - b);
        // Remove all Infinity from the boundaries.
        const minusInfinityIndex = boundaries.lastIndexOf(-Infinity);
        let infinityIndex = boundaries.indexOf(Infinity);
        if (infinityIndex === -1) {
            infinityIndex = undefined;
        }
        this._boundaries = boundaries.slice(minusInfinityIndex + 1, infinityIndex);
    }
    createAggregator(_instrument) {
        return new aggregator_1.HistogramAggregator(this._boundaries, this._recordMinMax);
    }
}
exports.ExplicitBucketHistogramAggregation = ExplicitBucketHistogramAggregation;
class ExponentialHistogramAggregation {
    _maxSize;
    _recordMinMax;
    constructor(_maxSize = 160, _recordMinMax = true) {
        this._maxSize = _maxSize;
        this._recordMinMax = _recordMinMax;
    }
    createAggregator(_instrument) {
        return new aggregator_1.ExponentialHistogramAggregator(this._maxSize, this._recordMinMax);
    }
}
exports.ExponentialHistogramAggregation = ExponentialHistogramAggregation;
/**
 * The default aggregation.
 */
class DefaultAggregation {
    _resolve(instrument) {
        // cast to unknown to disable complaints on the (unreachable) fallback.
        switch (instrument.type) {
            case MetricData_1.InstrumentType.COUNTER:
            case MetricData_1.InstrumentType.UP_DOWN_COUNTER:
            case MetricData_1.InstrumentType.OBSERVABLE_COUNTER:
            case MetricData_1.InstrumentType.OBSERVABLE_UP_DOWN_COUNTER: {
                return exports.SUM_AGGREGATION;
            }
            case MetricData_1.InstrumentType.GAUGE:
            case MetricData_1.InstrumentType.OBSERVABLE_GAUGE: {
                return exports.LAST_VALUE_AGGREGATION;
            }
            case MetricData_1.InstrumentType.HISTOGRAM: {
                if (instrument.advice.explicitBucketBoundaries) {
                    return new ExplicitBucketHistogramAggregation(instrument.advice.explicitBucketBoundaries);
                }
                return exports.HISTOGRAM_AGGREGATION;
            }
        }
        api.diag.warn(`Unable to recognize instrument type: ${instrument.type}`);
        return exports.DROP_AGGREGATION;
    }
    createAggregator(instrument) {
        return this._resolve(instrument).createAggregator(instrument);
    }
}
exports.DefaultAggregation = DefaultAggregation;
exports.DROP_AGGREGATION = new DropAggregation();
exports.SUM_AGGREGATION = new SumAggregation();
exports.LAST_VALUE_AGGREGATION = new LastValueAggregation();
exports.HISTOGRAM_AGGREGATION = new HistogramAggregation();
exports.EXPONENTIAL_HISTOGRAM_AGGREGATION = new ExponentialHistogramAggregation();
exports.DEFAULT_AGGREGATION = new DefaultAggregation();
//# sourceMappingURL=Aggregation.js.map