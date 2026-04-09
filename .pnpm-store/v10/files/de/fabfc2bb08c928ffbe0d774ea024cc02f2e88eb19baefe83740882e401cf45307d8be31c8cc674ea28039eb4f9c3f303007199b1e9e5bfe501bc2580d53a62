"use strict";
/*
 * Copyright The OpenTelemetry Authors
 * SPDX-License-Identifier: Apache-2.0
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.setLoggerProvider = exports.setMeterProvider = exports.setTracerProvider = exports.setPropagators = exports.setAttributeLimits = exports.setResources = exports.EnvironmentConfigFactory = void 0;
const configModel_1 = require("./models/configModel");
const core_1 = require("@opentelemetry/core");
const meterProviderModel_1 = require("./models/meterProviderModel");
const commonModel_1 = require("./models/commonModel");
const api_1 = require("@opentelemetry/api");
const tracerProviderModel_1 = require("./models/tracerProviderModel");
const loggerProviderModel_1 = require("./models/loggerProviderModel");
const utils_1 = require("./utils");
/**
 * EnvironmentConfigProvider provides a configuration based on environment variables.
 */
class EnvironmentConfigFactory {
    _config;
    constructor() {
        this._config = (0, configModel_1.initializeDefaultConfiguration)();
        this._config.disabled = (0, core_1.getBooleanFromEnv)('OTEL_SDK_DISABLED');
        const logLevel = (0, core_1.diagLogLevelFromString)((0, core_1.getStringFromEnv)('OTEL_LOG_LEVEL'));
        if (logLevel) {
            this._config.log_level = logLevel;
        }
        const nodeResourceDetectors = (0, core_1.getStringListFromEnv)('OTEL_NODE_RESOURCE_DETECTORS');
        if (nodeResourceDetectors) {
            this._config.node_resource_detectors = nodeResourceDetectors;
        }
        setResources(this._config);
        setAttributeLimits(this._config);
        setPropagators(this._config);
        setTracerProvider(this._config);
        setMeterProvider(this._config);
        setLoggerProvider(this._config);
    }
    getConfigModel() {
        return this._config;
    }
}
exports.EnvironmentConfigFactory = EnvironmentConfigFactory;
function setResources(config) {
    if (config.resource == null) {
        config.resource = {};
    }
    const resourceAttrList = (0, core_1.getStringFromEnv)('OTEL_RESOURCE_ATTRIBUTES');
    const list = (0, core_1.getStringListFromEnv)('OTEL_RESOURCE_ATTRIBUTES');
    const serviceName = (0, core_1.getStringFromEnv)('OTEL_SERVICE_NAME');
    if (serviceName) {
        config.resource.attributes = [
            {
                name: 'service.name',
                value: serviceName,
                type: 'string',
            },
        ];
    }
    if (list && list.length > 0) {
        config.resource.attributes_list = resourceAttrList;
        if (config.resource.attributes == null) {
            config.resource.attributes = [];
        }
        for (let i = 0; i < list.length; i++) {
            const element = list[i].split('=');
            if (element[0] !== 'service.name' ||
                (element[0] === 'service.name' && serviceName === undefined)) {
                config.resource.attributes.push({
                    name: element[0],
                    value: element[1],
                    type: 'string',
                });
            }
        }
    }
}
exports.setResources = setResources;
function setAttributeLimits(config) {
    const attributeValueLengthLimit = (0, core_1.getNumberFromEnv)('OTEL_ATTRIBUTE_VALUE_LENGTH_LIMIT');
    if (attributeValueLengthLimit && attributeValueLengthLimit > 0) {
        if (config.attribute_limits == null) {
            config.attribute_limits = { attribute_count_limit: 128 };
        }
        config.attribute_limits.attribute_value_length_limit =
            attributeValueLengthLimit;
    }
    const attributeCountLimit = (0, core_1.getNumberFromEnv)('OTEL_ATTRIBUTE_COUNT_LIMIT');
    if (attributeCountLimit) {
        if (config.attribute_limits == null) {
            config.attribute_limits = { attribute_count_limit: attributeCountLimit };
        }
        else {
            config.attribute_limits.attribute_count_limit = attributeCountLimit;
        }
    }
}
exports.setAttributeLimits = setAttributeLimits;
function setPropagators(config) {
    if (config.propagator == null) {
        config.propagator = {};
    }
    const composite = (0, core_1.getStringListFromEnv)('OTEL_PROPAGATORS');
    if (composite && composite.length > 0) {
        config.propagator.composite = [];
        for (let i = 0; i < composite.length; i++) {
            config.propagator.composite.push({ [composite[i]]: null });
        }
    }
    const compositeList = (0, core_1.getStringFromEnv)('OTEL_PROPAGATORS');
    if (compositeList) {
        config.propagator.composite_list = compositeList;
    }
}
exports.setPropagators = setPropagators;
function setTracerProvider(config) {
    const exportersType = Array.from(new Set((0, core_1.getStringListFromEnv)('OTEL_TRACES_EXPORTER')));
    if (exportersType.length === 0) {
        return;
    }
    if (exportersType.includes('none')) {
        api_1.diag.info(`OTEL_TRACES_EXPORTER contains "none". Tracer provider will not be initialized.`);
        return;
    }
    config.tracer_provider = (0, tracerProviderModel_1.initializeDefaultTracerProviderConfiguration)();
    const attributeValueLengthLimit = (0, core_1.getNumberFromEnv)('OTEL_SPAN_ATTRIBUTE_VALUE_LENGTH_LIMIT');
    if (attributeValueLengthLimit) {
        config.tracer_provider.limits.attribute_value_length_limit =
            attributeValueLengthLimit;
    }
    const attributeCountLimit = (0, core_1.getNumberFromEnv)('OTEL_SPAN_ATTRIBUTE_COUNT_LIMIT');
    if (attributeCountLimit) {
        config.tracer_provider.limits.attribute_count_limit = attributeCountLimit;
    }
    const eventCountLimit = (0, core_1.getNumberFromEnv)('OTEL_SPAN_EVENT_COUNT_LIMIT');
    if (eventCountLimit) {
        config.tracer_provider.limits.event_count_limit = eventCountLimit;
    }
    const linkCountLimit = (0, core_1.getNumberFromEnv)('OTEL_SPAN_LINK_COUNT_LIMIT');
    if (linkCountLimit) {
        config.tracer_provider.limits.link_count_limit = linkCountLimit;
    }
    const eventAttributeCountLimit = (0, core_1.getNumberFromEnv)('OTEL_EVENT_ATTRIBUTE_COUNT_LIMIT');
    if (eventAttributeCountLimit) {
        config.tracer_provider.limits.event_attribute_count_limit =
            eventAttributeCountLimit;
    }
    const linkAttributeCountLimit = (0, core_1.getNumberFromEnv)('OTEL_LINK_ATTRIBUTE_COUNT_LIMIT');
    if (linkAttributeCountLimit) {
        config.tracer_provider.limits.link_attribute_count_limit =
            linkAttributeCountLimit;
    }
    const batch = { exporter: {} };
    const scheduleDelay = (0, core_1.getNumberFromEnv)('OTEL_BSP_SCHEDULE_DELAY') ?? 5000;
    if (scheduleDelay) {
        batch.schedule_delay = scheduleDelay;
    }
    const exportTimeout = (0, core_1.getNumberFromEnv)('OTEL_BSP_EXPORT_TIMEOUT') ?? 30000;
    if (exportTimeout) {
        batch.export_timeout = exportTimeout;
    }
    const maxQueueSize = (0, core_1.getNumberFromEnv)('OTEL_BSP_MAX_QUEUE_SIZE') ?? 2048;
    if (maxQueueSize) {
        batch.max_queue_size = maxQueueSize;
    }
    const maxExportBatchSize = (0, core_1.getNumberFromEnv)('OTEL_BSP_MAX_EXPORT_BATCH_SIZE') ?? 512;
    if (maxExportBatchSize) {
        batch.max_export_batch_size = maxExportBatchSize;
    }
    for (let i = 0; i < exportersType.length; i++) {
        const exporterType = exportersType[i];
        const batchInfo = { ...batch };
        if (exporterType === 'console') {
            config.tracer_provider.processors.push({
                simple: { exporter: { console: {} } },
            });
        }
        else {
            // 'otlp' and default
            const protocol = (0, core_1.getStringFromEnv)('OTEL_EXPORTER_OTLP_TRACES_PROTOCOL') ??
                (0, core_1.getStringFromEnv)('OTEL_EXPORTER_OTLP_PROTOCOL') ??
                'http/protobuf';
            const certificateFile = (0, core_1.getStringFromEnv)('OTEL_EXPORTER_OTLP_TRACES_CERTIFICATE') ??
                (0, core_1.getStringFromEnv)('OTEL_EXPORTER_OTLP_CERTIFICATE');
            const clientKeyFile = (0, core_1.getStringFromEnv)('OTEL_EXPORTER_OTLP_TRACES_CLIENT_KEY') ??
                (0, core_1.getStringFromEnv)('OTEL_EXPORTER_OTLP_CLIENT_KEY');
            const clientCertificateFile = (0, core_1.getStringFromEnv)('OTEL_EXPORTER_OTLP_TRACES_CLIENT_CERTIFICATE') ??
                (0, core_1.getStringFromEnv)('OTEL_EXPORTER_OTLP_CLIENT_CERTIFICATE');
            const compression = (0, core_1.getStringFromEnv)('OTEL_EXPORTER_OTLP_TRACES_COMPRESSION') ??
                (0, core_1.getStringFromEnv)('OTEL_EXPORTER_OTLP_COMPRESSION');
            const timeout = (0, core_1.getNumberFromEnv)('OTEL_EXPORTER_OTLP_TRACES_TIMEOUT') ??
                (0, core_1.getNumberFromEnv)('OTEL_EXPORTER_OTLP_TIMEOUT') ??
                10000;
            const headersList = (0, core_1.getStringFromEnv)('OTEL_EXPORTER_OTLP_TRACES_HEADERS') ??
                (0, core_1.getStringFromEnv)('OTEL_EXPORTER_OTLP_HEADERS');
            if (protocol === 'grpc') {
                delete batchInfo.exporter.otlp_http;
                batchInfo.exporter.otlp_grpc = {};
                const endpoint = (0, core_1.getStringFromEnv)('OTEL_EXPORTER_OTLP_TRACES_ENDPOINT') ??
                    (0, core_1.getStringFromEnv)('OTEL_EXPORTER_OTLP_ENDPOINT') ??
                    'http://localhost:4317';
                if (endpoint) {
                    batchInfo.exporter.otlp_grpc.endpoint = endpoint;
                }
                const tls = (0, utils_1.getGrpcTlsConfig)(certificateFile, clientKeyFile, clientCertificateFile);
                if (tls) {
                    batchInfo.exporter.otlp_grpc.tls = tls;
                }
                if (compression) {
                    batchInfo.exporter.otlp_grpc.compression = compression;
                }
                if (timeout) {
                    batchInfo.exporter.otlp_grpc.timeout = timeout;
                }
                if (headersList) {
                    batchInfo.exporter.otlp_grpc.headers_list = headersList;
                }
            }
            else {
                if (batchInfo.exporter.otlp_http == null) {
                    batchInfo.exporter.otlp_http = {};
                }
                const endpoint = (0, core_1.getStringFromEnv)('OTEL_EXPORTER_OTLP_TRACES_ENDPOINT') ??
                    ((0, core_1.getStringFromEnv)('OTEL_EXPORTER_OTLP_ENDPOINT')
                        ? `${(0, core_1.getStringFromEnv)('OTEL_EXPORTER_OTLP_ENDPOINT')}/v1/traces`
                        : 'http://localhost:4318/v1/traces');
                if (endpoint) {
                    batchInfo.exporter.otlp_http.endpoint = endpoint;
                }
                const tls = (0, utils_1.getHttpTlsConfig)(certificateFile, clientKeyFile, clientCertificateFile);
                if (tls) {
                    batchInfo.exporter.otlp_http.tls = tls;
                }
                if (compression) {
                    batchInfo.exporter.otlp_http.compression = compression;
                }
                if (timeout) {
                    batchInfo.exporter.otlp_http.timeout = timeout;
                }
                if (headersList) {
                    batchInfo.exporter.otlp_http.headers_list = headersList;
                }
                if (protocol === 'http/json') {
                    batchInfo.exporter.otlp_http.encoding = commonModel_1.OtlpHttpEncoding.JSON;
                }
                else if (protocol === 'http/protobuf') {
                    batchInfo.exporter.otlp_http.encoding = commonModel_1.OtlpHttpEncoding.Protobuf;
                }
            }
            config.tracer_provider.processors.push({ batch: batchInfo });
        }
    }
}
exports.setTracerProvider = setTracerProvider;
function setMeterProvider(config) {
    const exportersType = Array.from(new Set((0, core_1.getStringListFromEnv)('OTEL_METRICS_EXPORTER')));
    if (exportersType.length === 0) {
        return;
    }
    if (exportersType.includes('none')) {
        api_1.diag.info(`OTEL_METRICS_EXPORTER contains "none". Meter provider will not be initialized.`);
        return;
    }
    config.meter_provider = (0, meterProviderModel_1.initializeDefaultMeterProviderConfiguration)();
    const readerPeriodic = { exporter: {} };
    const interval = (0, core_1.getNumberFromEnv)('OTEL_METRIC_EXPORT_INTERVAL') ?? 60000;
    if (interval) {
        readerPeriodic.interval = interval;
    }
    for (let i = 0; i < exportersType.length; i++) {
        const exporterType = exportersType[i];
        if (exporterType === 'prometheus') {
            // Prometheus uses a pull reader
            const pullReader = {
                exporter: {
                    'prometheus/development': {
                        host: (0, core_1.getStringFromEnv)('OTEL_EXPORTER_PROMETHEUS_HOST') ?? 'localhost',
                        port: (0, core_1.getNumberFromEnv)('OTEL_EXPORTER_PROMETHEUS_PORT') ?? 9464,
                        without_scope_info: false,
                        without_target_info: false,
                    },
                },
            };
            config.meter_provider.readers.push({ pull: pullReader });
            continue;
        }
        const readerPeriodicInfo = { ...readerPeriodic };
        const timeout = (0, core_1.getNumberFromEnv)('OTEL_METRIC_EXPORT_TIMEOUT') ?? 30000;
        if (timeout) {
            readerPeriodicInfo.timeout = timeout;
        }
        if (exporterType === 'console') {
            readerPeriodicInfo.exporter = { console: {} };
        }
        else {
            // 'otlp' and default
            const protocol = (0, core_1.getStringFromEnv)('OTEL_EXPORTER_OTLP_METRICS_PROTOCOL') ??
                (0, core_1.getStringFromEnv)('OTEL_EXPORTER_OTLP_PROTOCOL') ??
                'http/protobuf';
            const certificateFile = (0, core_1.getStringFromEnv)('OTEL_EXPORTER_OTLP_METRICS_CERTIFICATE') ??
                (0, core_1.getStringFromEnv)('OTEL_EXPORTER_OTLP_CERTIFICATE');
            const clientKeyFile = (0, core_1.getStringFromEnv)('OTEL_EXPORTER_OTLP_METRICS_CLIENT_KEY') ??
                (0, core_1.getStringFromEnv)('OTEL_EXPORTER_OTLP_CLIENT_KEY');
            const clientCertificateFile = (0, core_1.getStringFromEnv)('OTEL_EXPORTER_OTLP_METRICS_CLIENT_CERTIFICATE') ??
                (0, core_1.getStringFromEnv)('OTEL_EXPORTER_OTLP_CLIENT_CERTIFICATE');
            const compression = (0, core_1.getStringFromEnv)('OTEL_EXPORTER_OTLP_METRICS_COMPRESSION') ??
                (0, core_1.getStringFromEnv)('OTEL_EXPORTER_OTLP_COMPRESSION');
            const timeoutExporter = (0, core_1.getNumberFromEnv)('OTEL_EXPORTER_OTLP_METRICS_TIMEOUT') ??
                (0, core_1.getNumberFromEnv)('OTEL_EXPORTER_OTLP_TIMEOUT') ??
                10000;
            const headersList = (0, core_1.getStringFromEnv)('OTEL_EXPORTER_OTLP_METRICS_HEADERS') ??
                (0, core_1.getStringFromEnv)('OTEL_EXPORTER_OTLP_HEADERS');
            const temporalityPreference = (0, core_1.getStringFromEnv)('OTEL_EXPORTER_OTLP_METRICS_TEMPORALITY_PREFERENCE') ??
                'cumulative';
            const defaultHistogramAggregation = (0, core_1.getStringFromEnv)('OTEL_EXPORTER_OTLP_METRICS_DEFAULT_HISTOGRAM_AGGREGATION') ?? 'explicit_bucket_histogram';
            if (protocol === 'grpc') {
                delete readerPeriodicInfo.exporter.otlp_http;
                readerPeriodicInfo.exporter.otlp_grpc = {};
                const endpoint = (0, core_1.getStringFromEnv)('OTEL_EXPORTER_OTLP_METRICS_ENDPOINT') ??
                    (0, core_1.getStringFromEnv)('OTEL_EXPORTER_OTLP_ENDPOINT') ??
                    'http://localhost:4317';
                if (endpoint) {
                    readerPeriodicInfo.exporter.otlp_grpc.endpoint = endpoint;
                }
                const tls = (0, utils_1.getGrpcTlsConfig)(certificateFile, clientKeyFile, clientCertificateFile);
                if (tls) {
                    readerPeriodicInfo.exporter.otlp_grpc.tls = tls;
                }
                if (compression) {
                    readerPeriodicInfo.exporter.otlp_grpc.compression = compression;
                }
                if (timeoutExporter) {
                    readerPeriodicInfo.exporter.otlp_grpc.timeout = timeoutExporter;
                }
                if (headersList) {
                    readerPeriodicInfo.exporter.otlp_grpc.headers_list = headersList;
                }
                if (temporalityPreference) {
                    switch (temporalityPreference) {
                        case 'cumulative':
                            readerPeriodicInfo.exporter.otlp_grpc.temporality_preference =
                                meterProviderModel_1.ExporterTemporalityPreference.Cumulative;
                            break;
                        case 'delta':
                            readerPeriodicInfo.exporter.otlp_grpc.temporality_preference =
                                meterProviderModel_1.ExporterTemporalityPreference.Delta;
                            break;
                        case 'low_memory':
                            readerPeriodicInfo.exporter.otlp_grpc.temporality_preference =
                                meterProviderModel_1.ExporterTemporalityPreference.LowMemory;
                            break;
                        default:
                            readerPeriodicInfo.exporter.otlp_grpc.temporality_preference =
                                meterProviderModel_1.ExporterTemporalityPreference.Cumulative;
                            break;
                    }
                }
                if (defaultHistogramAggregation) {
                    switch (defaultHistogramAggregation) {
                        case 'explicit_bucket_histogram':
                            readerPeriodicInfo.exporter.otlp_grpc.default_histogram_aggregation =
                                meterProviderModel_1.ExporterDefaultHistogramAggregation.ExplicitBucketHistogram;
                            break;
                        case 'base2_exponential_bucket_histogram':
                            readerPeriodicInfo.exporter.otlp_grpc.default_histogram_aggregation =
                                meterProviderModel_1.ExporterDefaultHistogramAggregation.Base2ExponentialBucketHistogram;
                            break;
                        default:
                            readerPeriodicInfo.exporter.otlp_grpc.default_histogram_aggregation =
                                meterProviderModel_1.ExporterDefaultHistogramAggregation.ExplicitBucketHistogram;
                            break;
                    }
                }
            }
            else {
                if (readerPeriodicInfo.exporter.otlp_http == null) {
                    readerPeriodicInfo.exporter.otlp_http = {};
                }
                const endpoint = (0, core_1.getStringFromEnv)('OTEL_EXPORTER_OTLP_METRICS_ENDPOINT') ??
                    ((0, core_1.getStringFromEnv)('OTEL_EXPORTER_OTLP_ENDPOINT')
                        ? `${(0, core_1.getStringFromEnv)('OTEL_EXPORTER_OTLP_ENDPOINT')}/v1/metrics`
                        : 'http://localhost:4318/v1/metrics');
                if (endpoint) {
                    readerPeriodicInfo.exporter.otlp_http.endpoint = endpoint;
                }
                const tls = (0, utils_1.getHttpTlsConfig)(certificateFile, clientKeyFile, clientCertificateFile);
                if (tls) {
                    readerPeriodicInfo.exporter.otlp_http.tls = tls;
                }
                if (compression) {
                    readerPeriodicInfo.exporter.otlp_http.compression = compression;
                }
                if (timeoutExporter) {
                    readerPeriodicInfo.exporter.otlp_http.timeout = timeoutExporter;
                }
                if (headersList) {
                    readerPeriodicInfo.exporter.otlp_http.headers_list = headersList;
                }
                if (temporalityPreference) {
                    switch (temporalityPreference) {
                        case 'cumulative':
                            readerPeriodicInfo.exporter.otlp_http.temporality_preference =
                                meterProviderModel_1.ExporterTemporalityPreference.Cumulative;
                            break;
                        case 'delta':
                            readerPeriodicInfo.exporter.otlp_http.temporality_preference =
                                meterProviderModel_1.ExporterTemporalityPreference.Delta;
                            break;
                        case 'low_memory':
                            readerPeriodicInfo.exporter.otlp_http.temporality_preference =
                                meterProviderModel_1.ExporterTemporalityPreference.LowMemory;
                            break;
                        default:
                            readerPeriodicInfo.exporter.otlp_http.temporality_preference =
                                meterProviderModel_1.ExporterTemporalityPreference.Cumulative;
                            break;
                    }
                }
                if (defaultHistogramAggregation) {
                    switch (defaultHistogramAggregation) {
                        case 'explicit_bucket_histogram':
                            readerPeriodicInfo.exporter.otlp_http.default_histogram_aggregation =
                                meterProviderModel_1.ExporterDefaultHistogramAggregation.ExplicitBucketHistogram;
                            break;
                        case 'base2_exponential_bucket_histogram':
                            readerPeriodicInfo.exporter.otlp_http.default_histogram_aggregation =
                                meterProviderModel_1.ExporterDefaultHistogramAggregation.Base2ExponentialBucketHistogram;
                            break;
                        default:
                            readerPeriodicInfo.exporter.otlp_http.default_histogram_aggregation =
                                meterProviderModel_1.ExporterDefaultHistogramAggregation.ExplicitBucketHistogram;
                            break;
                    }
                }
                if (protocol === 'http/json') {
                    readerPeriodicInfo.exporter.otlp_http.encoding =
                        commonModel_1.OtlpHttpEncoding.JSON;
                }
                else if (protocol === 'http/protobuf') {
                    readerPeriodicInfo.exporter.otlp_http.encoding =
                        commonModel_1.OtlpHttpEncoding.Protobuf;
                }
            }
        }
        config.meter_provider.readers.push({ periodic: readerPeriodicInfo });
    }
    const exemplarFilter = (0, core_1.getStringFromEnv)('OTEL_METRICS_EXEMPLAR_FILTER') ?? 'trace_based';
    if (exemplarFilter) {
        switch (exemplarFilter) {
            case 'trace_based':
                config.meter_provider.exemplar_filter = meterProviderModel_1.ExemplarFilter.TraceBased;
                break;
            case 'always_on':
                config.meter_provider.exemplar_filter = meterProviderModel_1.ExemplarFilter.AlwaysOn;
                break;
            case 'always_off':
                config.meter_provider.exemplar_filter = meterProviderModel_1.ExemplarFilter.AlwaysOff;
                break;
            default:
                config.meter_provider.exemplar_filter = meterProviderModel_1.ExemplarFilter.TraceBased;
                break;
        }
    }
}
exports.setMeterProvider = setMeterProvider;
function setLoggerProvider(config) {
    const exportersType = Array.from(new Set((0, core_1.getStringListFromEnv)('OTEL_LOGS_EXPORTER')));
    if (exportersType.length === 0) {
        return;
    }
    if (exportersType.includes('none')) {
        api_1.diag.info(`OTEL_LOGS_EXPORTER contains "none". Logger provider will not be initialized.`);
        return;
    }
    config.logger_provider = (0, loggerProviderModel_1.initializeDefaultLoggerProviderConfiguration)();
    const attributeValueLengthLimit = (0, core_1.getNumberFromEnv)('OTEL_LOGRECORD_ATTRIBUTE_VALUE_LENGTH_LIMIT');
    const attributeCountLimit = (0, core_1.getNumberFromEnv)('OTEL_LOGRECORD_ATTRIBUTE_COUNT_LIMIT');
    if (attributeValueLengthLimit || attributeCountLimit) {
        if (attributeValueLengthLimit) {
            config.logger_provider.limits.attribute_value_length_limit =
                attributeValueLengthLimit;
        }
        if (attributeCountLimit) {
            config.logger_provider.limits.attribute_count_limit =
                attributeCountLimit;
        }
    }
    const batch = { exporter: {} };
    const scheduleDelay = (0, core_1.getNumberFromEnv)('OTEL_BLRP_SCHEDULE_DELAY') ?? 1000;
    if (scheduleDelay) {
        batch.schedule_delay = scheduleDelay;
    }
    const exportTimeout = (0, core_1.getNumberFromEnv)('OTEL_BLRP_EXPORT_TIMEOUT') ?? 30000;
    if (exportTimeout) {
        batch.export_timeout = exportTimeout;
    }
    const maxQueueSize = (0, core_1.getNumberFromEnv)('OTEL_BLRP_MAX_QUEUE_SIZE') ?? 2048;
    if (maxQueueSize) {
        batch.max_queue_size = maxQueueSize;
    }
    const maxExportBatchSize = (0, core_1.getNumberFromEnv)('OTEL_BLRP_MAX_EXPORT_BATCH_SIZE') ?? 512;
    if (maxExportBatchSize) {
        batch.max_export_batch_size = maxExportBatchSize;
    }
    for (let i = 0; i < exportersType.length; i++) {
        const exporterType = exportersType[i];
        const batchInfo = { ...batch };
        if (exporterType === 'console') {
            config.logger_provider.processors.push({
                simple: { exporter: { console: {} } },
            });
        }
        else {
            // 'otlp' and default
            const protocol = (0, core_1.getStringFromEnv)('OTEL_EXPORTER_OTLP_LOGS_PROTOCOL') ??
                (0, core_1.getStringFromEnv)('OTEL_EXPORTER_OTLP_PROTOCOL') ??
                'http/protobuf';
            const certificateFile = (0, core_1.getStringFromEnv)('OTEL_EXPORTER_OTLP_LOGS_CERTIFICATE') ??
                (0, core_1.getStringFromEnv)('OTEL_EXPORTER_OTLP_CERTIFICATE');
            const clientKeyFile = (0, core_1.getStringFromEnv)('OTEL_EXPORTER_OTLP_LOGS_CLIENT_KEY') ??
                (0, core_1.getStringFromEnv)('OTEL_EXPORTER_OTLP_CLIENT_KEY');
            const clientCertificateFile = (0, core_1.getStringFromEnv)('OTEL_EXPORTER_OTLP_LOGS_CLIENT_CERTIFICATE') ??
                (0, core_1.getStringFromEnv)('OTEL_EXPORTER_OTLP_CLIENT_CERTIFICATE');
            const compression = (0, core_1.getStringFromEnv)('OTEL_EXPORTER_OTLP_LOGS_COMPRESSION') ??
                (0, core_1.getStringFromEnv)('OTEL_EXPORTER_OTLP_COMPRESSION');
            const timeout = (0, core_1.getNumberFromEnv)('OTEL_EXPORTER_OTLP_LOGS_TIMEOUT') ??
                (0, core_1.getNumberFromEnv)('OTEL_EXPORTER_OTLP_TIMEOUT') ??
                10000;
            const headersList = (0, core_1.getStringFromEnv)('OTEL_EXPORTER_OTLP_LOGS_HEADERS') ??
                (0, core_1.getStringFromEnv)('OTEL_EXPORTER_OTLP_HEADERS');
            if (protocol === 'grpc') {
                delete batchInfo.exporter.otlp_http;
                batchInfo.exporter.otlp_grpc = {};
                const endpoint = (0, core_1.getStringFromEnv)('OTEL_EXPORTER_OTLP_LOGS_ENDPOINT') ??
                    (0, core_1.getStringFromEnv)('OTEL_EXPORTER_OTLP_ENDPOINT') ??
                    'http://localhost:4317';
                if (endpoint) {
                    batchInfo.exporter.otlp_grpc.endpoint = endpoint;
                }
                const tls = (0, utils_1.getGrpcTlsConfig)(certificateFile, clientKeyFile, clientCertificateFile);
                if (tls) {
                    batchInfo.exporter.otlp_grpc.tls = tls;
                }
                if (compression) {
                    batchInfo.exporter.otlp_grpc.compression = compression;
                }
                if (timeout) {
                    batchInfo.exporter.otlp_grpc.timeout = timeout;
                }
                if (headersList) {
                    batchInfo.exporter.otlp_grpc.headers_list = headersList;
                }
            }
            else {
                if (batchInfo.exporter.otlp_http == null) {
                    batchInfo.exporter.otlp_http = {};
                }
                const endpoint = (0, core_1.getStringFromEnv)('OTEL_EXPORTER_OTLP_LOGS_ENDPOINT') ??
                    ((0, core_1.getStringFromEnv)('OTEL_EXPORTER_OTLP_ENDPOINT')
                        ? `${(0, core_1.getStringFromEnv)('OTEL_EXPORTER_OTLP_ENDPOINT')}/v1/logs`
                        : 'http://localhost:4318/v1/logs');
                if (endpoint) {
                    batchInfo.exporter.otlp_http.endpoint = endpoint;
                }
                const tls = (0, utils_1.getHttpTlsConfig)(certificateFile, clientKeyFile, clientCertificateFile);
                if (tls) {
                    batchInfo.exporter.otlp_http.tls = tls;
                }
                if (compression) {
                    batchInfo.exporter.otlp_http.compression = compression;
                }
                if (timeout) {
                    batchInfo.exporter.otlp_http.timeout = timeout;
                }
                if (headersList) {
                    batchInfo.exporter.otlp_http.headers_list = headersList;
                }
                if (protocol === 'http/json') {
                    batchInfo.exporter.otlp_http.encoding = commonModel_1.OtlpHttpEncoding.JSON;
                }
                else if (protocol === 'http/protobuf') {
                    batchInfo.exporter.otlp_http.encoding = commonModel_1.OtlpHttpEncoding.Protobuf;
                }
            }
            config.logger_provider.processors.push({ batch: batchInfo });
        }
    }
}
exports.setLoggerProvider = setLoggerProvider;
//# sourceMappingURL=EnvironmentConfigFactory.js.map