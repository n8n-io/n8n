import { ContextManager, TextMapPropagator } from '@opentelemetry/api';
import { Resource, ResourceDetector } from '@opentelemetry/resources';
import { SpanProcessor } from '@opentelemetry/sdk-trace-base';
import { ConfigurationModel, LogRecordExporterModel } from '@opentelemetry/configuration';
import { IMetricReader, PushMetricExporter } from '@opentelemetry/sdk-metrics';
import { BatchLogRecordProcessor, BufferConfig, LogRecordExporter, LoggerProviderConfig, LogRecordProcessor } from '@opentelemetry/sdk-logs';
export declare function getResourceFromConfiguration(config: ConfigurationModel): Resource | undefined;
export declare function getResourceDetectorsFromEnv(): Array<ResourceDetector>;
export declare function getResourceDetectorsFromConfiguration(config: ConfigurationModel): Array<ResourceDetector>;
export declare function getOtlpProtocolFromEnv(): string;
export declare function getSpanProcessorsFromEnv(): SpanProcessor[];
/**
 * Get a propagator as defined by environment variables
 */
export declare function getPropagatorFromEnv(): TextMapPropagator | null | undefined;
/**
 * Get a propagator as defined by configuration model from configuration
 */
export declare function getPropagatorFromConfiguration(config: ConfigurationModel): TextMapPropagator | null | undefined;
export declare function setupContextManager(contextManager: ContextManager | null | undefined): void;
export declare function setupPropagator(propagator: TextMapPropagator | null | undefined): void;
export declare function getKeyListFromObjectArray(obj: object[] | undefined): string[] | undefined;
export declare function getNonNegativeNumberFromEnv(envVarName: string): number | undefined;
export declare function getPeriodicExportingMetricReaderFromEnv(exporter: PushMetricExporter): IMetricReader;
export declare function getOtlpMetricExporterFromEnv(): PushMetricExporter;
/**
 * Get LoggerProviderConfig from environment variables.
 */
export declare function getLoggerProviderConfigFromEnv(): LoggerProviderConfig;
/**
 * Get configuration for BatchLogRecordProcessor from environment variables.
 */
export declare function getBatchLogRecordProcessorConfigFromEnv(): BufferConfig;
export declare function getBatchLogRecordProcessorFromEnv(exporter: LogRecordExporter): BatchLogRecordProcessor;
export declare function getLogRecordExporter(exporter: LogRecordExporterModel): LogRecordExporter | undefined;
export declare function getLogRecordProcessorsFromConfiguration(config: ConfigurationModel): LogRecordProcessor[] | undefined;
export declare function getInstanceID(config: ConfigurationModel): string | undefined;
//# sourceMappingURL=utils.d.ts.map