"use strict";
/*
 * Copyright The OpenTelemetry Authors
 * SPDX-License-Identifier: Apache-2.0
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.InMemoryLogRecordExporter = void 0;
const core_1 = require("@opentelemetry/core");
/**
 * This class can be used for testing purposes. It stores the exported LogRecords
 * in a list in memory that can be retrieved using the `getFinishedLogRecords()`
 * method.
 */
class InMemoryLogRecordExporter {
    _finishedLogRecords = [];
    /**
     * Indicates if the exporter has been "shutdown."
     * When false, exported log records will not be stored in-memory.
     */
    _stopped = false;
    export(logs, resultCallback) {
        if (this._stopped) {
            return resultCallback({
                code: core_1.ExportResultCode.FAILED,
                error: new Error('Exporter has been stopped'),
            });
        }
        this._finishedLogRecords.push(...logs);
        resultCallback({ code: core_1.ExportResultCode.SUCCESS });
    }
    shutdown() {
        this._stopped = true;
        this.reset();
        return Promise.resolve();
    }
    getFinishedLogRecords() {
        return this._finishedLogRecords;
    }
    reset() {
        this._finishedLogRecords = [];
    }
}
exports.InMemoryLogRecordExporter = InMemoryLogRecordExporter;
//# sourceMappingURL=InMemoryLogRecordExporter.js.map