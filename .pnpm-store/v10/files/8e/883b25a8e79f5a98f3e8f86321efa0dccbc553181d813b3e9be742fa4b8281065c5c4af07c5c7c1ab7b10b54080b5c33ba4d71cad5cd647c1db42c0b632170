"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConsoleLogRecordExporter = void 0;
const core_1 = require("@opentelemetry/core");
const core_2 = require("@opentelemetry/core");
/**
 * This is implementation of {@link LogRecordExporter} that prints LogRecords to the
 * console. This class can be used for diagnostic purposes.
 *
 * NOTE: This {@link LogRecordExporter} is intended for diagnostics use only, output rendered to the console may change at any time.
 */
/* eslint-disable no-console */
class ConsoleLogRecordExporter {
    /**
     * Export logs.
     * @param logs
     * @param resultCallback
     */
    export(logs, resultCallback) {
        this._sendLogRecords(logs, resultCallback);
    }
    /**
     * Shutdown the exporter.
     */
    shutdown() {
        return Promise.resolve();
    }
    /**
     * converts logRecord info into more readable format
     * @param logRecord
     */
    _exportInfo(logRecord) {
        var _a, _b, _c;
        return {
            resource: {
                attributes: logRecord.resource.attributes,
            },
            instrumentationScope: logRecord.instrumentationScope,
            timestamp: (0, core_1.hrTimeToMicroseconds)(logRecord.hrTime),
            traceId: (_a = logRecord.spanContext) === null || _a === void 0 ? void 0 : _a.traceId,
            spanId: (_b = logRecord.spanContext) === null || _b === void 0 ? void 0 : _b.spanId,
            traceFlags: (_c = logRecord.spanContext) === null || _c === void 0 ? void 0 : _c.traceFlags,
            severityText: logRecord.severityText,
            severityNumber: logRecord.severityNumber,
            body: logRecord.body,
            attributes: logRecord.attributes,
        };
    }
    /**
     * Showing logs  in console
     * @param logRecords
     * @param done
     */
    _sendLogRecords(logRecords, done) {
        for (const logRecord of logRecords) {
            console.dir(this._exportInfo(logRecord), { depth: 3 });
        }
        done === null || done === void 0 ? void 0 : done({ code: core_2.ExportResultCode.SUCCESS });
    }
}
exports.ConsoleLogRecordExporter = ConsoleLogRecordExporter;
//# sourceMappingURL=ConsoleLogRecordExporter.js.map