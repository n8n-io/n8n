"use strict";
/*
 * Copyright The OpenTelemetry Authors
 * SPDX-License-Identifier: Apache-2.0
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.getInstanceID = exports.getLogRecordProcessorsFromConfiguration = exports.getLogRecordExporter = exports.getBatchLogRecordProcessorFromEnv = exports.getBatchLogRecordProcessorConfigFromEnv = exports.getLoggerProviderConfigFromEnv = exports.getOtlpMetricExporterFromEnv = exports.getPeriodicExportingMetricReaderFromEnv = exports.getNonNegativeNumberFromEnv = exports.getKeyListFromObjectArray = exports.setupPropagator = exports.setupContextManager = exports.getPropagatorFromConfiguration = exports.getPropagatorFromEnv = exports.getSpanProcessorsFromEnv = exports.getOtlpProtocolFromEnv = exports.getResourceDetectorsFromConfiguration = exports.getResourceDetectorsFromEnv = exports.getResourceFromConfiguration = void 0;
const api_1 = require("@opentelemetry/api");
const core_1 = require("@opentelemetry/core");
const exporter_trace_otlp_proto_1 = require("@opentelemetry/exporter-trace-otlp-proto");
const exporter_trace_otlp_http_1 = require("@opentelemetry/exporter-trace-otlp-http");
const exporter_trace_otlp_grpc_1 = require("@opentelemetry/exporter-trace-otlp-grpc");
const exporter_zipkin_1 = require("@opentelemetry/exporter-zipkin");
const resources_1 = require("@opentelemetry/resources");
const sdk_trace_base_1 = require("@opentelemetry/sdk-trace-base");
const propagator_b3_1 = require("@opentelemetry/propagator-b3");
const propagator_jaeger_1 = require("@opentelemetry/propagator-jaeger");
const context_async_hooks_1 = require("@opentelemetry/context-async-hooks");
const exporter_logs_otlp_http_1 = require("@opentelemetry/exporter-logs-otlp-http");
const exporter_logs_otlp_grpc_1 = require("@opentelemetry/exporter-logs-otlp-grpc");
const exporter_logs_otlp_proto_1 = require("@opentelemetry/exporter-logs-otlp-proto");
const otlp_exporter_base_1 = require("@opentelemetry/otlp-exporter-base");
const sdk_metrics_1 = require("@opentelemetry/sdk-metrics");
const exporter_metrics_otlp_grpc_1 = require("@opentelemetry/exporter-metrics-otlp-grpc");
const exporter_metrics_otlp_http_1 = require("@opentelemetry/exporter-metrics-otlp-http");
const exporter_metrics_otlp_proto_1 = require("@opentelemetry/exporter-metrics-otlp-proto");
const sdk_logs_1 = require("@opentelemetry/sdk-logs");
const RESOURCE_DETECTOR_ENVIRONMENT = 'env';
const RESOURCE_DETECTOR_HOST = 'host';
const RESOURCE_DETECTOR_OS = 'os';
const RESOURCE_DETECTOR_PROCESS = 'process';
const RESOURCE_DETECTOR_SERVICE_INSTANCE_ID = 'serviceinstance';
function getResourceFromConfiguration(config) {
    if (config.resource && config.resource.attributes) {
        const attr = {};
        for (let i = 0; i < config.resource.attributes.length; i++) {
            const a = config.resource.attributes[i];
            attr[a.name] = a.value;
        }
        return (0, resources_1.resourceFromAttributes)(attr, {
            schemaUrl: config.resource.schema_url,
        });
    }
    return undefined;
}
exports.getResourceFromConfiguration = getResourceFromConfiguration;
function getResourceDetectorsFromEnv() {
    // When updating this list, make sure to also update the section `resourceDetectors` on README.
    const resourceDetectors = new Map([
        [RESOURCE_DETECTOR_HOST, resources_1.hostDetector],
        [RESOURCE_DETECTOR_OS, resources_1.osDetector],
        [RESOURCE_DETECTOR_SERVICE_INSTANCE_ID, resources_1.serviceInstanceIdDetector],
        [RESOURCE_DETECTOR_PROCESS, resources_1.processDetector],
        [RESOURCE_DETECTOR_ENVIRONMENT, resources_1.envDetector],
    ]);
    const resourceDetectorsFromEnv = (0, core_1.getStringListFromEnv)('OTEL_NODE_RESOURCE_DETECTORS') ?? ['all'];
    if (resourceDetectorsFromEnv.includes('all')) {
        return [...resourceDetectors.values()].flat();
    }
    if (resourceDetectorsFromEnv.includes('none')) {
        return [];
    }
    return resourceDetectorsFromEnv.flatMap(detector => {
        const resourceDetector = resourceDetectors.get(detector);
        if (!resourceDetector) {
            api_1.diag.warn(`Invalid resource detector "${detector}" specified in the environment variable OTEL_NODE_RESOURCE_DETECTORS`);
        }
        return resourceDetector || [];
    });
}
exports.getResourceDetectorsFromEnv = getResourceDetectorsFromEnv;
function getResourceDetectorsFromConfiguration(config) {
    // When updating this list, make sure to also update the section `resourceDetectors` on README.
    const resourceDetectors = new Map([
        [RESOURCE_DETECTOR_HOST, resources_1.hostDetector],
        [RESOURCE_DETECTOR_OS, resources_1.osDetector],
        [RESOURCE_DETECTOR_SERVICE_INSTANCE_ID, resources_1.serviceInstanceIdDetector],
        [RESOURCE_DETECTOR_PROCESS, resources_1.processDetector],
        [RESOURCE_DETECTOR_ENVIRONMENT, resources_1.envDetector],
    ]);
    const resourceDetectorsFromConfig = config.node_resource_detectors ?? [];
    if (resourceDetectorsFromConfig.includes('all')) {
        return [...resourceDetectors.values()].flat();
    }
    if (resourceDetectorsFromConfig.includes('none')) {
        return [];
    }
    return resourceDetectorsFromConfig.flatMap(detector => {
        const resourceDetector = resourceDetectors.get(detector);
        if (!resourceDetector) {
            api_1.diag.warn(`Invalid resource detector "${detector}" specified`);
        }
        return resourceDetector || [];
    });
}
exports.getResourceDetectorsFromConfiguration = getResourceDetectorsFromConfiguration;
function getOtlpProtocolFromEnv() {
    return ((0, core_1.getStringFromEnv)('OTEL_EXPORTER_OTLP_TRACES_PROTOCOL') ??
        (0, core_1.getStringFromEnv)('OTEL_EXPORTER_OTLP_PROTOCOL') ??
        'http/protobuf');
}
exports.getOtlpProtocolFromEnv = getOtlpProtocolFromEnv;
function getOtlpExporterFromEnv() {
    const protocol = getOtlpProtocolFromEnv();
    switch (protocol) {
        case 'grpc':
            return new exporter_trace_otlp_grpc_1.OTLPTraceExporter();
        case 'http/json':
            return new exporter_trace_otlp_http_1.OTLPTraceExporter();
        case 'http/protobuf':
            return new exporter_trace_otlp_proto_1.OTLPTraceExporter();
        default:
            api_1.diag.warn(`Unsupported OTLP traces protocol: ${protocol}. Using http/protobuf.`);
            return new exporter_trace_otlp_proto_1.OTLPTraceExporter();
    }
}
function getSpanProcessorsFromEnv() {
    const exportersMap = new Map([
        ['otlp', () => getOtlpExporterFromEnv()],
        ['zipkin', () => new exporter_zipkin_1.ZipkinExporter()],
        ['console', () => new sdk_trace_base_1.ConsoleSpanExporter()],
    ]);
    const exporters = [];
    const processors = [];
    let traceExportersList = Array.from(new Set((0, core_1.getStringListFromEnv)('OTEL_TRACES_EXPORTER'))).filter(s => s !== 'null');
    if (traceExportersList[0] === 'none') {
        api_1.diag.warn('OTEL_TRACES_EXPORTER contains "none". SDK will not be initialized.');
        return [];
    }
    if (traceExportersList.length === 0) {
        api_1.diag.debug('OTEL_TRACES_EXPORTER is empty. Using default otlp exporter.');
        traceExportersList = ['otlp'];
    }
    else if (traceExportersList.length > 1 &&
        traceExportersList.includes('none')) {
        api_1.diag.warn('OTEL_TRACES_EXPORTER contains "none" along with other exporters. Using default otlp exporter.');
        traceExportersList = ['otlp'];
    }
    for (const name of traceExportersList) {
        const exporter = exportersMap.get(name)?.();
        if (exporter) {
            exporters.push(exporter);
        }
        else {
            api_1.diag.warn(`Unrecognized OTEL_TRACES_EXPORTER value: ${name}.`);
        }
    }
    for (const exp of exporters) {
        if (exp instanceof sdk_trace_base_1.ConsoleSpanExporter) {
            processors.push(new sdk_trace_base_1.SimpleSpanProcessor(exp));
        }
        else {
            processors.push(new sdk_trace_base_1.BatchSpanProcessor(exp));
        }
    }
    if (exporters.length === 0) {
        api_1.diag.warn('Unable to set up trace exporter(s) due to invalid exporter and/or protocol values.');
    }
    return processors;
}
exports.getSpanProcessorsFromEnv = getSpanProcessorsFromEnv;
/**
 * Get a propagator as defined by environment variables
 */
