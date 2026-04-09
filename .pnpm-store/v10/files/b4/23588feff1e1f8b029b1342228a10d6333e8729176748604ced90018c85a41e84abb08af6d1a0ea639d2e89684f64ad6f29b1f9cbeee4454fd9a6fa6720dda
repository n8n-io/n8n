/*
 * Copyright The OpenTelemetry Authors
 * SPDX-License-Identifier: Apache-2.0
 */
import { ExportResultCode, hrTimeToMicroseconds, } from '@opentelemetry/core';
/**
 * This is implementation of {@link LogRecordExporter} that prints LogRecords to the
 * console. This class can be used for diagnostic purposes.
 *
 * NOTE: This {@link LogRecordExporter} is intended for diagnostics use only, output rendered to the console may change at any time.
 */
/* eslint-disable no-console */
export class ConsoleLogRecordExporter {
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
        return {
            resource: {
                attributes: logRecord.resource.attributes,
            },
            instrumentationScope: logRecord.instrumentationScope,
            timestamp: hrTimeToMicroseconds(logRecord.hrTime),
            traceId: logRecord.spanContext?.traceId,
            spanId: logRecord.spanContext?.spanId,
            traceFlags: logRecord.spanContext?.traceFlags,
            severityText: logRecord.severityText,
            severityNumber: logRecord.severityNumber,
            eventName: logRecord.eventName,
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
        done?.({ code: ExportResultCode.SUCCESS });
    }
}
//# sourceMappingURL=ConsoleLogRecordExporter.js.map