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
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
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
import { createInstrumentDescriptorWithView, } from '../InstrumentDescriptor';
import { Meter } from '../Meter';
import { isNotNullish } from '../utils';
import { AsyncMetricStorage } from './AsyncMetricStorage';
import { MetricStorageRegistry } from './MetricStorageRegistry';
import { MultiMetricStorage } from './MultiWritableMetricStorage';
import { ObservableRegistry } from './ObservableRegistry';
import { SyncMetricStorage } from './SyncMetricStorage';
import { AttributesProcessor } from '../view/AttributesProcessor';
/**
 * An internal record for shared meter provider states.
 */
var MeterSharedState = /** @class */ (function () {
    function MeterSharedState(_meterProviderSharedState, _instrumentationScope) {
        this._meterProviderSharedState = _meterProviderSharedState;
        this._instrumentationScope = _instrumentationScope;
        this.metricStorageRegistry = new MetricStorageRegistry();
        this.observableRegistry = new ObservableRegistry();
        this.meter = new Meter(this);
    }
    MeterSharedState.prototype.registerMetricStorage = function (descriptor) {
        var storages = this._registerMetricStorage(descriptor, SyncMetricStorage);
        if (storages.length === 1) {
            return storages[0];
        }
        return new MultiMetricStorage(storages);
    };
    MeterSharedState.prototype.registerAsyncMetricStorage = function (descriptor) {
        var storages = this._registerMetricStorage(descriptor, AsyncMetricStorage);
        return storages;
    };
    /**
     * @param collector opaque handle of {@link MetricCollector} which initiated the collection.
     * @param collectionTime the HrTime at which the collection was initiated.
     * @param options options for collection.
     * @returns the list of metric data collected.
     */
    MeterSharedState.prototype.collect = function (collector, collectionTime, options) {
        return __awaiter(this, void 0, void 0, function () {
            var errors, storages, metricDataList;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.observableRegistry.observe(collectionTime, options === null || options === void 0 ? void 0 : options.timeoutMillis)];
                    case 1:
                        errors = _a.sent();
                        storages = this.metricStorageRegistry.getStorages(collector);
                        // prevent more allocations if there are no storages.
                        if (storages.length === 0) {
                            return [2 /*return*/, null];
                        }
                        metricDataList = storages
                            .map(function (metricStorage) {
                            return metricStorage.collect(collector, collectionTime);
                        })
                            .filter(isNotNullish);
                        // skip this scope if no data was collected (storage created, but no data observed)
                        if (metricDataList.length === 0) {
                            return [2 /*return*/, { errors: errors }];
                        }
                        return [2 /*return*/, {
                                scopeMetrics: {
                                    scope: this._instrumentationScope,
                                    metrics: metricDataList,
                                },
                                errors: errors,
                            }];
                }
            });
        });
    };
    MeterSharedState.prototype._registerMetricStorage = function (descriptor, MetricStorageType) {
        var _this = this;
        var views = this._meterProviderSharedState.viewRegistry.findViews(descriptor, this._instrumentationScope);
        var storages = views.map(function (view) {
            var viewDescriptor = createInstrumentDescriptorWithView(view, descriptor);
            var compatibleStorage = _this.metricStorageRegistry.findOrUpdateCompatibleStorage(viewDescriptor);
            if (compatibleStorage != null) {
                return compatibleStorage;
            }
            var aggregator = view.aggregation.createAggregator(viewDescriptor);
            var viewStorage = new MetricStorageType(viewDescriptor, aggregator, view.attributesProcessor, _this._meterProviderSharedState.metricCollectors);
            _this.metricStorageRegistry.register(viewStorage);
            return viewStorage;
        });
        // Fallback to the per-collector aggregations if no view is configured for the instrument.
        if (storages.length === 0) {
            var perCollectorAggregations = this._meterProviderSharedState.selectAggregations(descriptor.type);
            var collectorStorages = perCollectorAggregations.map(function (_a) {
                var _b = __read(_a, 2), collector = _b[0], aggregation = _b[1];
                var compatibleStorage = _this.metricStorageRegistry.findOrUpdateCompatibleCollectorStorage(collector, descriptor);
                if (compatibleStorage != null) {
                    return compatibleStorage;
                }
                var aggregator = aggregation.createAggregator(descriptor);
                var storage = new MetricStorageType(descriptor, aggregator, AttributesProcessor.Noop(), [collector]);
                _this.metricStorageRegistry.registerForCollector(collector, storage);
                return storage;
            });
            storages = storages.concat(collectorStorages);
        }
        return storages;
    };
    return MeterSharedState;
}());
export { MeterSharedState };
//# sourceMappingURL=MeterSharedState.js.map