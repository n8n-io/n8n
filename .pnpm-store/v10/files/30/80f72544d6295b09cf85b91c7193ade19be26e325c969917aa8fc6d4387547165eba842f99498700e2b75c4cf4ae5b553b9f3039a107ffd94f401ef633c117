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
import { internal, ExportResultCode, globalErrorHandler, unrefTimer, } from '@opentelemetry/core';
import { MetricReader } from './MetricReader';
import { callWithTimeout, TimeoutError } from '../utils';
import { diag } from '@opentelemetry/api';
/**
 * {@link MetricReader} which collects metrics based on a user-configurable time interval, and passes the metrics to
 * the configured {@link PushMetricExporter}
 */
var PeriodicExportingMetricReader = /** @class */ (function (_super) {
    __extends(PeriodicExportingMetricReader, _super);
    function PeriodicExportingMetricReader(options) {
        var _a, _b, _c, _d;
        var _this = _super.call(this, {
            aggregationSelector: (_a = options.exporter.selectAggregation) === null || _a === void 0 ? void 0 : _a.bind(options.exporter),
            aggregationTemporalitySelector: (_b = options.exporter.selectAggregationTemporality) === null || _b === void 0 ? void 0 : _b.bind(options.exporter),
            metricProducers: options.metricProducers,
        }) || this;
        if (options.exportIntervalMillis !== undefined &&
            options.exportIntervalMillis <= 0) {
            throw Error('exportIntervalMillis must be greater than 0');
        }
        if (options.exportTimeoutMillis !== undefined &&
            options.exportTimeoutMillis <= 0) {
            throw Error('exportTimeoutMillis must be greater than 0');
        }
        if (options.exportTimeoutMillis !== undefined &&
            options.exportIntervalMillis !== undefined &&
            options.exportIntervalMillis < options.exportTimeoutMillis) {
            throw Error('exportIntervalMillis must be greater than or equal to exportTimeoutMillis');
        }
        _this._exportInterval = (_c = options.exportIntervalMillis) !== null && _c !== void 0 ? _c : 60000;
        _this._exportTimeout = (_d = options.exportTimeoutMillis) !== null && _d !== void 0 ? _d : 30000;
        _this._exporter = options.exporter;
        return _this;
    }
    PeriodicExportingMetricReader.prototype._runOnce = function () {
        return __awaiter(this, void 0, void 0, function () {
            var err_1;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        return [4 /*yield*/, callWithTimeout(this._doRun(), this._exportTimeout)];
                    case 1:
                        _a.sent();
                        return [3 /*break*/, 3];
                    case 2:
                        err_1 = _a.sent();
                        if (err_1 instanceof TimeoutError) {
                            api.diag.error('Export took longer than %s milliseconds and timed out.', this._exportTimeout);
                            return [2 /*return*/];
                        }
                        globalErrorHandler(err_1);
                        return [3 /*break*/, 3];
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    PeriodicExportingMetricReader.prototype._doRun = function () {
        var _a, _b;
        return __awaiter(this, void 0, void 0, function () {
            var _c, resourceMetrics, errors, doExport;
            var _d;
            var _this = this;
            return __generator(this, function (_e) {
                switch (_e.label) {
                    case 0: return [4 /*yield*/, this.collect({
                            timeoutMillis: this._exportTimeout,
                        })];
                    case 1:
                        _c = _e.sent(), resourceMetrics = _c.resourceMetrics, errors = _c.errors;
                        if (errors.length > 0) {
                            (_d = api.diag).error.apply(_d, __spreadArray(['PeriodicExportingMetricReader: metrics collection errors'], __read(errors), false));
                        }
                        doExport = function () { return __awaiter(_this, void 0, void 0, function () {
                            var result;
                            return __generator(this, function (_a) {
                                switch (_a.label) {
                                    case 0: return [4 /*yield*/, internal._export(this._exporter, resourceMetrics)];
                                    case 1:
                                        result = _a.sent();
                                        if (result.code !== ExportResultCode.SUCCESS) {
                                            throw new Error("PeriodicExportingMetricReader: metrics export failed (error " + result.error + ")");
                                        }
                                        return [2 /*return*/];
                                }
                            });
                        }); };
                        if (!resourceMetrics.resource.asyncAttributesPending) return [3 /*break*/, 2];
                        (_b = (_a = resourceMetrics.resource).waitForAsyncAttributes) === null || _b === void 0 ? void 0 : _b.call(_a).then(doExport, function (err) {
                            return diag.debug('Error while resolving async portion of resource: ', err);
                        });
                        return [3 /*break*/, 4];
                    case 2: return [4 /*yield*/, doExport()];
                    case 3:
                        _e.sent();
                        _e.label = 4;
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    PeriodicExportingMetricReader.prototype.onInitialized = function () {
        var _this = this;
        // start running the interval as soon as this reader is initialized and keep handle for shutdown.
        this._interval = setInterval(function () {
            // this._runOnce never rejects. Using void operator to suppress @typescript-eslint/no-floating-promises.
            void _this._runOnce();
        }, this._exportInterval);
        unrefTimer(this._interval);
    };
    PeriodicExportingMetricReader.prototype.onForceFlush = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this._runOnce()];
                    case 1:
                        _a.sent();
                        return [4 /*yield*/, this._exporter.forceFlush()];
                    case 2:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    PeriodicExportingMetricReader.prototype.onShutdown = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (this._interval) {
                            clearInterval(this._interval);
                        }
                        return [4 /*yield*/, this._exporter.shutdown()];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    return PeriodicExportingMetricReader;
}(MetricReader));
export { PeriodicExportingMetricReader };
//# sourceMappingURL=PeriodicExportingMetricReader.js.map