function getPropagatorFromEnv() {
    // Empty and undefined MUST be treated equal.
    const propagatorsEnvVarValue = (0, core_1.getStringListFromEnv)('OTEL_PROPAGATORS');
    if (propagatorsEnvVarValue == null) {
        // return undefined to fall back to default
        return undefined;
    }
    if (propagatorsEnvVarValue.includes('none')) {
        return null;
    }
    // Implementation note: this only contains specification required propagators that are actually hosted in this repo.
    // Any other propagators (like aws, aws-lambda, should go into `@opentelemetry/auto-configuration-propagators` instead).
    const propagatorsFactory = new Map([
        ['tracecontext', () => new core_1.W3CTraceContextPropagator()],
        ['baggage', () => new core_1.W3CBaggagePropagator()],
        ['b3', () => new propagator_b3_1.B3Propagator()],
        [
            'b3multi',
            () => new propagator_b3_1.B3Propagator({ injectEncoding: propagator_b3_1.B3InjectEncoding.MULTI_HEADER }),
        ],
        ['jaeger', () => new propagator_jaeger_1.JaegerPropagator()],
    ]);
    // Values MUST be deduplicated in order to register a Propagator only once.
    const uniquePropagatorNames = Array.from(new Set(propagatorsEnvVarValue));
    const validPropagators = [];
    uniquePropagatorNames.forEach(name => {
        const propagator = propagatorsFactory.get(name)?.();
        if (!propagator) {
            api_1.diag.warn(`Propagator "${name}" requested through environment variable is unavailable.`);
            return;
        }
        validPropagators.push(propagator);
    });
    if (validPropagators.length === 0) {
        // null to signal that the default should **not** be used in its place.
        return null;
    }
    else if (uniquePropagatorNames.length === 1) {
        return validPropagators[0];
    }
    else {
        return new core_1.CompositePropagator({
            propagators: validPropagators,
        });
    }
}
exports.getPropagatorFromEnv = getPropagatorFromEnv;
/**
 * Get a propagator as defined by configuration model from configuration
 */
