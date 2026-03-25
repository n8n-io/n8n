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
import { AggregatorKind, } from './types';
import { millisToHrTime, hrTimeToMicroseconds } from '@opentelemetry/core';
import { DataPointType } from '../export/MetricData';
export class LastValueAccumulation {
    startTime;
    _current;
    sampleTime;
    constructor(startTime, _current = 0, sampleTime = [0, 0]) {
        this.startTime = startTime;
        this._current = _current;
        this.sampleTime = sampleTime;
    }
    record(value) {
        this._current = value;
        this.sampleTime = millisToHrTime(Date.now());
    }
    setStartTime(startTime) {
        this.startTime = startTime;
    }
    toPointValue() {
        return this._current;
    }
}
/** Basic aggregator which calculates a LastValue from individual measurements. */
export class LastValueAggregator {
    kind = AggregatorKind.LAST_VALUE;
    createAccumulation(startTime) {
        return new LastValueAccumulation(startTime);
    }
    /**
     * Returns the result of the merge of the given accumulations.
     *
     * Return the newly captured (delta) accumulation for LastValueAggregator.
     */
    merge(previous, delta) {
        // nanoseconds may lose precisions.
        const latestAccumulation = hrTimeToMicroseconds(delta.sampleTime) >=
            hrTimeToMicroseconds(previous.sampleTime)
            ? delta
            : previous;
        return new LastValueAccumulation(previous.startTime, latestAccumulation.toPointValue(), latestAccumulation.sampleTime);
    }
    /**
     * Returns a new DELTA aggregation by comparing two cumulative measurements.
     *
     * A delta aggregation is not meaningful to LastValueAggregator, just return
     * the newly captured (delta) accumulation for LastValueAggregator.
     */
    diff(previous, current) {
        // nanoseconds may lose precisions.
        const latestAccumulation = hrTimeToMicroseconds(current.sampleTime) >=
            hrTimeToMicroseconds(previous.sampleTime)
            ? current
            : previous;
        return new LastValueAccumulation(current.startTime, latestAccumulation.toPointValue(), latestAccumulation.sampleTime);
    }
    toMetricData(descriptor, aggregationTemporality, accumulationByAttributes, endTime) {
        return {
            descriptor,
            aggregationTemporality,
            dataPointType: DataPointType.GAUGE,
            dataPoints: accumulationByAttributes.map(([attributes, accumulation]) => {
                return {
                    attributes,
                    startTime: accumulation.startTime,
                    endTime,
                    value: accumulation.toPointValue(),
                };
            }),
        };
    }
}
//# sourceMappingURL=LastValue.js.map