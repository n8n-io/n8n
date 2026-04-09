"use strict";
/*
 * Copyright The OpenTelemetry Authors
 * SPDX-License-Identifier: Apache-2.0
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.NodeSDK = void 0;
const api_1 = require("@opentelemetry/api");
const api_logs_1 = require("@opentelemetry/api-logs");
const instrumentation_1 = require("@opentelemetry/instrumentation");
const resources_1 = require("@opentelemetry/resources");
const sdk_logs_1 = require("@opentelemetry/sdk-logs");
const exporter_logs_otlp_http_1 = require("@opentelemetry/exporter-logs-otlp-http");
const exporter_logs_otlp_grpc_1 = require("@opentelemetry/exporter-logs-otlp-grpc");
const exporter_logs_otlp_proto_1 = require("@opentelemetry/exporter-logs-otlp-proto");
const exporter_prometheus_1 = require("@opentelemetry/exporter-prometheus");
const sdk_metrics_1 = require("@opentelemetry/sdk-metrics");
const sdk_trace_base_1 = require("@opentelemetry/sdk-trace-base");
const sdk_trace_node_1 = require("@opentelemetry/sdk-trace-node");
const semantic_conventions_1 = require("@opentelemetry/semantic-conventions");
const core_1 = require("@opentelemetry/core");
const utils_1 = require("./utils");
/**
 *
 * @returns MetricReader[] if appropriate environment variables are configured
 */