function getPropagatorFromConfiguration(config) {
    const propagatorsValue = getKeyListFromObjectArray(config.propagator?.composite);
    if (propagatorsValue == null) {
        // return undefined to fall back to default
        return undefined;
    }
    if (propagatorsValue.includes('none')) {
        return null;
    }
    // Implementation note: this only contains specification required propagators that are actually hosted in this repo.
    // Any other propagators (like aws, aws-lambda, should go into `@opentelemetry/auto-configuration-propagators` instead).
    const propagatorsFactory = new Map([
        ['tracecontext', () => new core_1.W3CTraceContextPropagator()],
        ['baggage', () => new core_1.W3CBaggagePropagator()],
        ['b3', () => new propagator_b3_1.B3Propagator()],
        [
            'b3multi',
            () => new propagator_b3_1.B3Propagator({ injectEncoding: propagator_b3_1.B3InjectEncoding.MULTI_HEADER }),
        ],
        ['jaeger', () => new propagator_jaeger_1.JaegerPropagator()],
    ]);
    // Values MUST be deduplicated in order to register a Propagator only once.
    const uniquePropagatorNames = Array.from(new Set(propagatorsValue));
    const validPropagators = [];
    uniquePropagatorNames.forEach(name => {
        const propagator = propagatorsFactory.get(name)?.();
        if (!propagator) {
            api_1.diag.warn(`Propagator "${name}" requested through configuration is unavailable.`);
            return;
        }
        validPropagators.push(propagator);
    });
    if (validPropagators.length === 0) {
        // null to signal that the default should **not** be used in its place.
        return null;
    }
    else if (uniquePropagatorNames.length === 1) {
        return validPropagators[0];
    }
    else {
        return new core_1.CompositePropagator({
            propagators: validPropagators,
        });
    }
}
exports.getPropagatorFromConfiguration = getPropagatorFromConfiguration;
function setupContextManager(contextManager) {
    // null means 'do not register'
    if (contextManager === null) {
        return;
    }
    // undefined means 'register default'
    if (contextManager === undefined) {
        const defaultContextManager = new context_async_hooks_1.AsyncLocalStorageContextManager();
        defaultContextManager.enable();
        api_1.context.setGlobalContextManager(defaultContextManager);
        return;
    }
    contextManager.enable();
    api_1.context.setGlobalContextManager(contextManager);
}
exports.setupContextManager = setupContextManager;
function setupPropagator(propagator) {
    // null means 'do not register'
    if (propagator === null) {
        return;
    }
    // undefined means 'register default'
    if (propagator === undefined) {
        api_1.propagation.setGlobalPropagator(new core_1.CompositePropagator({
            propagators: [
                new core_1.W3CTraceContextPropagator(),
                new core_1.W3CBaggagePropagator(),
            ],
        }));
        return;
    }
    api_1.propagation.setGlobalPropagator(propagator);
}
exports.setupPropagator = setupPropagator;
function getKeyListFromObjectArray(obj) {
    if (!obj || obj.length === 0) {
        return undefined;
    }
    return obj
        .map(item => Object.keys(item))
        .reduce((prev, curr) => prev.concat(curr), []);
}
exports.getKeyListFromObjectArray = getKeyListFromObjectArray;
function getNonNegativeNumberFromEnv(envVarName) {
    const value = (0, core_1.getNumberFromEnv)(envVarName);
    if (value != null && value <= 0) {
        api_1.diag.warn(`${envVarName} (${value}) is invalid, expected number greater than 0, using default.`);
        return undefined;
    }
    return value;
}
exports.getNonNegativeNumberFromEnv = getNonNegativeNumberFromEnv;
function getPeriodicExportingMetricReaderFromEnv(exporter) {
    const defaultTimeoutMillis = 30000;
    const defaultIntervalMillis = 60000;
    const rawExportIntervalMillis = getNonNegativeNumberFromEnv('OTEL_METRIC_EXPORT_INTERVAL');
    const rawExportTimeoutMillis = getNonNegativeNumberFromEnv('OTEL_METRIC_EXPORT_TIMEOUT');
    // Apply defaults
    const exportIntervalMillis = rawExportIntervalMillis ?? defaultIntervalMillis;
    let exportTimeoutMillis = rawExportTimeoutMillis ?? defaultTimeoutMillis;
    // Ensure timeout doesn't exceed interval
    if (exportTimeoutMillis > exportIntervalMillis) {
        // determine which env vars were set and which ones defaulted for logging purposes
        const timeoutSource = rawExportTimeoutMillis != null
            ? rawExportTimeoutMillis.toString()
            : `${defaultTimeoutMillis}, default`;
        const intervalSource = rawExportIntervalMillis != null
            ? rawExportIntervalMillis.toString()
            : `${defaultIntervalMillis}, default`;
        const bothSetByUser = rawExportTimeoutMillis != null && rawExportIntervalMillis != null;
        const logMessage = `OTEL_METRIC_EXPORT_TIMEOUT (${timeoutSource}) is greater than OTEL_METRIC_EXPORT_INTERVAL (${intervalSource}). Clamping timeout to interval value.`;
        // only bother users if they explicitly set both values.
        if (bothSetByUser) {
            api_1.diag.warn(logMessage);
        }
        else {
            api_1.diag.info(logMessage);
        }
        exportTimeoutMillis = exportIntervalMillis;
    }
    return new sdk_metrics_1.PeriodicExportingMetricReader({
        exportTimeoutMillis,
        exportIntervalMillis,
        exporter,
    });
}
exports.getPeriodicExportingMetricReaderFromEnv = getPeriodicExportingMetricReaderFromEnv;
function getOtlpMetricExporterFromEnv() {
    const protocol = ((0, core_1.getStringFromEnv)('OTEL_EXPORTER_OTLP_METRICS_PROTOCOL') ??
        (0, core_1.getStringFromEnv)('OTEL_EXPORTER_OTLP_PROTOCOL'))?.trim() || 'http/protobuf'; // Using || to also fall back on empty string
    switch (protocol) {
        case 'grpc':
            return new exporter_metrics_otlp_grpc_1.OTLPMetricExporter();
        case 'http/json':
            return new exporter_metrics_otlp_http_1.OTLPMetricExporter();
        case 'http/protobuf':
            return new exporter_metrics_otlp_proto_1.OTLPMetricExporter();
    }
    api_1.diag.warn(`Unsupported OTLP metrics protocol: "${protocol}". Using http/protobuf.`);
    return new exporter_metrics_otlp_proto_1.OTLPMetricExporter();
}
exports.getOtlpMetricExporterFromEnv = getOtlpMetricExporterFromEnv;
/**
 * Get LoggerProviderConfig from environment variables.
 */
