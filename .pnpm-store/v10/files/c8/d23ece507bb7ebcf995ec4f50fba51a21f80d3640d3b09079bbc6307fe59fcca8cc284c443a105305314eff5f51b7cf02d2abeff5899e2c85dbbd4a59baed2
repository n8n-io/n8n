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
import { hrTimeToMicroseconds } from '@opentelemetry/core';
import { ExportResultCode } from '@opentelemetry/core';
/**
 * This is implementation of {@link LogRecordExporter} that prints LogRecords to the
 * console. This class can be used for diagnostic purposes.
 *
 * NOTE: This {@link LogRecordExporter} is intended for diagnostics use only, output rendered to the console may change at any time.
 */
/* eslint-disable no-console */
var ConsoleLogRecordExporter = /** @class */ (function () {
    function ConsoleLogRecordExporter() {
    }
    /**
     * Export logs.
     * @param logs
     * @param resultCallback
     */
    ConsoleLogRecordExporter.prototype.export = function (logs, resultCallback) {
        this._sendLogRecords(logs, resultCallback);
    };
    /**
     * Shutdown the exporter.
     */
    ConsoleLogRecordExporter.prototype.shutdown = function () {
        return Promise.resolve();
    };
    /**
     * converts logRecord info into more readable format
     * @param logRecord
     */
    ConsoleLogRecordExporter.prototype._exportInfo = function (logRecord) {
        var _a, _b, _c;
        return {
            resource: {
                attributes: logRecord.resource.attributes,
            },
            instrumentationScope: logRecord.instrumentationScope,
            timestamp: hrTimeToMicroseconds(logRecord.hrTime),
            traceId: (_a = logRecord.spanContext) === null || _a === void 0 ? void 0 : _a.traceId,
            spanId: (_b = logRecord.spanContext) === null || _b === void 0 ? void 0 : _b.spanId,
            traceFlags: (_c = logRecord.spanContext) === null || _c === void 0 ? void 0 : _c.traceFlags,
            severityText: logRecord.severityText,
            severityNumber: logRecord.severityNumber,
            body: logRecord.body,
            attributes: logRecord.attributes,
        };
    };
    /**
     * Showing logs  in console
     * @param logRecords
     * @param done
     */
    ConsoleLogRecordExporter.prototype._sendLogRecords = function (logRecords, done) {
        var e_1, _a;
        try {
            for (var logRecords_1 = __values(logRecords), logRecords_1_1 = logRecords_1.next(); !logRecords_1_1.done; logRecords_1_1 = logRecords_1.next()) {
                var logRecord = logRecords_1_1.value;
                console.dir(this._exportInfo(logRecord), { depth: 3 });
            }
        }
        catch (e_1_1) { e_1 = { error: e_1_1 }; }
        finally {
            try {
                if (logRecords_1_1 && !logRecords_1_1.done && (_a = logRecords_1.return)) _a.call(logRecords_1);
            }
            finally { if (e_1) throw e_1.error; }
        }
        done === null || done === void 0 ? void 0 : done({ code: ExportResultCode.SUCCESS });
    };
    return ConsoleLogRecordExporter;
}());
export { ConsoleLogRecordExporter };
//# sourceMappingURL=ConsoleLogRecordExporter.js.map