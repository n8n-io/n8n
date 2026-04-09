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
var __values = (this && this.__values) || function(o) {
    var s = typeof Symbol === "function" && Symbol.iterator, m = s && o[s], i = 0;
    if (m) return m.call(o);
    if (o && typeof o.length === "number") return {
        next: function () {
            if (o && i >= o.length) o = void 0;
            return { value: o && o[i++], done: !o };
        }
    };
    throw new TypeError(s ? "Object is not iterable." : "Symbol.iterator is not defined.");
};
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
import { AggregationTemporality } from '../export/AggregationTemporality';
import { AttributeHashMap } from './HashMap';
/**
 * Internal interface.
 *
 * Provides unique reporting for each collector. Allows synchronous collection
 * of metrics and reports given temporality values.
 */
var TemporalMetricProcessor = /** @class */ (function () {
    function TemporalMetricProcessor(_aggregator, collectorHandles) {
        var _this = this;
        this._aggregator = _aggregator;
        this._unreportedAccumulations = new Map();
        this._reportHistory = new Map();
        collectorHandles.forEach(function (handle) {
            _this._unreportedAccumulations.set(handle, []);
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
    TemporalMetricProcessor.prototype.buildMetrics = function (collector, instrumentDescriptor, currentAccumulations, collectionTime) {
        this._stashAccumulations(currentAccumulations);
        var unreportedAccumulations = this._getMergedUnreportedAccumulations(collector);
        var result = unreportedAccumulations;
        var aggregationTemporality;
        // Check our last report time.
        if (this._reportHistory.has(collector)) {
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            var last = this._reportHistory.get(collector);
            var lastCollectionTime = last.collectionTime;
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
            if (aggregationTemporality === AggregationTemporality.CUMULATIVE) {
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
            collectionTime: collectionTime,
            aggregationTemporality: aggregationTemporality,
        });
        var accumulationRecords = AttributesMapToAccumulationRecords(result);
        // do not convert to metric data if there is nothing to convert.
        if (accumulationRecords.length === 0) {
            return undefined;
        }
        return this._aggregator.toMetricData(instrumentDescriptor, aggregationTemporality, accumulationRecords, 
        /* endTime */ collectionTime);
    };
    TemporalMetricProcessor.prototype._stashAccumulations = function (currentAccumulation) {
        var e_1, _a;
        var registeredCollectors = this._unreportedAccumulations.keys();
        try {
            for (var registeredCollectors_1 = __values(registeredCollectors), registeredCollectors_1_1 = registeredCollectors_1.next(); !registeredCollectors_1_1.done; registeredCollectors_1_1 = registeredCollectors_1.next()) {
                var collector = registeredCollectors_1_1.value;
                var stash = this._unreportedAccumulations.get(collector);
                if (stash === undefined) {
                    stash = [];
                    this._unreportedAccumulations.set(collector, stash);
                }
                stash.push(currentAccumulation);
            }
        }
        catch (e_1_1) { e_1 = { error: e_1_1 }; }
        finally {
            try {
                if (registeredCollectors_1_1 && !registeredCollectors_1_1.done && (_a = registeredCollectors_1.return)) _a.call(registeredCollectors_1);
            }
            finally { if (e_1) throw e_1.error; }
        }
    };
    TemporalMetricProcessor.prototype._getMergedUnreportedAccumulations = function (collector) {
        var e_2, _a;
        var result = new AttributeHashMap();
        var unreportedList = this._unreportedAccumulations.get(collector);
        this._unreportedAccumulations.set(collector, []);
        if (unreportedList === undefined) {
            return result;
        }
        try {
            for (var unreportedList_1 = __values(unreportedList), unreportedList_1_1 = unreportedList_1.next(); !unreportedList_1_1.done; unreportedList_1_1 = unreportedList_1.next()) {
                var it_1 = unreportedList_1_1.value;
                result = TemporalMetricProcessor.merge(result, it_1, this._aggregator);
            }
        }
        catch (e_2_1) { e_2 = { error: e_2_1 }; }
        finally {
            try {
                if (unreportedList_1_1 && !unreportedList_1_1.done && (_a = unreportedList_1.return)) _a.call(unreportedList_1);
            }
            finally { if (e_2) throw e_2.error; }
        }
        return result;
    };
    TemporalMetricProcessor.merge = function (last, current, aggregator) {
        var result = last;
        var iterator = current.entries();
        var next = iterator.next();
        while (next.done !== true) {
            var _a = __read(next.value, 3), key = _a[0], record = _a[1], hash = _a[2];
            if (last.has(key, hash)) {
                var lastAccumulation = last.get(key, hash);
                // last.has() returned true, lastAccumulation is present.
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                var accumulation = aggregator.merge(lastAccumulation, record);
                result.set(key, accumulation, hash);
            }
            else {
                result.set(key, record, hash);
            }
            next = iterator.next();
        }
        return result;
    };
    /**
     * Calibrate the reported metric streams' startTime to lastCollectionTime. Leaves
     * the new stream to be the initial observation time unchanged.
     */
    TemporalMetricProcessor.calibrateStartTime = function (last, current, lastCollectionTime) {
        var e_3, _a;
        try {
            for (var _b = __values(last.keys()), _c = _b.next(); !_c.done; _c = _b.next()) {
                var _d = __read(_c.value, 2), key = _d[0], hash = _d[1];
                var currentAccumulation = current.get(key, hash);
                currentAccumulation === null || currentAccumulation === void 0 ? void 0 : currentAccumulation.setStartTime(lastCollectionTime);
            }
        }
        catch (e_3_1) { e_3 = { error: e_3_1 }; }
        finally {
            try {
                if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
            }
            finally { if (e_3) throw e_3.error; }
        }
        return current;
    };
    return TemporalMetricProcessor;
}());
export { TemporalMetricProcessor };
// TypeScript complains about converting 3 elements tuple to AccumulationRecord<T>.
function AttributesMapToAccumulationRecords(map) {
    return Array.from(map.entries());
}
//# sourceMappingURL=TemporalMetricProcessor.js.map