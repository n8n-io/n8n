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
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
import * as api from '@opentelemetry/api';
import { FlatMap, callWithTimeout } from '../utils';
import { DEFAULT_AGGREGATION_SELECTOR, DEFAULT_AGGREGATION_TEMPORALITY_SELECTOR, } from './AggregationSelector';
/**
 * A registered reader of metrics that, when linked to a {@link MetricProducer}, offers global
 * control over metrics.
 */
var MetricReader = /** @class */ (function () {
    function MetricReader(options) {
        var _a, _b, _c;
        // Tracks the shutdown state.
        // TODO: use BindOncePromise here once a new version of @opentelemetry/core is available.
        this._shutdown = false;
        this._aggregationSelector =
            (_a = options === null || options === void 0 ? void 0 : options.aggregationSelector) !== null && _a !== void 0 ? _a : DEFAULT_AGGREGATION_SELECTOR;
        this._aggregationTemporalitySelector =
            (_b = options === null || options === void 0 ? void 0 : options.aggregationTemporalitySelector) !== null && _b !== void 0 ? _b : DEFAULT_AGGREGATION_TEMPORALITY_SELECTOR;
        this._metricProducers = (_c = options === null || options === void 0 ? void 0 : options.metricProducers) !== null && _c !== void 0 ? _c : [];
    }
    /**
     * Set the {@link MetricProducer} used by this instance. **This should only be called by the
     * SDK and should be considered internal.**
     *
     * To add additional {@link MetricProducer}s to a {@link MetricReader}, pass them to the
     * constructor as {@link MetricReaderOptions.metricProducers}.
     *
     * @internal
     * @param metricProducer
     */
    MetricReader.prototype.setMetricProducer = function (metricProducer) {
        if (this._sdkMetricProducer) {
            throw new Error('MetricReader can not be bound to a MeterProvider again.');
        }
        this._sdkMetricProducer = metricProducer;
        this.onInitialized();
    };
    /**
     * Select the {@link Aggregation} for the given {@link InstrumentType} for this
     * reader.
     */
    MetricReader.prototype.selectAggregation = function (instrumentType) {
        return this._aggregationSelector(instrumentType);
    };
    /**
     * Select the {@link AggregationTemporality} for the given
     * {@link InstrumentType} for this reader.
     */
    MetricReader.prototype.selectAggregationTemporality = function (instrumentType) {
        return this._aggregationTemporalitySelector(instrumentType);
    };
    /**
     * Handle once the SDK has initialized this {@link MetricReader}
     * Overriding this method is optional.
     */
    MetricReader.prototype.onInitialized = function () {
        // Default implementation is empty.
    };
    /**
     * Collect all metrics from the associated {@link MetricProducer}
     */
    MetricReader.prototype.collect = function (options) {
        return __awaiter(this, void 0, void 0, function () {
            var _a, sdkCollectionResults, additionalCollectionResults, errors, resource, scopeMetrics;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        if (this._sdkMetricProducer === undefined) {
                            throw new Error('MetricReader is not bound to a MetricProducer');
                        }
                        // Subsequent invocations to collect are not allowed. SDKs SHOULD return some failure for these calls.
                        if (this._shutdown) {
                            throw new Error('MetricReader is shutdown');
                        }
                        return [4 /*yield*/, Promise.all(__spreadArray([
                                this._sdkMetricProducer.collect({
                                    timeoutMillis: options === null || options === void 0 ? void 0 : options.timeoutMillis,
                                })
                            ], __read(this._metricProducers.map(function (producer) {
                                return producer.collect({
                                    timeoutMillis: options === null || options === void 0 ? void 0 : options.timeoutMillis,
                                });
                            })), false))];
                    case 1:
                        _a = __read.apply(void 0, [_b.sent()]), sdkCollectionResults = _a[0], additionalCollectionResults = _a.slice(1);
                        errors = sdkCollectionResults.errors.concat(FlatMap(additionalCollectionResults, function (result) { return result.errors; }));
                        resource = sdkCollectionResults.resourceMetrics.resource;
                        scopeMetrics = sdkCollectionResults.resourceMetrics.scopeMetrics.concat(FlatMap(additionalCollectionResults, function (result) { return result.resourceMetrics.scopeMetrics; }));
                        return [2 /*return*/, {
                                resourceMetrics: {
                                    resource: resource,
                                    scopeMetrics: scopeMetrics,
                                },
                                errors: errors,
                            }];
                }
            });
        });
    };
    /**
     * Shuts down the metric reader, the promise will reject after the optional timeout or resolve after completion.
     *
     * <p> NOTE: this operation will continue even after the promise rejects due to a timeout.
     * @param options options with timeout.
     */
    MetricReader.prototype.shutdown = function (options) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        // Do not call shutdown again if it has already been called.
                        if (this._shutdown) {
                            api.diag.error('Cannot call shutdown twice.');
                            return [2 /*return*/];
                        }
                        if (!((options === null || options === void 0 ? void 0 : options.timeoutMillis) == null)) return [3 /*break*/, 2];
                        return [4 /*yield*/, this.onShutdown()];
                    case 1:
                        _a.sent();
                        return [3 /*break*/, 4];
                    case 2: return [4 /*yield*/, callWithTimeout(this.onShutdown(), options.timeoutMillis)];
                    case 3:
                        _a.sent();
                        _a.label = 4;
                    case 4:
                        this._shutdown = true;
                        return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Flushes metrics read by this reader, the promise will reject after the optional timeout or resolve after completion.
     *
     * <p> NOTE: this operation will continue even after the promise rejects due to a timeout.
     * @param options options with timeout.
     */
    MetricReader.prototype.forceFlush = function (options) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (this._shutdown) {
                            api.diag.warn('Cannot forceFlush on already shutdown MetricReader.');
                            return [2 /*return*/];
                        }
                        if (!((options === null || options === void 0 ? void 0 : options.timeoutMillis) == null)) return [3 /*break*/, 2];
                        return [4 /*yield*/, this.onForceFlush()];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                    case 2: return [4 /*yield*/, callWithTimeout(this.onForceFlush(), options.timeoutMillis)];
                    case 3:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    return MetricReader;
}());
export { MetricReader };
//# sourceMappingURL=MetricReader.js.map