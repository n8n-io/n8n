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
var SumAccumulation = /** @class */ (function () {
    function SumAccumulation(startTime, monotonic, _current, reset) {
        if (_current === void 0) { _current = 0; }
        if (reset === void 0) { reset = false; }
        this.startTime = startTime;
        this.monotonic = monotonic;
        this._current = _current;
        this.reset = reset;
    }
    SumAccumulation.prototype.record = function (value) {
        if (this.monotonic && value < 0) {
            return;
        }
        this._current += value;
    };
    SumAccumulation.prototype.setStartTime = function (startTime) {
        this.startTime = startTime;
    };
    SumAccumulation.prototype.toPointValue = function () {
        return this._current;
    };
    return SumAccumulation;
}());
export { SumAccumulation };
/** Basic aggregator which calculates a Sum from individual measurements. */
var SumAggregator = /** @class */ (function () {
    function SumAggregator(monotonic) {
        this.monotonic = monotonic;
        this.kind = AggregatorKind.SUM;
    }
    SumAggregator.prototype.createAccumulation = function (startTime) {
        return new SumAccumulation(startTime, this.monotonic);
    };
    /**
     * Returns the result of the merge of the given accumulations.
     */
    SumAggregator.prototype.merge = function (previous, delta) {
        var prevPv = previous.toPointValue();
        var deltaPv = delta.toPointValue();
        if (delta.reset) {
            return new SumAccumulation(delta.startTime, this.monotonic, deltaPv, delta.reset);
        }
        return new SumAccumulation(previous.startTime, this.monotonic, prevPv + deltaPv);
    };
    /**
     * Returns a new DELTA aggregation by comparing two cumulative measurements.
     */
    SumAggregator.prototype.diff = function (previous, current) {
        var prevPv = previous.toPointValue();
        var currPv = current.toPointValue();
        /**
         * If the SumAggregator is a monotonic one and the previous point value is
         * greater than the current one, a reset is deemed to be happened.
         * Return the current point value to prevent the value from been reset.
         */
        if (this.monotonic && prevPv > currPv) {
            return new SumAccumulation(current.startTime, this.monotonic, currPv, true);
        }
        return new SumAccumulation(current.startTime, this.monotonic, currPv - prevPv);
    };
    SumAggregator.prototype.toMetricData = function (descriptor, aggregationTemporality, accumulationByAttributes, endTime) {
        return {
            descriptor: descriptor,
            aggregationTemporality: aggregationTemporality,
            dataPointType: DataPointType.SUM,
            dataPoints: accumulationByAttributes.map(function (_a) {
                var _b = __read(_a, 2), attributes = _b[0], accumulation = _b[1];
                return {
                    attributes: attributes,
                    startTime: accumulation.startTime,
                    endTime: endTime,
                    value: accumulation.toPointValue(),
                };
            }),
            isMonotonic: this.monotonic,
        };
    };
    return SumAggregator;
}());
export { SumAggregator };
//# sourceMappingURL=Sum.js.map