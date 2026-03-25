import type { BufferConfig } from '../types';
import type { LogRecord } from '../LogRecord';
import type { LogRecordExporter } from './LogRecordExporter';
import type { LogRecordProcessor } from '../LogRecordProcessor';
export declare abstract class BatchLogRecordProcessorBase<T extends BufferConfig> implements LogRecordProcessor {
    private readonly _exporter;
    private readonly _maxExportBatchSize;
    private readonly _maxQueueSize;
    private readonly _scheduledDelayMillis;
    private readonly _exportTimeoutMillis;
    private _finishedLogRecords;
    private _timer;
    private _shutdownOnce;
    constructor(_exporter: LogRecordExporter, config?: T);
    onEmit(logRecord: LogRecord): void;
    forceFlush(): Promise<void>;
    shutdown(): Promise<void>;
    private _shutdown;
    /** Add a LogRecord in the buffer. */
    private _addToBuffer;
    /**
     * Send all LogRecords to the exporter respecting the batch size limit
     * This function is used only on forceFlush or shutdown,
     * for all other cases _flush should be used
     * */
    private _flushAll;
    private _flushOneBatch;
    private _maybeStartTimer;
    private _clearTimer;
    private _export;
    protected abstract onShutdown(): void;
}
//# sourceMappingURL=BatchLogRecordProcessorBase.d.ts.map