function getLoggerProviderConfigFromEnv() {
    return {
        logRecordLimits: {
            attributeCountLimit: getNonNegativeNumberFromEnv('OTEL_LOGRECORD_ATTRIBUTE_COUNT_LIMIT') ??
                getNonNegativeNumberFromEnv('OTEL_ATTRIBUTE_COUNT_LIMIT'),
            attributeValueLengthLimit: getNonNegativeNumberFromEnv('OTEL_LOGRECORD_ATTRIBUTE_VALUE_LENGTH_LIMIT') ?? getNonNegativeNumberFromEnv('OTEL_ATTRIBUTE_VALUE_LENGTH_LIMIT'),
        },
    };
}
exports.getLoggerProviderConfigFromEnv = getLoggerProviderConfigFromEnv;
/**
 * Get configuration for BatchLogRecordProcessor from environment variables.
 */
function getBatchLogRecordProcessorConfigFromEnv() {
    return {
        maxQueueSize: getNonNegativeNumberFromEnv('OTEL_BLRP_MAX_QUEUE_SIZE'),
        scheduledDelayMillis: getNonNegativeNumberFromEnv('OTEL_BLRP_SCHEDULE_DELAY'),
        exportTimeoutMillis: getNonNegativeNumberFromEnv('OTEL_BLRP_EXPORT_TIMEOUT'),
        maxExportBatchSize: getNonNegativeNumberFromEnv('OTEL_BLRP_MAX_EXPORT_BATCH_SIZE'),
    };
}
exports.getBatchLogRecordProcessorConfigFromEnv = getBatchLogRecordProcessorConfigFromEnv;
function getBatchLogRecordProcessorFromEnv(exporter) {
    return new sdk_logs_1.BatchLogRecordProcessor(exporter, getBatchLogRecordProcessorConfigFromEnv());
}
exports.getBatchLogRecordProcessorFromEnv = getBatchLogRecordProcessorFromEnv;
function getLogRecordExporter(exporter) {
    if (exporter.otlp_http) {
        const encoding = exporter.otlp_http.encoding;
        if (encoding === 'json') {
            return new exporter_logs_otlp_http_1.OTLPLogExporter({
                compression: exporter.otlp_http.compression === 'gzip'
                    ? otlp_exporter_base_1.CompressionAlgorithm.GZIP
                    : otlp_exporter_base_1.CompressionAlgorithm.NONE,
            });
        }
        if (encoding === 'protobuf') {
            return new exporter_logs_otlp_proto_1.OTLPLogExporter({
                compression: exporter.otlp_http.compression === 'gzip'
                    ? otlp_exporter_base_1.CompressionAlgorithm.GZIP
                    : otlp_exporter_base_1.CompressionAlgorithm.NONE,
            });
        }
        api_1.diag.warn(`Unsupported OTLP logs encoding: ${encoding}. Using http/protobuf.`);
        return new exporter_logs_otlp_proto_1.OTLPLogExporter({
            compression: exporter.otlp_http.compression === 'gzip'
                ? otlp_exporter_base_1.CompressionAlgorithm.GZIP
                : otlp_exporter_base_1.CompressionAlgorithm.NONE,
        });
    }
    else if (exporter.otlp_grpc) {
        return new exporter_logs_otlp_grpc_1.OTLPLogExporter({
            compression: exporter.otlp_grpc.compression === 'gzip'
                ? otlp_exporter_base_1.CompressionAlgorithm.GZIP
                : otlp_exporter_base_1.CompressionAlgorithm.NONE,
        });
    }
    else if (exporter.console) {
        return new sdk_logs_1.ConsoleLogRecordExporter();
    }
    api_1.diag.warn(`Unsupported Exporter value. No Log Record Exporter registered`);
    return undefined;
}
exports.getLogRecordExporter = getLogRecordExporter;
function getLogRecordProcessorsFromConfiguration(config) {
    const logRecordProcessors = [];
    config.logger_provider?.processors?.forEach(processor => {
        if (processor.batch) {
            const exporter = getLogRecordExporter(processor.batch.exporter);
            if (exporter) {
                logRecordProcessors.push(new sdk_logs_1.BatchLogRecordProcessor(exporter, {
                    maxQueueSize: processor.batch.max_queue_size,
                    maxExportBatchSize: processor.batch.max_export_batch_size,
                    scheduledDelayMillis: processor.batch.schedule_delay,
                    exportTimeoutMillis: processor.batch.export_timeout,
                }));
            }
        }
        if (processor.simple) {
            const exporter = getLogRecordExporter(processor.simple.exporter);
            if (exporter) {
                logRecordProcessors.push(new sdk_logs_1.SimpleLogRecordProcessor(exporter));
            }
        }
    });
    if (logRecordProcessors.length > 0) {
        return logRecordProcessors;
    }
    return undefined;
}
exports.getLogRecordProcessorsFromConfiguration = getLogRecordProcessorsFromConfiguration;
function getInstanceID(config) {
    if (config.resource?.attributes) {
        for (let i = 0; i < config.resource.attributes.length; i++) {
            const element = config.resource.attributes[i];
            if (element.name === 'service.instance.id') {
                return element.value?.toString();
            }
        }
    }
    return undefined;
}
exports.getInstanceID = getInstanceID;
//# sourceMappingURL=utils.js.map