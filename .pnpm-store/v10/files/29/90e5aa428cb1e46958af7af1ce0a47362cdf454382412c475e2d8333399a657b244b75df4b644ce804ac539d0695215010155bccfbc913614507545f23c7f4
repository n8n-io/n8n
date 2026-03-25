import { Context } from '@opentelemetry/api';
import { LogRecord } from './LogRecord';
export interface LogRecordProcessor {
    /**
     * Forces to export all finished log records
     */
    forceFlush(): Promise<void>;
    /**
     * Called when a {@link LogRecord} is emit
     * @param logRecord the ReadWriteLogRecord that just emitted.
     * @param context the current Context, or an empty Context if the Logger was obtained with include_trace_context=false
     */
    onEmit(logRecord: LogRecord, context?: Context): void;
    /**
     * Shuts down the processor. Called when SDK is shut down. This is an
     * opportunity for processor to do any cleanup required.
     */
    shutdown(): Promise<void>;
}
//# sourceMappingURL=LogRecordProcessor.d.ts.map