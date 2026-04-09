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
import { BindOnceFuture, ExportResultCode, globalErrorHandler, internal, } from '@opentelemetry/core';
var SimpleLogRecordProcessor = /** @class */ (function () {
    function SimpleLogRecordProcessor(_exporter) {
        this._exporter = _exporter;
        this._shutdownOnce = new BindOnceFuture(this._shutdown, this);
        this._unresolvedExports = new Set();
    }
    SimpleLogRecordProcessor.prototype.onEmit = function (logRecord) {
        var _this = this;
        var _a, _b;
        if (this._shutdownOnce.isCalled) {
            return;
        }
        var doExport = function () {
            return internal
                ._export(_this._exporter, [logRecord])
                .then(function (result) {
                var _a;
                if (result.code !== ExportResultCode.SUCCESS) {
                    globalErrorHandler((_a = result.error) !== null && _a !== void 0 ? _a : new Error("SimpleLogRecordProcessor: log record export failed (status " + result + ")"));
                }
            })
                .catch(globalErrorHandler);
        };
        // Avoid scheduling a promise to make the behavior more predictable and easier to test
        if (logRecord.resource.asyncAttributesPending) {
            var exportPromise_1 = (_b = (_a = logRecord.resource).waitForAsyncAttributes) === null || _b === void 0 ? void 0 : _b.call(_a).then(function () {
                // Using TS Non-null assertion operator because exportPromise could not be null in here
                // if waitForAsyncAttributes is not present this code will never be reached
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                _this._unresolvedExports.delete(exportPromise_1);
                return doExport();
            }, globalErrorHandler);
            // store the unresolved exports
            if (exportPromise_1 != null) {
                this._unresolvedExports.add(exportPromise_1);
            }
        }
        else {
            void doExport();
        }
    };
    SimpleLogRecordProcessor.prototype.forceFlush = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: 
                    // await unresolved resources before resolving
                    return [4 /*yield*/, Promise.all(Array.from(this._unresolvedExports))];
                    case 1:
                        // await unresolved resources before resolving
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    SimpleLogRecordProcessor.prototype.shutdown = function () {
        return this._shutdownOnce.call();
    };
    SimpleLogRecordProcessor.prototype._shutdown = function () {
        return this._exporter.shutdown();
    };
    return SimpleLogRecordProcessor;
}());
export { SimpleLogRecordProcessor };
//# sourceMappingURL=SimpleLogRecordProcessor.js.map