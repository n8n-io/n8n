/*
 * Copyright The OpenTelemetry Authors
 * SPDX-License-Identifier: Apache-2.0
 */
import { DEFAULT_AGGREGATION, DROP_AGGREGATION, ExplicitBucketHistogramAggregation, ExponentialHistogramAggregation, HISTOGRAM_AGGREGATION, LAST_VALUE_AGGREGATION, SUM_AGGREGATION, } from './Aggregation';
export var AggregationType;
(function (AggregationType) {
    AggregationType[AggregationType["DEFAULT"] = 0] = "DEFAULT";
    AggregationType[AggregationType["DROP"] = 1] = "DROP";
    AggregationType[AggregationType["SUM"] = 2] = "SUM";
    AggregationType[AggregationType["LAST_VALUE"] = 3] = "LAST_VALUE";
    AggregationType[AggregationType["EXPLICIT_BUCKET_HISTOGRAM"] = 4] = "EXPLICIT_BUCKET_HISTOGRAM";
    AggregationType[AggregationType["EXPONENTIAL_HISTOGRAM"] = 5] = "EXPONENTIAL_HISTOGRAM";
})(AggregationType || (AggregationType = {}));
export function toAggregation(option) {
    switch (option.type) {
        case AggregationType.DEFAULT:
            return DEFAULT_AGGREGATION;
        case AggregationType.DROP:
            return DROP_AGGREGATION;
        case AggregationType.SUM:
            return SUM_AGGREGATION;
        case AggregationType.LAST_VALUE:
            return LAST_VALUE_AGGREGATION;
        case AggregationType.EXPONENTIAL_HISTOGRAM: {
            const expOption = option;
            return new ExponentialHistogramAggregation(expOption.options?.maxSize, expOption.options?.recordMinMax);
        }
        case AggregationType.EXPLICIT_BUCKET_HISTOGRAM: {
            const expOption = option;
            if (expOption.options == null) {
                return HISTOGRAM_AGGREGATION;
            }
            else {
                return new ExplicitBucketHistogramAggregation(expOption.options?.boundaries, expOption.options?.recordMinMax);
            }
        }
        default:
            throw new Error('Unsupported Aggregation');
    }
}
//# sourceMappingURL=AggregationOption.js.map