import type { Resource } from '@opentelemetry/resources';
import type { SeverityNumber } from '@opentelemetry/api-logs';
import type { InstrumentationScope } from '@opentelemetry/core';
import { LogRecordProcessor } from './LogRecordProcessor';
/**
 * A LoggerConfig defines various configurable aspects of a Logger's behavior.
 *
 * @experimental This feature is in development as per the OpenTelemetry specification.
 */
export interface LoggerConfig {
    /**
     * A boolean indication of whether the logger is enabled.
     * If a Logger is disabled, it behaves equivalently to a No-op Logger.
     * Defaults to false (loggers are enabled by default).
     *
     * @experimental This feature is in development as per the OpenTelemetry specification.
     */
    disabled?: boolean;
    /**
     * A SeverityNumber indicating the minimum severity level for log records to be processed.
     * If not explicitly set, defaults to 0 (UNSPECIFIED).
     * Log records with a specified severity (i.e. not 0) that is less than this value will be dropped.
     * Log records with unspecified severity (0) bypass this filter.
     *
     * @experimental This feature is in development as per the OpenTelemetry specification.
     */
    minimumSeverity?: SeverityNumber;
    /**
     * A boolean indication of whether the logger should only process log records
     * associated with sampled traces.
     * If not explicitly set, defaults to false.
     * If true, log records associated with unsampled traces will be dropped.
     *
     * @experimental This feature is in development as per the OpenTelemetry specification.
     */
    traceBased?: boolean;
}
/**
 * A LoggerConfigurator is a function which computes the LoggerConfig for a Logger.
 * It is called when a Logger is first created, and for each outstanding Logger
 * when a LoggerProvider's LoggerConfigurator is updated (if updating is supported).
 *
 * The function must return the complete LoggerConfig for the given logger scope.
 * All config properties should have their values computed and set to appropriate defaults.
 *
 * @param loggerScope - The InstrumentationScope of the Logger
 * @returns The computed LoggerConfig with all properties set
 * @experimental This feature is in development as per the OpenTelemetry specification.
 */
export type LoggerConfigurator = (loggerScope: InstrumentationScope) => Required<LoggerConfig>;
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
    /** Log Record Processors */
    processors?: LogRecordProcessor[];
    /**
     * A function that computes the LoggerConfig for a given logger.
     * This is called when a Logger is first created.
     *
     * @experimental This feature is in development as per the OpenTelemetry specification.
     */
    loggerConfigurator?: LoggerConfigurator;
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