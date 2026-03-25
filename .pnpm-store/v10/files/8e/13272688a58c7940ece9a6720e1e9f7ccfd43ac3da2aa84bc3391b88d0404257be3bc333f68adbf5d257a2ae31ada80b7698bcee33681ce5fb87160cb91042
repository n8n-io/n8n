import type { TokenResolver } from './tracing/exporter/Agent365ExporterOptions';
import { Agent365ExporterOptions } from './tracing/exporter/Agent365ExporterOptions';
import { ClusterCategory, IConfigurationProvider } from '@microsoft/agents-a365-runtime';
import { type ILogger } from './utils/logging';
import type { ObservabilityConfiguration } from './configuration';
/**
 * Configuration options for Agent 365 Observability Builder
 */
export interface BuilderOptions {
    /** Custom service name for telemetry */
    serviceName?: string;
    /** Custom service version for telemetry */
    serviceVersion?: string;
    tokenResolver?: TokenResolver;
    /** Environment / cluster category (e.g., "preprod", "prod"). */
    clusterCategory?: ClusterCategory;
    /**
     * Optional partial set of exporter options allowing agent developers to customize.
     * Any values omitted will fall back to the defaults defined in Agent365ExporterOptions.
     * Values provided here will be overridden by explicitly configured tokenResolver or clusterCategory
     * from dedicated builder methods.
     */
    exporterOptions?: Partial<Agent365ExporterOptions>;
    /**
     * Optional custom logger implementation for the observability SDK.
     * If not provided, the SDK uses the default console logger.
     * Implement ILogger to integrate with other logging services
     */
    customLogger?: ILogger;
    /**
     * Optional configuration provider for ObservabilityConfiguration.
     * When provided, this is used by the builder and its internal components
     * (exporter, span processors, logger)
     */
    configProvider?: IConfigurationProvider<ObservabilityConfiguration>;
}
/**
 * Builder for configuring Agent 365 with OpenTelemetry tracing
 */
export declare class ObservabilityBuilder {
    private options;
    private isBuilt;
    private sdk?;
    /**
     * Configures the service name and version for telemetry
     * @param serviceName The service name
     * @param serviceVersion The service version
     * @returns The builder instance for method chaining
     */
    withService(serviceName: string, serviceVersion?: string): ObservabilityBuilder;
    /**
     * Configures the token resolver for Agent 365 exporter
     * @param tokenResolver Function to resolve authentication tokens
     * @returns The builder instance for method chaining
     */
    withTokenResolver(tokenResolver: TokenResolver): ObservabilityBuilder;
    /**
     * Configures the cluster category for Agent 365 exporter
     * @param clusterCategory The cluster category (e.g., "preprod", "prod")
     * @returns The builder instance for method chaining
     */
    withClusterCategory(clusterCategory: ClusterCategory): ObservabilityBuilder;
    /**
     * Provide a partial set of Agent365ExporterOptions. These will be merged with
     * defaults and any explicitly configured clusterCategory/tokenResolver.
     * @param exporterOptions Partial exporter options
     * @returns The builder instance for chaining
     */
    withExporterOptions(exporterOptions: Partial<Agent365ExporterOptions>): ObservabilityBuilder;
    /**
     * Configures the configuration provider for ObservabilityConfiguration.
     * When set, this provider is used by the builder and its internal components
     * instead of the default provider that reads from environment variables.
     * @param configProvider The configuration provider
     * @returns The builder instance for method chaining
     */
    withConfigurationProvider(configProvider: IConfigurationProvider<ObservabilityConfiguration>): ObservabilityBuilder;
    /**
     * Sets a custom logger implementation for the observability SDK
     * @param customLogger The custom logger implementation (must implement ILogger interface)
     * @returns The builder instance for method chaining
     *
     * Example with Winston:
     * ```typescript
     * const winstonLogger = winston.createLogger({...});
     * builder.withCustomLogger({
     *   info: (msg, ...args) => winstonLogger.info(msg, ...args),
     *   warn: (msg, ...args) => winstonLogger.warn(msg, ...args),
     *   error: (msg, ...args) => winstonLogger.error(msg, ...args)
     * });
     * ```
     */
    withCustomLogger(customLogger: ILogger): ObservabilityBuilder;
    private createBatchProcessor;
    private createPerRequestProcessor;
    private createExportProcessor;
    private createResource;
    /**
     * Builds and initializes the Agent 365 configuration
     * @returns The configured NodeSDK instance
     */
    build(): boolean;
    /**
     * Starts the OpenTelemetry SDK
     */
    start(): void;
    /**
     * Shuts down the OpenTelemetry SDK
     */
    shutdown(): Promise<void>;
    /**
     * Helper to avoid double-registering same processor type.
     */
    private attachProcessorIfMissing;
}
//# sourceMappingURL=ObservabilityBuilder.d.ts.map