function getMetricReadersFromEnv() {
    const metricReaders = [];
    const enabledExporters = Array.from(new Set((0, core_1.getStringListFromEnv)('OTEL_METRICS_EXPORTER') ?? []));
    if (enabledExporters.length === 0) {
        api_1.diag.debug('OTEL_METRICS_EXPORTER is empty. Using default otlp exporter.');
        enabledExporters.push('otlp');
    }
    if (enabledExporters.includes('none')) {
        api_1.diag.info(`OTEL_METRICS_EXPORTER contains "none". Metric provider will not be initialized.`);
        return metricReaders;
    }
    enabledExporters.forEach(exporter => {
        if (exporter === 'otlp') {
            metricReaders.push((0, utils_1.getPeriodicExportingMetricReaderFromEnv)((0, utils_1.getOtlpMetricExporterFromEnv)()));
        }
        else if (exporter === 'console') {
            metricReaders.push(new sdk_metrics_1.PeriodicExportingMetricReader({
                exporter: new sdk_metrics_1.ConsoleMetricExporter(),
            }));
        }
        else if (exporter === 'prometheus') {
            metricReaders.push(new exporter_prometheus_1.PrometheusExporter());
        }
        else {
            api_1.diag.warn(`Unsupported OTEL_METRICS_EXPORTER value: "${exporter}". Supported values are: otlp, console, prometheus, none.`);
        }
    });
    return metricReaders;
}
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
class NodeSDK {
    _tracerProviderConfig;
    _loggerProviderConfig;
    _meterProviderConfig;
    _instrumentations;
    _resource;
    _resourceDetectors;
    _autoDetectResources;
    _tracerProvider;
    _loggerProvider;
    _meterProvider;
    _serviceName;
    _configuration;
    _disabled;
    /**
     * Create a new NodeJS SDK instance
     */
    constructor(configuration = {}) {
        if ((0, core_1.getBooleanFromEnv)('OTEL_SDK_DISABLED')) {
            this._disabled = true;
            // Functions with possible side-effects are set
            // to no-op via the _disabled flag
        }
        const logLevel = (0, core_1.getStringFromEnv)('OTEL_LOG_LEVEL');
        if (logLevel != null) {
            api_1.diag.setLogger(new api_1.DiagConsoleLogger(), {
                logLevel: (0, core_1.diagLogLevelFromString)(logLevel),
            });
        }
        this._configuration = configuration;
        this._resource = configuration.resource ?? (0, resources_1.defaultResource)();
        this._autoDetectResources = configuration.autoDetectResources ?? true;
        if (!this._autoDetectResources) {
            this._resourceDetectors = [];
        }
        else if (configuration.resourceDetectors != null) {
            this._resourceDetectors = configuration.resourceDetectors;
        }
        else if ((0, core_1.getStringFromEnv)('OTEL_NODE_RESOURCE_DETECTORS')) {
            this._resourceDetectors = (0, utils_1.getResourceDetectorsFromEnv)();
        }
        else {
            this._resourceDetectors = [resources_1.envDetector, resources_1.processDetector, resources_1.hostDetector];
        }
        this._serviceName = configuration.serviceName;
        // If a tracer provider can be created from manual configuration, create it
        if (configuration.traceExporter ||
            configuration.spanProcessor ||
            configuration.spanProcessors) {
            const tracerProviderConfig = {};
            if (configuration.sampler) {
                tracerProviderConfig.sampler = configuration.sampler;
            }
            if (configuration.spanLimits) {
                tracerProviderConfig.spanLimits = configuration.spanLimits;
            }
            if (configuration.idGenerator) {
                tracerProviderConfig.idGenerator = configuration.idGenerator;
            }
            if (configuration.spanProcessor) {
                api_1.diag.warn("The 'spanProcessor' option is deprecated. Please use 'spanProcessors' instead.");
            }
            const spanProcessor = configuration.spanProcessor ??
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                new sdk_trace_base_1.BatchSpanProcessor(configuration.traceExporter);
            const spanProcessors = configuration.spanProcessors ?? [spanProcessor];
            this._tracerProviderConfig = {
                tracerConfig: tracerProviderConfig,
                spanProcessors,
            };
        }
        if (configuration.logRecordProcessors) {
            this._loggerProviderConfig = {
                logRecordProcessors: configuration.logRecordProcessors,
            };
        }
        else if (configuration.logRecordProcessor) {
            this._loggerProviderConfig = {
                logRecordProcessors: [configuration.logRecordProcessor],
            };
            api_1.diag.warn("The 'logRecordProcessor' option is deprecated. Please use 'logRecordProcessors' instead.");
        }
        else {
            this.configureLoggerProviderFromEnv();
        }
        if (configuration.metricReaders) {
            this._meterProviderConfig = {
                readers: configuration.metricReaders,
                views: configuration.views,
            };
        }
        else if (configuration.metricReader) {
            this._meterProviderConfig = {
                readers: [configuration.metricReader],
                views: configuration.views,
            };
            api_1.diag.warn("The 'metricReader' option is deprecated. Please use 'metricReaders' instead.");
        }
        else {
            this._meterProviderConfig = {
                readers: getMetricReadersFromEnv(),
                views: configuration.views,
            };
        }
        this._instrumentations = configuration.instrumentations?.flat() ?? [];
    }
    /**
     * Call this method to construct SDK components and register them with the OpenTelemetry API.
     */
    start() {
        if (this._disabled) {
            return;
        }
        (0, instrumentation_1.registerInstrumentations)({
            instrumentations: this._instrumentations,
        });
        (0, utils_1.setupContextManager)(this._configuration?.contextManager);
        (0, utils_1.setupPropagator)(this._configuration?.textMapPropagator === null
            ? null // null means don't set, so we cannot fall back to env config.
            : (this._configuration?.textMapPropagator ?? (0, utils_1.getPropagatorFromEnv)()));
        if (this._autoDetectResources) {
            const internalConfig = {
                detectors: this._resourceDetectors,
            };
            this._resource = this._resource.merge((0, resources_1.detectResources)(internalConfig));
        }
        this._resource =
            this._serviceName === undefined
                ? this._resource
                : this._resource.merge((0, resources_1.resourceFromAttributes)({
                    [semantic_conventions_1.ATTR_SERVICE_NAME]: this._serviceName,
                }));
        if (this._meterProviderConfig?.readers &&
            // only register if there is a reader, otherwise we waste compute/memory.
            this._meterProviderConfig.readers.length > 0) {
            const meterProvider = new sdk_metrics_1.MeterProvider({
                resource: this._resource,
                views: this._meterProviderConfig?.views ?? [],
                readers: this._meterProviderConfig.readers,
            });
            this._meterProvider = meterProvider;
            api_1.metrics.setGlobalMeterProvider(meterProvider);
            // TODO: This is a workaround to fix https://github.com/open-telemetry/opentelemetry-js/issues/3609
            // If the MeterProvider is not yet registered when instrumentations are registered, all metrics are dropped.
            // This code is obsolete once https://github.com/open-telemetry/opentelemetry-js/issues/3622 is implemented.
            for (const instrumentation of this._instrumentations) {
                instrumentation.setMeterProvider(api_1.metrics.getMeterProvider());
            }
        }
        const spanProcessors = this._tracerProviderConfig
            ? this._tracerProviderConfig.spanProcessors
            : (0, utils_1.getSpanProcessorsFromEnv)();
        // Only register if there is a span processor
        if (spanProcessors.length > 0) {
            // While SDK metrics are unstable, we require an opt-in.
            // https://opentelemetry.io/docs/specs/semconv/otel/sdk-metrics/
            const sdkMetricsEnabled = (0, core_1.getBooleanFromEnv)('OTEL_NODE_EXPERIMENTAL_SDK_METRICS');
            this._tracerProvider = new sdk_trace_node_1.NodeTracerProvider({
                ...this._configuration,
                resource: this._resource,
                meterProvider: sdkMetricsEnabled ? this._meterProvider : undefined,
                spanProcessors,
            });
            api_1.trace.setGlobalTracerProvider(this._tracerProvider);
        }
        if (this._loggerProviderConfig) {
            const loggerProvider = new sdk_logs_1.LoggerProvider({
                ...(0, utils_1.getLoggerProviderConfigFromEnv)(),
                resource: this._resource,
                processors: this._loggerProviderConfig.logRecordProcessors,
            });
            this._loggerProvider = loggerProvider;
            api_logs_1.logs.setGlobalLoggerProvider(loggerProvider);
        }
    }
    shutdown() {
        const promises = [];
        if (this._tracerProvider) {
            promises.push(this._tracerProvider.shutdown());
        }
        if (this._loggerProvider) {
            promises.push(this._loggerProvider.shutdown());
        }
        if (this._meterProvider) {
            promises.push(this._meterProvider.shutdown());
        }
        return (Promise.all(promises)
            // return void instead of the array from Promise.all
            .then(() => { }));
    }
    configureLoggerProviderFromEnv() {
        const enabledExporters = Array.from(new Set((0, core_1.getStringListFromEnv)('OTEL_LOGS_EXPORTER') ?? []));
        if (enabledExporters.length === 0) {
            api_1.diag.debug('OTEL_LOGS_EXPORTER is empty. Using default otlp exporter.');
            enabledExporters.push('otlp');
        }
        if (enabledExporters.includes('none')) {
            api_1.diag.info(`OTEL_LOGS_EXPORTER contains "none". Logger provider will not be initialized.`);
            return;
        }
        const exporters = [];
        enabledExporters.forEach(exporter => {
            if (exporter === 'otlp') {
                const protocol = ((0, core_1.getStringFromEnv)('OTEL_EXPORTER_OTLP_LOGS_PROTOCOL') ??
                    (0, core_1.getStringFromEnv)('OTEL_EXPORTER_OTLP_PROTOCOL'))?.trim() || 'http/protobuf'; // Using || to also fall back on empty string
                switch (protocol) {
                    case 'grpc':
                        exporters.push(new exporter_logs_otlp_grpc_1.OTLPLogExporter());
                        break;
                    case 'http/json':
                        exporters.push(new exporter_logs_otlp_http_1.OTLPLogExporter());
                        break;
                    case 'http/protobuf':
                        exporters.push(new exporter_logs_otlp_proto_1.OTLPLogExporter());
                        break;
                    default:
                        api_1.diag.warn(`Unsupported OTLP logs protocol: "${protocol}". Using http/protobuf.`);
                        exporters.push(new exporter_logs_otlp_proto_1.OTLPLogExporter());
                }
            }
            else if (exporter === 'console') {
                exporters.push(new sdk_logs_1.ConsoleLogRecordExporter());
            }
            else {
                api_1.diag.warn(`Unsupported OTEL_LOGS_EXPORTER value: "${exporter}". Supported values are: otlp, console, none.`);
            }
        });
        if (exporters.length > 0) {
            this._loggerProviderConfig = {
                logRecordProcessors: exporters.map(exporter => {
                    if (exporter instanceof sdk_logs_1.ConsoleLogRecordExporter) {
                        return new sdk_logs_1.SimpleLogRecordProcessor(exporter);
                    }
                    else {
                        return (0, utils_1.getBatchLogRecordProcessorFromEnv)(exporter);
                    }
                }),
            };
        }
    }
}
exports.NodeSDK = NodeSDK;
//# sourceMappingURL=sdk.js.map