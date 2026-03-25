import type { Resource } from '@opentelemetry/resources';
export interface LoggerProviderConfig {
    /** Resource associated with trace telemetry  */
    resource?: Resource;
    /**
     * How long the forceFlush can run before it is cancelled.
     * The default value is 30000ms
     */
    forceFlushTimeoutMillis?: number;
    /** Log Record Limits*/
    logRecordLimits?: LogRecordLimits;
}
export interface LogRecordLimits {
    /** attributeValueLengthLimit is maximum allowed attribute value size */
    attributeValueLengthLimit?: number;
    /** attributeCountLimit is number of attributes per LogRecord */
    attributeCountLimit?: number;
}
/** Interface configuration for a buffer. */
export interface BufferConfig {
    /** The maximum batch size of every export. It must be smaller or equal to
     * maxQueueSize. The default value is 512. */
    maxExportBatchSize?: number;
    /** The delay interval in milliseconds between two consecutive exports.
     *  The default value is 5000ms. */
    scheduledDelayMillis?: number;
    /** How long the export can run before it is cancelled.
     * The default value is 30000ms */
    exportTimeoutMillis?: number;
    /** The maximum queue size. After the size is reached log records are dropped.
     * The default value is 2048. */
    maxQueueSize?: number;
}
export interface BatchLogRecordProcessorBrowserConfig extends BufferConfig {
    /** Disable flush when a user navigates to a new page, closes the tab or the browser, or,
     * on mobile, switches to a different app. Auto flush is enabled by default. */
    disableAutoFlushOnDocumentHide?: boolean;
}
//# sourceMappingURL=types.d.ts.map