import type * as logsAPI from '@opentelemetry/api-logs';
import type { LoggerProviderConfig } from './types';
import type { LogRecordProcessor } from './LogRecordProcessor';
export declare const DEFAULT_LOGGER_NAME = "unknown";
export declare class LoggerProvider implements logsAPI.LoggerProvider {
    private _shutdownOnce;
    private readonly _sharedState;
    constructor(config?: LoggerProviderConfig);
    /**
     * Get a logger with the configuration of the LoggerProvider.
     */
    getLogger(name: string, version?: string, options?: logsAPI.LoggerOptions): logsAPI.Logger;
    /**
     * Adds a new {@link LogRecordProcessor} to this logger.
     * @param processor the new LogRecordProcessor to be added.
     */
    addLogRecordProcessor(processor: LogRecordProcessor): void;
    /**
     * Notifies all registered LogRecordProcessor to flush any buffered data.
     *
     * Returns a promise which is resolved when all flushes are complete.
     */
    forceFlush(): Promise<void>;
    /**
     * Flush all buffered data and shut down the LoggerProvider and all registered
     * LogRecordProcessor.
     *
     * Returns a promise which is resolved when all flushes are complete.
     */
    shutdown(): Promise<void>;
    private _shutdown;
}
//# sourceMappingURL=LoggerProvider.d.ts.map