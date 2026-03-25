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
exports.SumAggregator = exports.SumAccumulation = void 0;
const types_1 = require("./types");
const MetricData_1 = require("../export/MetricData");
class SumAccumulation {
    startTime;
    monotonic;
    _current;
    reset;
    constructor(startTime, monotonic, _current = 0, reset = false) {
        this.startTime = startTime;
        this.monotonic = monotonic;
        this._current = _current;
        this.reset = reset;
    }
    record(value) {
        if (this.monotonic && value < 0) {
            return;
        }
        this._current += value;
    }
    setStartTime(startTime) {
        this.startTime = startTime;
    }
    toPointValue() {
        return this._current;
    }
}
exports.SumAccumulation = SumAccumulation;
/** Basic aggregator which calculates a Sum from individual measurements. */
class SumAggregator {
    monotonic;
    kind = types_1.AggregatorKind.SUM;
    constructor(monotonic) {
        this.monotonic = monotonic;
    }
    createAccumulation(startTime) {
        return new SumAccumulation(startTime, this.monotonic);
    }
    /**
     * Returns the result of the merge of the given accumulations.
     */
    merge(previous, delta) {
        const prevPv = previous.toPointValue();
        const deltaPv = delta.toPointValue();
        if (delta.reset) {
            return new SumAccumulation(delta.startTime, this.monotonic, deltaPv, delta.reset);
        }
        return new SumAccumulation(previous.startTime, this.monotonic, prevPv + deltaPv);
    }
    /**
     * Returns a new DELTA aggregation by comparing two cumulative measurements.
     */
    diff(previous, current) {
        const prevPv = previous.toPointValue();
        const currPv = current.toPointValue();
        /**
         * If the SumAggregator is a monotonic one and the previous point value is
         * greater than the current one, a reset is deemed to be happened.
         * Return the current point value to prevent the value from been reset.
         */
        if (this.monotonic && prevPv > currPv) {
            return new SumAccumulation(current.startTime, this.monotonic, currPv, true);
        }
        return new SumAccumulation(current.startTime, this.monotonic, currPv - prevPv);
    }
    toMetricData(descriptor, aggregationTemporality, accumulationByAttributes, endTime) {
        return {
            descriptor,
            aggregationTemporality,
            dataPointType: MetricData_1.DataPointType.SUM,
            dataPoints: accumulationByAttributes.map(([attributes, accumulation]) => {
                return {
                    attributes,
                    startTime: accumulation.startTime,
                    endTime,
                    value: accumulation.toPointValue(),
                };
            }),
            isMonotonic: this.monotonic,
        };
    }
}
exports.SumAggregator = SumAggregator;
//# sourceMappingURL=Sum.js.map