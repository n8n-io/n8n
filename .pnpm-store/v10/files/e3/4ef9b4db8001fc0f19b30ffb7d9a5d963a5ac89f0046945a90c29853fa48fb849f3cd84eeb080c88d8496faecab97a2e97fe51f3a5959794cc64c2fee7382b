import type { ExportResult } from '@opentelemetry/core';
import type { ReadableLogRecord } from './ReadableLogRecord';
import type { LogRecordExporter } from './LogRecordExporter';
/**
 * This class can be used for testing purposes. It stores the exported LogRecords
 * in a list in memory that can be retrieved using the `getFinishedLogRecords()`
 * method.
 */
export declare class InMemoryLogRecordExporter implements LogRecordExporter {
    private _finishedLogRecords;
    /**
     * Indicates if the exporter has been "shutdown."
     * When false, exported log records will not be stored in-memory.
     */
    protected _stopped: boolean;
    export(logs: ReadableLogRecord[], resultCallback: (result: ExportResult) => void): void;
    shutdown(): Promise<void>;
    getFinishedLogRecords(): ReadableLogRecord[];
    reset(): void;
}
//# sourceMappingURL=InMemoryLogRecordExporter.d.ts.map