import type { LogRecordExporter } from './LogRecordExporter';
import type { LogRecordProcessor } from '../LogRecordProcessor';
import type { SdkLogRecord } from './SdkLogRecord';
/**
 * An implementation of the {@link LogRecordProcessor} interface that exports
 * each {@link LogRecord} as it is emitted.
 *
 * NOTE: This {@link LogRecordProcessor} exports every {@link LogRecord}
 * individually instead of batching them together, which can cause significant
 * performance overhead with most exporters. For production use, please consider
 * using the {@link BatchLogRecordProcessor} instead.
 */
export declare class SimpleLogRecordProcessor implements LogRecordProcessor {
    private readonly _exporter;
    private _shutdownOnce;
    private _unresolvedExports;
    constructor(exporter: LogRecordExporter);
    onEmit(logRecord: SdkLogRecord): void;
    forceFlush(): Promise<void>;
    shutdown(): Promise<void>;
    private _shutdown;
}
//# sourceMappingURL=SimpleLogRecordProcessor.d.ts.map