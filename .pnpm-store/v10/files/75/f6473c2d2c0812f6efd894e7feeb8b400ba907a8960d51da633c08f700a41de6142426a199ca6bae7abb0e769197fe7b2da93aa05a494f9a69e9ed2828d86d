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
import { AttributeHashMap } from './HashMap';
/**
 * Internal interface.
 *
 * Allows synchronous collection of metrics. This processor should allow
 * allocation of new aggregation cells for metrics and convert cumulative
 * recording to delta data points.
 */
var DeltaMetricProcessor = /** @class */ (function () {
    function DeltaMetricProcessor(_aggregator) {
        this._aggregator = _aggregator;
        this._activeCollectionStorage = new AttributeHashMap();
        // TODO: find a reasonable mean to clean the memo;
        // https://github.com/open-telemetry/opentelemetry-specification/pull/2208
        this._cumulativeMemoStorage = new AttributeHashMap();
    }
    DeltaMetricProcessor.prototype.record = function (value, attributes, _context, collectionTime) {
        var _this = this;
        var accumulation = this._activeCollectionStorage.getOrDefault(attributes, function () { return _this._aggregator.createAccumulation(collectionTime); });
        accumulation === null || accumulation === void 0 ? void 0 : accumulation.record(value);
    };
    DeltaMetricProcessor.prototype.batchCumulate = function (measurements, collectionTime) {
        var _this = this;
        Array.from(measurements.entries()).forEach(function (_a) {
            var _b = __read(_a, 3), attributes = _b[0], value = _b[1], hashCode = _b[2];
            var accumulation = _this._aggregator.createAccumulation(collectionTime);
            accumulation === null || accumulation === void 0 ? void 0 : accumulation.record(value);
            var delta = accumulation;
            // Diff with recorded cumulative memo.
            if (_this._cumulativeMemoStorage.has(attributes, hashCode)) {
                // has() returned true, previous is present.
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                var previous = _this._cumulativeMemoStorage.get(attributes, hashCode);
                delta = _this._aggregator.diff(previous, accumulation);
            }
            // Merge with uncollected active delta.
            if (_this._activeCollectionStorage.has(attributes, hashCode)) {
                // has() returned true, previous is present.
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                var active = _this._activeCollectionStorage.get(attributes, hashCode);
                delta = _this._aggregator.merge(active, delta);
            }
            // Save the current record and the delta record.
            _this._cumulativeMemoStorage.set(attributes, accumulation, hashCode);
            _this._activeCollectionStorage.set(attributes, delta, hashCode);
        });
    };
    /**
     * Returns a collection of delta metrics. Start time is the when first
     * time event collected.
     */
    DeltaMetricProcessor.prototype.collect = function () {
        var unreportedDelta = this._activeCollectionStorage;
        this._activeCollectionStorage = new AttributeHashMap();
        return unreportedDelta;
    };
    return DeltaMetricProcessor;
}());
export { DeltaMetricProcessor };
//# sourceMappingURL=DeltaMetricProcessor.js.map