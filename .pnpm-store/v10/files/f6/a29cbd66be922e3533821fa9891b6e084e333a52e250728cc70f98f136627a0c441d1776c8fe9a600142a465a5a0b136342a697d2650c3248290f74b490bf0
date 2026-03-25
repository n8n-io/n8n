import type { Context } from '@opentelemetry/api';
import type { LogRecordProcessor } from './LogRecordProcessor';
import type { LogRecord } from './LogRecord';
/**
 * Implementation of the {@link LogRecordProcessor} that simply forwards all
 * received events to a list of {@link LogRecordProcessor}s.
 */
export declare class MultiLogRecordProcessor implements LogRecordProcessor {
    readonly processors: LogRecordProcessor[];
    readonly forceFlushTimeoutMillis: number;
    constructor(processors: LogRecordProcessor[], forceFlushTimeoutMillis: number);
    forceFlush(): Promise<void>;
    onEmit(logRecord: LogRecord, context?: Context): void;
    shutdown(): Promise<void>;
}
//# sourceMappingURL=MultiLogRecordProcessor.d.ts.map