import type { LogRecordExporter } from './LogRecordExporter';
import type { LogRecordProcessor } from '../LogRecordProcessor';
import type { LogRecord } from './../LogRecord';
export declare class SimpleLogRecordProcessor implements LogRecordProcessor {
    private readonly _exporter;
    private _shutdownOnce;
    private _unresolvedExports;
    constructor(_exporter: LogRecordExporter);
    onEmit(logRecord: LogRecord): void;
    forceFlush(): Promise<void>;
    shutdown(): Promise<void>;
    private _shutdown;
}
//# sourceMappingURL=SimpleLogRecordProcessor.d.ts.map