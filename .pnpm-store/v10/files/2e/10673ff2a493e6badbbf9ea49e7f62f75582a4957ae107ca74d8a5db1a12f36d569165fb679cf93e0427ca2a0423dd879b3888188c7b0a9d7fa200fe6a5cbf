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
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
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
import { MetricStorage } from './MetricStorage';
import { DeltaMetricProcessor } from './DeltaMetricProcessor';
import { TemporalMetricProcessor } from './TemporalMetricProcessor';
import { AttributeHashMap } from './HashMap';
/**
 * Internal interface.
 *
 * Stores and aggregates {@link MetricData} for asynchronous instruments.
 */
var AsyncMetricStorage = /** @class */ (function (_super) {
    __extends(AsyncMetricStorage, _super);
    function AsyncMetricStorage(_instrumentDescriptor, aggregator, _attributesProcessor, collectorHandles) {
        var _this = _super.call(this, _instrumentDescriptor) || this;
        _this._attributesProcessor = _attributesProcessor;
        _this._deltaMetricStorage = new DeltaMetricProcessor(aggregator);
        _this._temporalMetricStorage = new TemporalMetricProcessor(aggregator, collectorHandles);
        return _this;
    }
    AsyncMetricStorage.prototype.record = function (measurements, observationTime) {
        var _this = this;
        var processed = new AttributeHashMap();
        Array.from(measurements.entries()).forEach(function (_a) {
            var _b = __read(_a, 2), attributes = _b[0], value = _b[1];
            processed.set(_this._attributesProcessor.process(attributes), value);
        });
        this._deltaMetricStorage.batchCumulate(processed, observationTime);
    };
    /**
     * Collects the metrics from this storage. The ObservableCallback is invoked
     * during the collection.
     *
     * Note: This is a stateful operation and may reset any interval-related
     * state for the MetricCollector.
     */
    AsyncMetricStorage.prototype.collect = function (collector, collectionTime) {
        var accumulations = this._deltaMetricStorage.collect();
        return this._temporalMetricStorage.buildMetrics(collector, this._instrumentDescriptor, accumulations, collectionTime);
    };
    return AsyncMetricStorage;
}(MetricStorage));
export { AsyncMetricStorage };
//# sourceMappingURL=AsyncMetricStorage.js.map