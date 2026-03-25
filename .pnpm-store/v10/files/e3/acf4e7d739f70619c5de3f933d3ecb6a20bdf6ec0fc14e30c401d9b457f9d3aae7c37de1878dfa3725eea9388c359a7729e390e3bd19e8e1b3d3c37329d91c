// ------------------------------------------------------------------------------
// Copyright (c) Microsoft Corporation. All rights reserved.
// ------------------------------------------------------------------------------
import { NodeSDK } from '@opentelemetry/sdk-node';
import { ConsoleSpanExporter, BatchSpanProcessor } from '@opentelemetry/sdk-trace-base';
import { SpanProcessor } from './tracing/processors/SpanProcessor';
import { isAgent365ExporterEnabled, isPerRequestExportEnabled } from './tracing/exporter/utils';
import { Agent365Exporter } from './tracing/exporter/Agent365Exporter';
import { Agent365ExporterOptions } from './tracing/exporter/Agent365ExporterOptions';
import { PerRequestSpanProcessor } from './tracing/PerRequestSpanProcessor';
import { resourceFromAttributes } from '@opentelemetry/resources';
import { ATTR_SERVICE_NAME } from '@opentelemetry/semantic-conventions';
import { trace } from '@opentelemetry/api';
import { ClusterCategory } from '@microsoft/agents-a365-runtime';
import logger, { setLogger, DefaultLogger } from './utils/logging';
/**
 * Builder for configuring Agent 365 with OpenTelemetry tracing
 */
