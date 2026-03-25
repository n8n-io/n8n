import { ExportResult } from '@opentelemetry/core';
import type { ReadableLogRecord } from './ReadableLogRecord';
import type { LogRecordExporter } from './LogRecordExporter';
/**
 * This is implementation of {@link LogRecordExporter} that prints LogRecords to the
 * console. This class can be used for diagnostic purposes.
 *
 * NOTE: This {@link LogRecordExporter} is intended for diagnostics use only, output rendered to the console may change at any time.
 */
export declare class ConsoleLogRecordExporter implements LogRecordExporter {
    /**
     * Export logs.
     * @param logs
     * @param resultCallback
     */
    export(logs: ReadableLogRecord[], resultCallback: (result: ExportResult) => void): void;
    /**
     * Shutdown the exporter.
     */
    shutdown(): Promise<void>;
    /**
     * converts logRecord info into more readable format
     * @param logRecord
     */
    private _exportInfo;
    /**
     * Showing logs  in console
     * @param logRecords
     * @param done
     */
    private _sendLogRecords;
}
//# sourceMappingURL=ConsoleLogRecordExporter.d.ts.map