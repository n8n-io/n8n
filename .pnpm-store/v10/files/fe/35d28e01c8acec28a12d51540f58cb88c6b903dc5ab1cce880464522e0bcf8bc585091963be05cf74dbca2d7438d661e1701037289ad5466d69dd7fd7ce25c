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
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
import { ExportResultCode } from '@opentelemetry/core';
/**
 * This class can be used for testing purposes. It stores the exported LogRecords
 * in a list in memory that can be retrieved using the `getFinishedLogRecords()`
 * method.
 */
var InMemoryLogRecordExporter = /** @class */ (function () {
    function InMemoryLogRecordExporter() {
        this._finishedLogRecords = [];
        /**
         * Indicates if the exporter has been "shutdown."
         * When false, exported log records will not be stored in-memory.
         */
        this._stopped = false;
    }
    InMemoryLogRecordExporter.prototype.export = function (logs, resultCallback) {
        var _a;
        if (this._stopped) {
            return resultCallback({
                code: ExportResultCode.FAILED,
                error: new Error('Exporter has been stopped'),
            });
        }
        (_a = this._finishedLogRecords).push.apply(_a, __spreadArray([], __read(logs), false));
        resultCallback({ code: ExportResultCode.SUCCESS });
    };
    InMemoryLogRecordExporter.prototype.shutdown = function () {
        this._stopped = true;
        this.reset();
        return Promise.resolve();
    };
    InMemoryLogRecordExporter.prototype.getFinishedLogRecords = function () {
        return this._finishedLogRecords;
    };
    InMemoryLogRecordExporter.prototype.reset = function () {
        this._finishedLogRecords = [];
    };
    return InMemoryLogRecordExporter;
}());
export { InMemoryLogRecordExporter };
//# sourceMappingURL=InMemoryLogRecordExporter.js.map