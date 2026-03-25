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
import { ExportResultCode } from '@opentelemetry/core';
/**
 * This class can be used for testing purposes. It stores the exported LogRecords
 * in a list in memory that can be retrieved using the `getFinishedLogRecords()`
 * method.
 */
export class InMemoryLogRecordExporter {
    _finishedLogRecords = [];
    /**
     * Indicates if the exporter has been "shutdown."
     * When false, exported log records will not be stored in-memory.
     */
    _stopped = false;
    export(logs, resultCallback) {
        if (this._stopped) {
            return resultCallback({
                code: ExportResultCode.FAILED,
                error: new Error('Exporter has been stopped'),
            });
        }
        this._finishedLogRecords.push(...logs);
        resultCallback({ code: ExportResultCode.SUCCESS });
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
//# sourceMappingURL=InMemoryLogRecordExporter.js.map