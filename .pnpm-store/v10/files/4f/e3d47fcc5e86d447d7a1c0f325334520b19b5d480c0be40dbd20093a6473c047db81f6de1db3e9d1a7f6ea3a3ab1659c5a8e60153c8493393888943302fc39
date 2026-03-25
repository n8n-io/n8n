"use strict";
// ------------------------------------------------------------------------------
// Copyright (c) Microsoft Corporation. All rights reserved.
// ------------------------------------------------------------------------------
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.ObservabilityBuilder = void 0;
const sdk_node_1 = require("@opentelemetry/sdk-node");
const sdk_trace_base_1 = require("@opentelemetry/sdk-trace-base");
const SpanProcessor_1 = require("./tracing/processors/SpanProcessor");
const utils_1 = require("./tracing/exporter/utils");
const Agent365Exporter_1 = require("./tracing/exporter/Agent365Exporter");
const Agent365ExporterOptions_1 = require("./tracing/exporter/Agent365ExporterOptions");
const PerRequestSpanProcessor_1 = require("./tracing/PerRequestSpanProcessor");
const resources_1 = require("@opentelemetry/resources");
const semantic_conventions_1 = require("@opentelemetry/semantic-conventions");
const api_1 = require("@opentelemetry/api");
const agents_a365_runtime_1 = require("@microsoft/agents-a365-runtime");
const logging_1 = __importStar(require("./utils/logging"));
/**
 * Builder for configuring Agent 365 with OpenTelemetry tracing
 */
class ObservabilityBuilder {
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
        if (!(0, utils_1.isAgent365ExporterEnabled)(this.options.configProvider)) {
            logging_1.default.info('[ObservabilityBuilder] Agent 365 exporter not enabled. Using ConsoleSpanExporter for BatchSpanProcessor.');
            return new sdk_trace_base_1.BatchSpanProcessor(new sdk_trace_base_1.ConsoleSpanExporter());
        }
        const opts = new Agent365ExporterOptions_1.Agent365ExporterOptions();
        if (this.options.exporterOptions) {
            Object.assign(opts, this.options.exporterOptions);
        }
        opts.clusterCategory = this.options.clusterCategory || opts.clusterCategory || agents_a365_runtime_1.ClusterCategory.prod;
        if (this.options.tokenResolver) {
            opts.tokenResolver = this.options.tokenResolver;
        }
        return new sdk_trace_base_1.BatchSpanProcessor(new Agent365Exporter_1.Agent365Exporter(opts, this.options.configProvider), {
            maxQueueSize: opts.maxQueueSize,
            scheduledDelayMillis: opts.scheduledDelayMilliseconds,
            exportTimeoutMillis: opts.exporterTimeoutMilliseconds,
            maxExportBatchSize: opts.maxExportBatchSize
        });
    }
    createPerRequestProcessor() {
        if (!(0, utils_1.isAgent365ExporterEnabled)(this.options.configProvider)) {
            logging_1.default.info('[Agent365Exporter] Per-request export enabled but Agent 365 exporter is disabled. Using ConsoleSpanExporter.');
            return new PerRequestSpanProcessor_1.PerRequestSpanProcessor(new sdk_trace_base_1.ConsoleSpanExporter());
        }
        const opts = new Agent365ExporterOptions_1.Agent365ExporterOptions();
        if (this.options.exporterOptions) {
            Object.assign(opts, this.options.exporterOptions);
        }
        opts.clusterCategory = this.options.clusterCategory || opts.clusterCategory || agents_a365_runtime_1.ClusterCategory.prod;
        // For per-request export, token is retrieved from OTel Context by Agent365Exporter
        // using getExportToken(), so no tokenResolver is needed here
        return new PerRequestSpanProcessor_1.PerRequestSpanProcessor(new Agent365Exporter_1.Agent365Exporter(opts, this.options.configProvider));
    }
    createExportProcessor() {
        if ((0, utils_1.isPerRequestExportEnabled)()) {
            return this.createPerRequestProcessor();
        }
        return this.createBatchProcessor();
    }
    createResource() {
        const serviceName = this.options.serviceVersion
            ? `${this.options.serviceName}-${this.options.serviceVersion}`
            : this.options.serviceName ?? 'Agent365-TypeScript';
        return (0, resources_1.resourceFromAttributes)({
            [semantic_conventions_1.ATTR_SERVICE_NAME]: serviceName,
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
            (0, logging_1.setLogger)(this.options.customLogger);
        }
        else if (this.options.configProvider) {
            (0, logging_1.setLogger)(new logging_1.DefaultLogger(this.options.configProvider));
        }
        // Create processors in the desired order:
        // 1. baggage enricher (copies baggage -> span attributes)
        const spanProcessor = new SpanProcessor_1.SpanProcessor();
        // 2. export processor (batch or per-request based on environment variable)
        const exportProcessor = this.createExportProcessor();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const globalProvider = api_1.trace.getTracerProvider();
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
        this.sdk = new sdk_node_1.NodeSDK({
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
exports.ObservabilityBuilder = ObservabilityBuilder;
//# sourceMappingURL=ObservabilityBuilder.js.map