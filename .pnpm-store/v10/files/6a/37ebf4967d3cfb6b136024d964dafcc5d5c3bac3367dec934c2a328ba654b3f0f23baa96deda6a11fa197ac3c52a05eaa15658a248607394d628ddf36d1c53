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