import { ExperimentalOtlpFileExporter, OtlpGrpcExporter, OtlpHttpExporter, SeverityNumber } from './commonModel';
export declare function initializeDefaultLoggerProviderConfiguration(): Required<LoggerProvider>;
export interface LoggerProvider {
    /**
     * Configure log record processors.
     */
    processors: LogRecordProcessor[];
    /**
     * Configure log record limits. See also attribute_limits.
     */
    limits?: LogRecordLimits;
    /**
     * Configure loggers.
     * This type is in development and subject to breaking changes in minor versions.
     */
    'logger_configurator/development'?: ExperimentalLoggerConfigurator;
}
export interface SimpleLogRecordProcessor {
    /**
     * Configure exporter.
     */
    exporter: LogRecordExporter;
}
export interface BatchLogRecordProcessor {
    /**
     * Configure delay interval (in milliseconds) between two consecutive exports.
     * Value must be non-negative.
     * If omitted or null, 1000 is used for traces and 1000 for logs.
     */
    schedule_delay?: number;
    /**
     * Configure maximum allowed time (in milliseconds) to export data.
     * Value must be non-negative. A value of 0 indicates no limit (infinity).
     * If omitted or null, 30000 is used.
     */
    export_timeout?: number;
    /**
     * Configure maximum queue size. Value must be positive.
     * If omitted or null, 2048 is used.
     */
    max_queue_size?: number;
    /**
     * Configure maximum batch size. Value must be positive.
     * If omitted or null, 512 is used.
     */
    max_export_batch_size?: number;
    /**
     * Configure exporter.
     */
    exporter: LogRecordExporter;
}
export interface LogRecordExporter {
    /**
     * Configure exporter to be OTLP with HTTP transport.
     */
    otlp_http?: OtlpHttpExporter;
    /**
     * Configure exporter to be OTLP with gRPC transport.
     */
    otlp_grpc?: OtlpGrpcExporter;
    /**
     * Configure exporter to be OTLP with file transport.
     * This type is in development and subject to breaking changes in minor versions.
     */
    'otlp_file/development'?: ExperimentalOtlpFileExporter;
    /**
     * Configure exporter to be console.
     */
    console?: object;
}
export interface LogRecordLimits {
    /**
     * Configure max attribute value size. Overrides .attribute_limits.attribute_value_length_limit.
     * Value must be non-negative.
     * If omitted or null, there is no limit.
     */
    attribute_value_length_limit?: number;
    /**
     * Configure max attribute count. Overrides .attribute_limits.attribute_count_limit.
     * Value must be non-negative.
     * If omitted or null, 128 is used.
     */
    attribute_count_limit?: number;
}
export interface LogRecordProcessor {
    /**
     * Configure a batch log record processor.
     */
    batch?: BatchLogRecordProcessor;
    /**
     * Configure a simple log record processor.
     */
    simple?: SimpleLogRecordProcessor;
}
export interface ExperimentalLoggerConfigurator {
    /**
     * Configure the default logger config used there is no matching entry in .logger_configurator/development.loggers.
     */
    default_config?: ExperimentalLoggerConfig;
    /**
     * Configure loggers.
     */
    loggers?: ExperimentalLoggerMatcherAndConfig[];
}
export interface ExperimentalLoggerMatcherAndConfig {
    /**
     * Configure logger names to match, evaluated as follows:
     *  * If the logger name exactly matches.
     *  * If the logger name matches the wildcard pattern, where '?' matches any single character
     * and '*' matches any number of characters including none.
     */
    name: string;
    /**
     * The logger config.
     */
    config: ExperimentalLoggerConfig;
}
export interface ExperimentalLoggerConfig {
    /**
     * Configure if the logger is enabled or not.
     */
    enabled?: boolean;
    /**
     * Configure severity filtering.
     * Log records with an non-zero (i.e. unspecified) severity number which is less than minimum_severity are not processed.
     */
    minimum_severity?: SeverityNumber;
    /**
     * Configure trace based filtering.
     * If true, log records associated with unsampled trace contexts traces are not processed. If false, or if a log record is not associated with a trace context, trace based filtering is not applied.
     */
    trace_based?: boolean;
}
//# sourceMappingURL=loggerProviderModel.d.ts.map