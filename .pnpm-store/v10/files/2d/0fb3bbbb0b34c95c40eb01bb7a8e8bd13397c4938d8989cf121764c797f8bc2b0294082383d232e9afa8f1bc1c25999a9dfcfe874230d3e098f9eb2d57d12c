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
import * as api from '@opentelemetry/api';
import { SumAggregator, DropAggregator, LastValueAggregator, HistogramAggregator, ExponentialHistogramAggregator, } from '../aggregator';
import { InstrumentType } from '../export/MetricData';
/**
 * The default drop aggregation.
 */
class DropAggregation {
    static DEFAULT_INSTANCE = new DropAggregator();
    createAggregator(_instrument) {
        return DropAggregation.DEFAULT_INSTANCE;
    }
}
export { DropAggregation };
/**
 * The default sum aggregation.
 */
class SumAggregation {
    static MONOTONIC_INSTANCE = new SumAggregator(true);
    static NON_MONOTONIC_INSTANCE = new SumAggregator(false);
    createAggregator(instrument) {
        switch (instrument.type) {
            case InstrumentType.COUNTER:
            case InstrumentType.OBSERVABLE_COUNTER:
            case InstrumentType.HISTOGRAM: {
                return SumAggregation.MONOTONIC_INSTANCE;
            }
            default: {
                return SumAggregation.NON_MONOTONIC_INSTANCE;
            }
        }
    }
}
export { SumAggregation };
/**
 * The default last value aggregation.
 */
class LastValueAggregation {
    static DEFAULT_INSTANCE = new LastValueAggregator();
    createAggregator(_instrument) {
        return LastValueAggregation.DEFAULT_INSTANCE;
    }
}
export { LastValueAggregation };
/**
 * The default histogram aggregation.

 */
class HistogramAggregation {
    static DEFAULT_INSTANCE = new HistogramAggregator([0, 5, 10, 25, 50, 75, 100, 250, 500, 750, 1000, 2500, 5000, 7500, 10000], true);
    createAggregator(_instrument) {
        return HistogramAggregation.DEFAULT_INSTANCE;
    }
}
export { HistogramAggregation };
/**
 * The explicit bucket histogram aggregation.
 */
export class ExplicitBucketHistogramAggregation {
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
        return new HistogramAggregator(this._boundaries, this._recordMinMax);
    }
}
export class ExponentialHistogramAggregation {
    _maxSize;
    _recordMinMax;
    constructor(_maxSize = 160, _recordMinMax = true) {
        this._maxSize = _maxSize;
        this._recordMinMax = _recordMinMax;
    }
    createAggregator(_instrument) {
        return new ExponentialHistogramAggregator(this._maxSize, this._recordMinMax);
    }
}
/**
 * The default aggregation.
 */
export class DefaultAggregation {
    _resolve(instrument) {
        // cast to unknown to disable complaints on the (unreachable) fallback.
        switch (instrument.type) {
            case InstrumentType.COUNTER:
            case InstrumentType.UP_DOWN_COUNTER:
            case InstrumentType.OBSERVABLE_COUNTER:
            case InstrumentType.OBSERVABLE_UP_DOWN_COUNTER: {
                return SUM_AGGREGATION;
            }
            case InstrumentType.GAUGE:
            case InstrumentType.OBSERVABLE_GAUGE: {
                return LAST_VALUE_AGGREGATION;
            }
            case InstrumentType.HISTOGRAM: {
                if (instrument.advice.explicitBucketBoundaries) {
                    return new ExplicitBucketHistogramAggregation(instrument.advice.explicitBucketBoundaries);
                }
                return HISTOGRAM_AGGREGATION;
            }
        }
        api.diag.warn(`Unable to recognize instrument type: ${instrument.type}`);
        return DROP_AGGREGATION;
    }
    createAggregator(instrument) {
        return this._resolve(instrument).createAggregator(instrument);
    }
}
export const DROP_AGGREGATION = new DropAggregation();
export const SUM_AGGREGATION = new SumAggregation();
export const LAST_VALUE_AGGREGATION = new LastValueAggregation();
export const HISTOGRAM_AGGREGATION = new HistogramAggregation();
export const EXPONENTIAL_HISTOGRAM_AGGREGATION = new ExponentialHistogramAggregation();
export const DEFAULT_AGGREGATION = new DefaultAggregation();
//# sourceMappingURL=Aggregation.js.map