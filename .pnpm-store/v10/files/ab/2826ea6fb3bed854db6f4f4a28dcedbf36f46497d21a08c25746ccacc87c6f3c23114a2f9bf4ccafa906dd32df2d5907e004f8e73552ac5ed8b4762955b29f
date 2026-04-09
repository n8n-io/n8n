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
import { diag, } from '@opentelemetry/api';
import { isObservableInstrument } from '../Instruments';
import { BatchObservableResultImpl, ObservableResultImpl, } from '../ObservableResult';
import { callWithTimeout, PromiseAllSettled, isPromiseAllSettledRejectionResult, setEquals, } from '../utils';
/**
 * An internal interface for managing ObservableCallbacks.
 *
 * Every registered callback associated with a set of instruments are be evaluated
 * exactly once during collection prior to reading data for that instrument.
 */
var ObservableRegistry = /** @class */ (function () {
    function ObservableRegistry() {
        this._callbacks = [];
        this._batchCallbacks = [];
    }
    ObservableRegistry.prototype.addCallback = function (callback, instrument) {
        var idx = this._findCallback(callback, instrument);
        if (idx >= 0) {
            return;
        }
        this._callbacks.push({ callback: callback, instrument: instrument });
    };
    ObservableRegistry.prototype.removeCallback = function (callback, instrument) {
        var idx = this._findCallback(callback, instrument);
        if (idx < 0) {
            return;
        }
        this._callbacks.splice(idx, 1);
    };
    ObservableRegistry.prototype.addBatchCallback = function (callback, instruments) {
        // Create a set of unique instruments.
        var observableInstruments = new Set(instruments.filter(isObservableInstrument));
        if (observableInstruments.size === 0) {
            diag.error('BatchObservableCallback is not associated with valid instruments', instruments);
            return;
        }
        var idx = this._findBatchCallback(callback, observableInstruments);
        if (idx >= 0) {
            return;
        }
        this._batchCallbacks.push({ callback: callback, instruments: observableInstruments });
    };
    ObservableRegistry.prototype.removeBatchCallback = function (callback, instruments) {
        // Create a set of unique instruments.
        var observableInstruments = new Set(instruments.filter(isObservableInstrument));
        var idx = this._findBatchCallback(callback, observableInstruments);
        if (idx < 0) {
            return;
        }
        this._batchCallbacks.splice(idx, 1);
    };
    /**
     * @returns a promise of rejected reasons for invoking callbacks.
     */
    ObservableRegistry.prototype.observe = function (collectionTime, timeoutMillis) {
        return __awaiter(this, void 0, void 0, function () {
            var callbackFutures, batchCallbackFutures, results, rejections;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        callbackFutures = this._observeCallbacks(collectionTime, timeoutMillis);
                        batchCallbackFutures = this._observeBatchCallbacks(collectionTime, timeoutMillis);
                        return [4 /*yield*/, PromiseAllSettled(__spreadArray(__spreadArray([], __read(callbackFutures), false), __read(batchCallbackFutures), false))];
                    case 1:
                        results = _a.sent();
                        rejections = results
                            .filter(isPromiseAllSettledRejectionResult)
                            .map(function (it) { return it.reason; });
                        return [2 /*return*/, rejections];
                }
            });
        });
    };
    ObservableRegistry.prototype._observeCallbacks = function (observationTime, timeoutMillis) {
        var _this = this;
        return this._callbacks.map(function (_a) {
            var callback = _a.callback, instrument = _a.instrument;
            return __awaiter(_this, void 0, void 0, function () {
                var observableResult, callPromise;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0:
                            observableResult = new ObservableResultImpl(instrument._descriptor.name, instrument._descriptor.valueType);
                            callPromise = Promise.resolve(callback(observableResult));
                            if (timeoutMillis != null) {
                                callPromise = callWithTimeout(callPromise, timeoutMillis);
                            }
                            return [4 /*yield*/, callPromise];
                        case 1:
                            _b.sent();
                            instrument._metricStorages.forEach(function (metricStorage) {
                                metricStorage.record(observableResult._buffer, observationTime);
                            });
                            return [2 /*return*/];
                    }
                });
            });
        });
    };
    ObservableRegistry.prototype._observeBatchCallbacks = function (observationTime, timeoutMillis) {
        var _this = this;
        return this._batchCallbacks.map(function (_a) {
            var callback = _a.callback, instruments = _a.instruments;
            return __awaiter(_this, void 0, void 0, function () {
                var observableResult, callPromise;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0:
                            observableResult = new BatchObservableResultImpl();
                            callPromise = Promise.resolve(callback(observableResult));
                            if (timeoutMillis != null) {
                                callPromise = callWithTimeout(callPromise, timeoutMillis);
                            }
                            return [4 /*yield*/, callPromise];
                        case 1:
                            _b.sent();
                            instruments.forEach(function (instrument) {
                                var buffer = observableResult._buffer.get(instrument);
                                if (buffer == null) {
                                    return;
                                }
                                instrument._metricStorages.forEach(function (metricStorage) {
                                    metricStorage.record(buffer, observationTime);
                                });
                            });
                            return [2 /*return*/];
                    }
                });
            });
        });
    };
    ObservableRegistry.prototype._findCallback = function (callback, instrument) {
        return this._callbacks.findIndex(function (record) {
            return record.callback === callback && record.instrument === instrument;
        });
    };
    ObservableRegistry.prototype._findBatchCallback = function (callback, instruments) {
        return this._batchCallbacks.findIndex(function (record) {
            return (record.callback === callback &&
                setEquals(record.instruments, instruments));
        });
    };
    return ObservableRegistry;
}());
export { ObservableRegistry };
//# sourceMappingURL=ObservableRegistry.js.map