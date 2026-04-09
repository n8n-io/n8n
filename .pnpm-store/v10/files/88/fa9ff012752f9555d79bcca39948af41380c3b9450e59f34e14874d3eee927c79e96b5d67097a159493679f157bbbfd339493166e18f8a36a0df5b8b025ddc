import { LogRecordProcessor } from '@opentelemetry/sdk-logs';
import { IMetricReader, ViewOptions } from '@opentelemetry/sdk-metrics';
import { NodeSDKConfiguration } from './types';
export type MeterProviderConfig = {
    /**
     * Reference to the MetricReader instances by the NodeSDK
     */
    readers?: IMetricReader[];
    /**
     * List of {@link ViewOptions}s that should be passed to the MeterProvider
     */
    views?: ViewOptions[];
};
export type LoggerProviderConfig = {
    /**
     * Reference to the LoggerRecordProcessor instance by the NodeSDK
     */
    logRecordProcessors: LogRecordProcessor[];
};
/**
 * A setup helper for the OpenTelemetry SDKs (logs, metrics, traces).
 * <p> After successful setup using {@link NodeSDK#start()}, use `@opentelemetry/api` to obtain the registered components.
 * <p> Use the shutdown handler {@link NodeSDK#shutdown()} to ensure your telemetry is exported before the process exits.
 *
 * @example <caption> Register SDK by using environment variables </caption>
 *    const nodeSdk = new NodeSDK(); // providing no options uses OTEL_* environment variables for SDK setup.
 *    nodeSdk.start(); // registers all configured SDK components
 * @example <caption> Override environment variable config with your own components </caption>
 *    const nodeSdk = new NodeSDK({
 *      // override the list of metric reader with your own options and ignore environment variable config
 *      // explore the docs of other options to learn more!
 *      metricReaders: [ new PeriodicExportingMetricReader({
 *        exporter: new OTLPMetricsExporter()
 *        })]
 *    });
 *    nodeSdk.start(); // registers all configured SDK components
 */
export declare class NodeSDK {
    private _tracerProviderConfig?;
    private _loggerProviderConfig?;
    private _meterProviderConfig?;
    private _instrumentations;
    private _resource;
    private _resourceDetectors;
    private _autoDetectResources;
    private _tracerProvider?;
    private _loggerProvider?;
    private _meterProvider?;
    private _serviceName?;
    private _configuration?;
    private _disabled?;
    /**
     * Create a new NodeJS SDK instance
     */
    constructor(configuration?: Partial<NodeSDKConfiguration>);
    /**
     * Call this method to construct SDK components and register them with the OpenTelemetry API.
     */
    start(): void;
    shutdown(): Promise<void>;
    private configureLoggerProviderFromEnv;
}
//# sourceMappingURL=sdk.d.ts.map