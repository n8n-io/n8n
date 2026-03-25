"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.toAggregation = exports.AggregationType = void 0;
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
const Aggregation_1 = require("./Aggregation");
var AggregationType;
(function (AggregationType) {
    AggregationType[AggregationType["DEFAULT"] = 0] = "DEFAULT";
    AggregationType[AggregationType["DROP"] = 1] = "DROP";
    AggregationType[AggregationType["SUM"] = 2] = "SUM";
    AggregationType[AggregationType["LAST_VALUE"] = 3] = "LAST_VALUE";
    AggregationType[AggregationType["EXPLICIT_BUCKET_HISTOGRAM"] = 4] = "EXPLICIT_BUCKET_HISTOGRAM";
    AggregationType[AggregationType["EXPONENTIAL_HISTOGRAM"] = 5] = "EXPONENTIAL_HISTOGRAM";
})(AggregationType = exports.AggregationType || (exports.AggregationType = {}));
function toAggregation(option) {
    switch (option.type) {
        case AggregationType.DEFAULT:
            return Aggregation_1.DEFAULT_AGGREGATION;
        case AggregationType.DROP:
            return Aggregation_1.DROP_AGGREGATION;
        case AggregationType.SUM:
            return Aggregation_1.SUM_AGGREGATION;
        case AggregationType.LAST_VALUE:
            return Aggregation_1.LAST_VALUE_AGGREGATION;
        case AggregationType.EXPONENTIAL_HISTOGRAM: {
            const expOption = option;
            return new Aggregation_1.ExponentialHistogramAggregation(expOption.options?.maxSize, expOption.options?.recordMinMax);
        }
        case AggregationType.EXPLICIT_BUCKET_HISTOGRAM: {
            const expOption = option;
            if (expOption.options == null) {
                return Aggregation_1.HISTOGRAM_AGGREGATION;
            }
            else {
                return new Aggregation_1.ExplicitBucketHistogramAggregation(expOption.options?.boundaries, expOption.options?.recordMinMax);
            }
        }
        default:
            throw new Error('Unsupported Aggregation');
    }
}
exports.toAggregation = toAggregation;
//# sourceMappingURL=AggregationOption.js.map