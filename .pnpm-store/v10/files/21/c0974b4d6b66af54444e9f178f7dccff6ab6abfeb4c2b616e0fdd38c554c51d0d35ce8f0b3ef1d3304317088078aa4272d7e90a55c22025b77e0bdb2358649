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
exports.TemporalMetricProcessor = void 0;
const AggregationTemporality_1 = require("../export/AggregationTemporality");
const HashMap_1 = require("./HashMap");
/**
 * Internal interface.
 *
 * Provides unique reporting for each collector. Allows synchronous collection
 * of metrics and reports given temporality values.
 */
class TemporalMetricProcessor {
    _aggregator;
    _unreportedAccumulations = new Map();
    _reportHistory = new Map();
    constructor(_aggregator, collectorHandles) {
        this._aggregator = _aggregator;
        collectorHandles.forEach(handle => {
            this._unreportedAccumulations.set(handle, []);
        });
    }
    /**
     * Builds the {@link MetricData} streams to report against a specific MetricCollector.
     * @param collector The information of the MetricCollector.
     * @param collectors The registered collectors.
     * @param instrumentDescriptor The instrumentation descriptor that these metrics generated with.
     * @param currentAccumulations The current accumulation of metric data from instruments.
     * @param collectionTime The current collection timestamp.
     * @returns The {@link MetricData} points or `null`.
     */
    buildMetrics(collector, instrumentDescriptor, currentAccumulations, collectionTime) {
        this._stashAccumulations(currentAccumulations);
        const unreportedAccumulations = this._getMergedUnreportedAccumulations(collector);
        let result = unreportedAccumulations;
        let aggregationTemporality;
        // Check our last report time.
        if (this._reportHistory.has(collector)) {
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            const last = this._reportHistory.get(collector);
            const lastCollectionTime = last.collectionTime;
            aggregationTemporality = last.aggregationTemporality;
            // Use aggregation temporality + instrument to determine if we do a merge or a diff of
            // previous. We have the following four scenarios:
            // 1. Cumulative Aggregation (temporality) + Delta recording (sync instrument).
            //    Here we merge with our last record to get a cumulative aggregation.
            // 2. Cumulative Aggregation + Cumulative recording (async instrument).
            //    Cumulative records are converted to delta recording with DeltaMetricProcessor.
            //    Here we merge with our last record to get a cumulative aggregation.
            // 3. Delta Aggregation + Delta recording
            //    Calibrate the startTime of metric streams to be the reader's lastCollectionTime.
            // 4. Delta Aggregation + Cumulative recording.
            //    Cumulative records are converted to delta recording with DeltaMetricProcessor.
            //    Calibrate the startTime of metric streams to be the reader's lastCollectionTime.
            if (aggregationTemporality === AggregationTemporality_1.AggregationTemporality.CUMULATIVE) {
                // We need to make sure the current delta recording gets merged into the previous cumulative
                // for the next cumulative recording.
                result = TemporalMetricProcessor.merge(last.accumulations, unreportedAccumulations, this._aggregator);
            }
            else {
                result = TemporalMetricProcessor.calibrateStartTime(last.accumulations, unreportedAccumulations, lastCollectionTime);
            }
        }
        else {
            // Call into user code to select aggregation temporality for the instrument.
            aggregationTemporality = collector.selectAggregationTemporality(instrumentDescriptor.type);
        }
        // Update last reported (cumulative) accumulation.
        this._reportHistory.set(collector, {
            accumulations: result,
            collectionTime,
            aggregationTemporality,
        });
        const accumulationRecords = AttributesMapToAccumulationRecords(result);
        // do not convert to metric data if there is nothing to convert.
        if (accumulationRecords.length === 0) {
            return undefined;
        }
        return this._aggregator.toMetricData(instrumentDescriptor, aggregationTemporality, accumulationRecords, 
        /* endTime */ collectionTime);
    }
    _stashAccumulations(currentAccumulation) {
        const registeredCollectors = this._unreportedAccumulations.keys();
        for (const collector of registeredCollectors) {
            let stash = this._unreportedAccumulations.get(collector);
            if (stash === undefined) {
                stash = [];
                this._unreportedAccumulations.set(collector, stash);
            }
            stash.push(currentAccumulation);
        }
    }
    _getMergedUnreportedAccumulations(collector) {
        let result = new HashMap_1.AttributeHashMap();
        const unreportedList = this._unreportedAccumulations.get(collector);
        this._unreportedAccumulations.set(collector, []);
        if (unreportedList === undefined) {
            return result;
        }
        for (const it of unreportedList) {
            result = TemporalMetricProcessor.merge(result, it, this._aggregator);
        }
        return result;
    }
    static merge(last, current, aggregator) {
        const result = last;
        const iterator = current.entries();
        let next = iterator.next();
        while (next.done !== true) {
            const [key, record, hash] = next.value;
            if (last.has(key, hash)) {
                const lastAccumulation = last.get(key, hash);
                // last.has() returned true, lastAccumulation is present.
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                const accumulation = aggregator.merge(lastAccumulation, record);
                result.set(key, accumulation, hash);
            }
            else {
                result.set(key, record, hash);
            }
            next = iterator.next();
        }
        return result;
    }
    /**
     * Calibrate the reported metric streams' startTime to lastCollectionTime. Leaves
     * the new stream to be the initial observation time unchanged.
     */
    static calibrateStartTime(last, current, lastCollectionTime) {
        for (const [key, hash] of last.keys()) {
            const currentAccumulation = current.get(key, hash);
            currentAccumulation?.setStartTime(lastCollectionTime);
        }
        return current;
    }
}
exports.TemporalMetricProcessor = TemporalMetricProcessor;
// TypeScript complains about converting 3 elements tuple to AccumulationRecord<T>.
function AttributesMapToAccumulationRecords(map) {
    return Array.from(map.entries());
}
//# sourceMappingURL=TemporalMetricProcessor.js.map