export class ObservabilityBuilder {
    constructor() {
        this.options = {};
        this.isBuilt = false;
    }
    /**
     * Configures the service name and version for telemetry
     * @param serviceName The service name
     * @param serviceVersion The service version
     * @returns The builder instance for method chaining
     */
    withService(serviceName, serviceVersion) {
        this.options.serviceName = serviceName;
        this.options.serviceVersion = serviceVersion;
        return this;
    }
    /**
     * Configures the token resolver for Agent 365 exporter
     * @param tokenResolver Function to resolve authentication tokens
     * @returns The builder instance for method chaining
     */
    withTokenResolver(tokenResolver) {
        this.options.tokenResolver = tokenResolver;
        return this;
    }
    /**
     * Configures the cluster category for Agent 365 exporter
     * @param clusterCategory The cluster category (e.g., "preprod", "prod")
     * @returns The builder instance for method chaining
     */
    withClusterCategory(clusterCategory) {
        this.options.clusterCategory = clusterCategory;
        return this;
    }
    /**
     * Provide a partial set of Agent365ExporterOptions. These will be merged with
     * defaults and any explicitly configured clusterCategory/tokenResolver.
     * @param exporterOptions Partial exporter options
     * @returns The builder instance for chaining
     */
    withExporterOptions(exporterOptions) {
        this.options.exporterOptions = {
            ...(this.options.exporterOptions || {}),
            ...exporterOptions
        };
        return this;
    }
    /**
     * Configures the configuration provider for ObservabilityConfiguration.
     * When set, this provider is used by the builder and its internal components
     * instead of the default provider that reads from environment variables.
     * @param configProvider The configuration provider
     * @returns The builder instance for method chaining
     */
    withConfigurationProvider(configProvider) {
        this.options.configProvider = configProvider;
        return this;
    }
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
    withCustomLogger(customLogger) {
        this.options.customLogger = customLogger;
        return this;
    }
    createBatchProcessor() {
        if (!isAgent365ExporterEnabled(this.options.configProvider)) {
            logger.info('[ObservabilityBuilder] Agent 365 exporter not enabled. Using ConsoleSpanExporter for BatchSpanProcessor.');
            return new BatchSpanProcessor(new ConsoleSpanExporter());
        }
        const opts = new Agent365ExporterOptions();
        if (this.options.exporterOptions) {
            Object.assign(opts, this.options.exporterOptions);
        }
        opts.clusterCategory = this.options.clusterCategory || opts.clusterCategory || ClusterCategory.prod;
        if (this.options.tokenResolver) {
            opts.tokenResolver = this.options.tokenResolver;
        }
        return new BatchSpanProcessor(new Agent365Exporter(opts, this.options.configProvider), {
            maxQueueSize: opts.maxQueueSize,
            scheduledDelayMillis: opts.scheduledDelayMilliseconds,
            exportTimeoutMillis: opts.exporterTimeoutMilliseconds,
            maxExportBatchSize: opts.maxExportBatchSize
        });
    }
    createPerRequestProcessor() {
        if (!isAgent365ExporterEnabled(this.options.configProvider)) {
            logger.info('[Agent365Exporter] Per-request export enabled but Agent 365 exporter is disabled. Using ConsoleSpanExporter.');
            return new PerRequestSpanProcessor(new ConsoleSpanExporter());
        }
        const opts = new Agent365ExporterOptions();
        if (this.options.exporterOptions) {
            Object.assign(opts, this.options.exporterOptions);
        }
        opts.clusterCategory = this.options.clusterCategory || opts.clusterCategory || ClusterCategory.prod;
        // For per-request export, token is retrieved from OTel Context by Agent365Exporter
        // using getExportToken(), so no tokenResolver is needed here
        return new PerRequestSpanProcessor(new Agent365Exporter(opts, this.options.configProvider));
    }
    createExportProcessor() {
        if (isPerRequestExportEnabled()) {
            return this.createPerRequestProcessor();
        }
        return this.createBatchProcessor();
    }
    createResource() {
        const serviceName = this.options.serviceVersion
            ? `${this.options.serviceName}-${this.options.serviceVersion}`
            : this.options.serviceName ?? 'Agent365-TypeScript';
        return resourceFromAttributes({
            [ATTR_SERVICE_NAME]: serviceName,
        });
    }
    /**
     * Builds and initializes the Agent 365 configuration
     * @returns The configured NodeSDK instance
     */
    build() {
        if (this.isBuilt) {
            return this.isBuilt;
        }
        // Apply custom logger if provided, or configure logger with custom config provider
        if (this.options.customLogger) {
            setLogger(this.options.customLogger);
        }
        else if (this.options.configProvider) {
            setLogger(new DefaultLogger(this.options.configProvider));
        }
        // Create processors in the desired order:
        // 1. baggage enricher (copies baggage -> span attributes)
        const spanProcessor = new SpanProcessor();
        // 2. export processor (batch or per-request based on environment variable)
        const exportProcessor = this.createExportProcessor();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const globalProvider = trace.getTracerProvider();
        const canAddProcessors = typeof globalProvider?.addSpanProcessor === 'function' &&
            typeof globalProvider?.resource !== 'undefined';
        if (canAddProcessors) {
            // Someone else already created a provider (maybe their own NodeSDK).
            // We DO NOT create a new NodeSDK.
            // We just add our baggage enricher + export processor to their provider,
            // but only if they aren't already there.
            this.attachProcessorIfMissing(globalProvider, spanProcessor);
            this.attachProcessorIfMissing(globalProvider, exportProcessor);
            this.isBuilt = true;
            this.sdk = undefined; // we didn't create/own one
            return this.isBuilt;
        }
        // Create & configure the NodeSDK manually so we can inject processors + resource.
        this.sdk = new NodeSDK({
            resource: this.createResource(),
            spanProcessors: [
                spanProcessor,
                exportProcessor,
            ],
        });
        this.isBuilt = true;
        return this.isBuilt;
    }
    /**
     * Starts the OpenTelemetry SDK
     */
    start() {
        if (!this.isBuilt) {
            this.build();
        }
        if (this.sdk) {
            this.sdk.start();
        }
    }
    /**
     * Shuts down the OpenTelemetry SDK
     */
    async shutdown() {
        if (this.sdk) {
            await this.sdk.shutdown();
        }
    }
    /**
     * Helper to avoid double-registering same processor type.
     */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    attachProcessorIfMissing(provider, processor) {
        const active = provider._activeSpanProcessor?._spanProcessors;
        const alreadyAdded = Array.isArray(active) &&
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            active.some((p) => p?.constructor?.name === processor.constructor.name);
        if (!alreadyAdded) {
            provider.addSpanProcessor(processor);
        }
    }
}
//# sourceMappingURL=ObservabilityBuilder.js.map