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
import { diag } from '@opentelemetry/api';
import { ExportResultCode, getEnv, globalErrorHandler, unrefTimer, BindOnceFuture, internal, callWithTimeout, } from '@opentelemetry/core';
var BatchLogRecordProcessorBase = /** @class */ (function () {
    function BatchLogRecordProcessorBase(_exporter, config) {
        var _a, _b, _c, _d;
        this._exporter = _exporter;
        this._finishedLogRecords = [];
        var env = getEnv();
        this._maxExportBatchSize =
            (_a = config === null || config === void 0 ? void 0 : config.maxExportBatchSize) !== null && _a !== void 0 ? _a : env.OTEL_BLRP_MAX_EXPORT_BATCH_SIZE;
        this._maxQueueSize = (_b = config === null || config === void 0 ? void 0 : config.maxQueueSize) !== null && _b !== void 0 ? _b : env.OTEL_BLRP_MAX_QUEUE_SIZE;
        this._scheduledDelayMillis =
            (_c = config === null || config === void 0 ? void 0 : config.scheduledDelayMillis) !== null && _c !== void 0 ? _c : env.OTEL_BLRP_SCHEDULE_DELAY;
        this._exportTimeoutMillis =
            (_d = config === null || config === void 0 ? void 0 : config.exportTimeoutMillis) !== null && _d !== void 0 ? _d : env.OTEL_BLRP_EXPORT_TIMEOUT;
        this._shutdownOnce = new BindOnceFuture(this._shutdown, this);
        if (this._maxExportBatchSize > this._maxQueueSize) {
            diag.warn('BatchLogRecordProcessor: maxExportBatchSize must be smaller or equal to maxQueueSize, setting maxExportBatchSize to match maxQueueSize');
            this._maxExportBatchSize = this._maxQueueSize;
        }
    }
    BatchLogRecordProcessorBase.prototype.onEmit = function (logRecord) {
        if (this._shutdownOnce.isCalled) {
            return;
        }
        this._addToBuffer(logRecord);
    };
    BatchLogRecordProcessorBase.prototype.forceFlush = function () {
        if (this._shutdownOnce.isCalled) {
            return this._shutdownOnce.promise;
        }
        return this._flushAll();
    };
    BatchLogRecordProcessorBase.prototype.shutdown = function () {
        return this._shutdownOnce.call();
    };
    BatchLogRecordProcessorBase.prototype._shutdown = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        this.onShutdown();
                        return [4 /*yield*/, this._flushAll()];
                    case 1:
                        _a.sent();
                        return [4 /*yield*/, this._exporter.shutdown()];
                    case 2:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    /** Add a LogRecord in the buffer. */
    BatchLogRecordProcessorBase.prototype._addToBuffer = function (logRecord) {
        if (this._finishedLogRecords.length >= this._maxQueueSize) {
            return;
        }
        this._finishedLogRecords.push(logRecord);
        this._maybeStartTimer();
    };
    /**
     * Send all LogRecords to the exporter respecting the batch size limit
     * This function is used only on forceFlush or shutdown,
     * for all other cases _flush should be used
     * */
    BatchLogRecordProcessorBase.prototype._flushAll = function () {
        var _this = this;
        return new Promise(function (resolve, reject) {
            var promises = [];
            var batchCount = Math.ceil(_this._finishedLogRecords.length / _this._maxExportBatchSize);
            for (var i = 0; i < batchCount; i++) {
                promises.push(_this._flushOneBatch());
            }
            Promise.all(promises)
                .then(function () {
                resolve();
            })
                .catch(reject);
        });
    };
    BatchLogRecordProcessorBase.prototype._flushOneBatch = function () {
        var _this = this;
        this._clearTimer();
        if (this._finishedLogRecords.length === 0) {
            return Promise.resolve();
        }
        return new Promise(function (resolve, reject) {
            callWithTimeout(_this._export(_this._finishedLogRecords.splice(0, _this._maxExportBatchSize)), _this._exportTimeoutMillis)
                .then(function () { return resolve(); })
                .catch(reject);
        });
    };
    BatchLogRecordProcessorBase.prototype._maybeStartTimer = function () {
        var _this = this;
        if (this._timer !== undefined) {
            return;
        }
        this._timer = setTimeout(function () {
            _this._flushOneBatch()
                .then(function () {
                if (_this._finishedLogRecords.length > 0) {
                    _this._clearTimer();
                    _this._maybeStartTimer();
                }
            })
                .catch(function (e) {
                globalErrorHandler(e);
            });
        }, this._scheduledDelayMillis);
        unrefTimer(this._timer);
    };
    BatchLogRecordProcessorBase.prototype._clearTimer = function () {
        if (this._timer !== undefined) {
            clearTimeout(this._timer);
            this._timer = undefined;
        }
    };
    BatchLogRecordProcessorBase.prototype._export = function (logRecords) {
        var _this = this;
        var doExport = function () {
            return internal
                ._export(_this._exporter, logRecords)
                .then(function (result) {
                var _a;
                if (result.code !== ExportResultCode.SUCCESS) {
                    globalErrorHandler((_a = result.error) !== null && _a !== void 0 ? _a : new Error("BatchLogRecordProcessor: log record export failed (status " + result + ")"));
                }
            })
                .catch(globalErrorHandler);
        };
        var pendingResources = logRecords
            .map(function (logRecord) { return logRecord.resource; })
            .filter(function (resource) { return resource.asyncAttributesPending; });
        // Avoid scheduling a promise to make the behavior more predictable and easier to test
        if (pendingResources.length === 0) {
            return doExport();
        }
        else {
            return Promise.all(pendingResources.map(function (resource) { var _a; return (_a = resource.waitForAsyncAttributes) === null || _a === void 0 ? void 0 : _a.call(resource); })).then(doExport, globalErrorHandler);
        }
    };
    return BatchLogRecordProcessorBase;
}());
export { BatchLogRecordProcessorBase };
//# sourceMappingURL=BatchLogRecordProcessorBase.js.map