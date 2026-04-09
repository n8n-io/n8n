"use strict";
/*
 * Copyright The OpenTelemetry Authors
 * SPDX-License-Identifier: Apache-2.0
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.setLoggerProvider = exports.getSeverity = exports.setMeterProvider = exports.getTemporalityPreference = exports.setTracerProvider = exports.setPropagator = exports.setAttributeLimits = exports.setResourceAttributes = exports.parseConfigFile = exports.hasValidConfigFile = exports.FileConfigFactory = void 0;
const core_1 = require("@opentelemetry/core");
const configModel_1 = require("./models/configModel");
const fs = require("fs");
const yaml = require("yaml");
const utils_1 = require("./utils");
const commonModel_1 = require("./models/commonModel");
const tracerProviderModel_1 = require("./models/tracerProviderModel");
const loggerProviderModel_1 = require("./models/loggerProviderModel");
const meterProviderModel_1 = require("./models/meterProviderModel");
const api_1 = require("@opentelemetry/api");
class FileConfigFactory {
    _config;
    constructor() {
        this._config = (0, configModel_1.initializeDefaultConfiguration)();
        parseConfigFile(this._config);
    }
    getConfigModel() {
        return this._config;
    }
}
exports.FileConfigFactory = FileConfigFactory;
function hasValidConfigFile() {
    const configFile = (0, core_1.getStringFromEnv)('OTEL_EXPERIMENTAL_CONFIG_FILE');
    if (configFile) {
        if (!(configFile.endsWith('.yaml') || configFile.endsWith('.yml')) ||
            !fs.existsSync(configFile)) {
            api_1.diag.warn(`Config file ${configFile} set on OTEL_EXPERIMENTAL_CONFIG_FILE is not valid`);
            return false;
        }
        return true;
    }
    return false;
}
exports.hasValidConfigFile = hasValidConfigFile;
function parseConfigFile(config) {
    const supportedFileVersions = ['1.0-rc.3'];
    const configFile = (0, core_1.getStringFromEnv)('OTEL_EXPERIMENTAL_CONFIG_FILE') || '';
    const file = fs.readFileSync(configFile, 'utf8');
    const parsedContent = yaml.parse(file);
    if (parsedContent['file_format'] &&
        supportedFileVersions.includes(parsedContent['file_format'])) {
        const disabled = (0, utils_1.getBooleanFromConfigFile)(parsedContent['disabled']);
        if (disabled !== undefined) {
            config.disabled = disabled;
        }
        const logLevel = (0, utils_1.getNumberFromConfigFile)((0, core_1.diagLogLevelFromString)(parsedContent['log_level']));
        if (logLevel) {
            config.log_level = logLevel;
        }
        if (parsedContent['resource']) {
            if (config.resource == null) {
                config.resource = {};
            }
            const schemaUrl = (0, utils_1.getStringFromConfigFile)(parsedContent['resource']?.['schema_url']);
            if (schemaUrl) {
                config.resource.schema_url = schemaUrl;
            }
        }
        setResourceAttributes(config, parsedContent['resource']?.['attributes'], parsedContent['resource']?.['attributes_list']);
        setAttributeLimits(config, parsedContent['attribute_limits']);
        setPropagator(config, parsedContent['propagator']);
        setTracerProvider(config, parsedContent['tracer_provider']);
        setMeterProvider(config, parsedContent['meter_provider']);
        setLoggerProvider(config, parsedContent['logger_provider']);
    }
    else {
        api_1.diag.warn(`Unsupported File Format: ${parsedContent['file_format']}. It must be one of the following: ${supportedFileVersions}`);
    }
}
exports.parseConfigFile = parseConfigFile;
function setResourceAttributes(config, attributes, attributeList) {
    if (attributes || attributeList) {
        const addedKeys = [];
        if (config.resource == null) {
            config.resource = {};
        }
        if ((0, utils_1.getStringFromConfigFile)(attributeList)) {
            config.resource.attributes_list = (0, utils_1.getStringFromConfigFile)(attributeList);
        }
        const list = (0, utils_1.getStringListFromConfigFile)(attributeList);
        if ((list && list.length > 0) || (attributes && attributes.length > 0)) {
            config.resource.attributes = [];
            if (attributes) {
                for (let i = 0; i < attributes.length; i++) {
                    const att = attributes[i];
                    let value = att['value'];
                    switch (att['type']) {
                        case 'bool':
                            value = (0, utils_1.getBooleanFromConfigFile)(value);
                            break;
                        case 'bool_array':
                            value = (0, utils_1.getBooleanListFromConfigFile)(value);
                            break;
                        case 'int':
                        case 'double':
                            value = (0, utils_1.getNumberFromConfigFile)(value);
                            break;
                        case 'int_array':
                        case 'double_array':
                            value = (0, utils_1.getNumberListFromConfigFile)(value);
                            break;
                        case 'string_array':
                            value = (0, utils_1.getStringListFromConfigFile)(value);
                            break;
                        default:
                            value = (0, utils_1.getStringFromConfigFile)(value);
                            break;
                    }
                    const key = (0, utils_1.getStringFromConfigFile)(att['name']) ?? '';
                    config.resource.attributes.push({
                        name: key,
                        value: value,
                        type: att['type'] ?? 'string',
                    });
                    addedKeys.push(key);
                }
            }
            if (list) {
                for (let i = 0; i < list.length; i++) {
                    const element = list[i].split('=');
                    if (!addedKeys.includes(element[0])) {
                        config.resource.attributes.push({
                            name: element[0],
                            value: element[1],
                            type: 'string',
                        });
                    }
                }
            }
        }
    }
}
exports.setResourceAttributes = setResourceAttributes;
function setAttributeLimits(config, attrLimits) {
    if (attrLimits) {
        if (config.attribute_limits == null) {
            config.attribute_limits = {
                attribute_count_limit: 128,
            };
        }
        const lengthLimit = (0, utils_1.getNumberFromConfigFile)(attrLimits['attribute_value_length_limit']);
        if (lengthLimit) {
            config.attribute_limits.attribute_value_length_limit = lengthLimit;
        }
        const countLimit = (0, utils_1.getNumberFromConfigFile)(attrLimits['attribute_count_limit']);
        if (countLimit) {
            config.attribute_limits.attribute_count_limit = countLimit;
        }
    }
}
exports.setAttributeLimits = setAttributeLimits;
function setPropagator(config, propagator) {
    if (propagator && (propagator.composite || propagator.composite_list)) {
        const auxList = [];
        const composite = [];
        if (propagator.composite) {
            for (let i = 0; i < propagator.composite.length; i++) {
                const key = Object.keys(propagator.composite[i])[0];
                auxList.push(key);
                composite.push({ [key]: null });
            }
        }
        const compositeList = (0, utils_1.getStringListFromConfigFile)(propagator['composite_list']);
        if (compositeList) {
            for (let i = 0; i < compositeList.length; i++) {
                if (!auxList.includes(compositeList[i])) {
                    composite.push({ [compositeList[i]]: null });
                }
            }
        }
        if (composite.length > 0) {
            if (config.propagator == null) {
                config.propagator = {};
            }
            config.propagator.composite = composite;
        }
        const compositeListString = (0, utils_1.getStringFromConfigFile)(propagator['composite_list']);
        if (compositeListString) {
            config.propagator.composite_list = compositeListString;
        }
        else if (auxList.length > 0) {
            // Generate composite_list from the composite entries
            config.propagator.composite_list = auxList.join(',');
        }
    }
}
exports.setPropagator = setPropagator;
function getConfigHeaders(h) {
    if (h) {
        const headers = [];
        for (let i = 0; i < h.length; i++) {
            const element = h[i];
            headers.push({
                name: element['name'],
                value: element['value'],
            });
        }
        if (headers.length > 0) {
            return headers;
        }
    }
    return null;
}
var ProviderType;
(function (ProviderType) {
    ProviderType[ProviderType["TRACER"] = 0] = "TRACER";
    ProviderType[ProviderType["METER"] = 1] = "METER";
    ProviderType[ProviderType["LOGGER"] = 2] = "LOGGER";
})(ProviderType || (ProviderType = {}));
function parseConfigSpanOrLogRecordExporter(exporter, providerType) {
    const exporterType = Object.keys(exporter)[0];
    let parsedExporter = {};
    let e;
    let certFile;
    let clientCertFile;
    let clientKeyFile;
    let compression;
    let headers;
    let headersList;
    let insecure;
    let endpoint;
    switch (providerType) {
        case ProviderType.TRACER:
            endpoint = 'http://localhost:4318/v1/traces';
            parsedExporter = parsedExporter;
            break;
        case ProviderType.LOGGER:
            endpoint = 'http://localhost:4318/v1/logs';
            parsedExporter = parsedExporter;
            break;
    }
    switch (exporterType) {
        case 'otlp_http':
            e = exporter['otlp_http'];
            if (e) {
                parsedExporter = {
                    otlp_http: {
                        endpoint: (0, utils_1.getStringFromConfigFile)(e['endpoint']) ?? endpoint,
                        timeout: (0, utils_1.getNumberFromConfigFile)(e['timeout']) ?? 10000,
                        encoding: (0, utils_1.getStringFromConfigFile)(e['encoding']) === 'json'
                            ? commonModel_1.OtlpHttpEncoding.JSON
                            : commonModel_1.OtlpHttpEncoding.Protobuf,
                    },
                };
                compression = (0, utils_1.getStringFromConfigFile)(e['compression']);
                if (compression && parsedExporter.otlp_http) {
                    parsedExporter.otlp_http.compression = compression;
                }
                headersList = (0, utils_1.getStringFromConfigFile)(e['headers_list']);
                if (headersList && parsedExporter.otlp_http) {
                    parsedExporter.otlp_http.headers_list = headersList;
                }
                headers = getConfigHeaders(e['headers']);
                if (headers && parsedExporter.otlp_http) {
                    parsedExporter.otlp_http.headers = headers;
                }
                if (e['tls']) {
                    certFile = (0, utils_1.getStringFromConfigFile)(e['tls']['ca_file']);
                    clientCertFile = (0, utils_1.getStringFromConfigFile)(e['tls']['cert_file']);
                    clientKeyFile = (0, utils_1.getStringFromConfigFile)(e['tls']['key_file']);
                    const tls = (0, utils_1.getHttpTlsConfig)(certFile, clientKeyFile, clientCertFile);
                    if (tls) {
                        parsedExporter.otlp_http.tls = tls;
                    }
                }
            }
            break;
        case 'otlp_grpc':
            e = exporter['otlp_grpc'];
            if (e) {
                parsedExporter = {
                    otlp_grpc: {
                        endpoint: (0, utils_1.getStringFromConfigFile)(e['endpoint']) ?? 'http://localhost:4317',
                        timeout: (0, utils_1.getNumberFromConfigFile)(e['timeout']) ?? 10000,
                    },
                };
                compression = (0, utils_1.getStringFromConfigFile)(e['compression']);
                if (compression && parsedExporter.otlp_grpc) {
                    parsedExporter.otlp_grpc.compression = compression;
                }
                headersList = (0, utils_1.getStringFromConfigFile)(e['headers_list']);
                if (headersList && parsedExporter.otlp_grpc) {
                    parsedExporter.otlp_grpc.headers_list = headersList;
                }
                headers = getConfigHeaders(e['headers']);
                if (headers && parsedExporter.otlp_grpc) {
                    parsedExporter.otlp_grpc.headers = headers;
                }
                if (e['tls']) {
                    certFile = (0, utils_1.getStringFromConfigFile)(e['tls']['ca_file']);
                    clientCertFile = (0, utils_1.getStringFromConfigFile)(e['tls']['cert_file']);
                    clientKeyFile = (0, utils_1.getStringFromConfigFile)(e['tls']['key_file']);
                    insecure = (0, utils_1.getBooleanFromConfigFile)(e['tls']['insecure']);
                    const tls = (0, utils_1.getGrpcTlsConfig)(certFile, clientKeyFile, clientCertFile, insecure);
                    if (tls) {
                        parsedExporter.otlp_grpc.tls = tls;
                    }
                }
            }
            break;
        case 'otlp_file/development':
            e = exporter['otlp_file/development'];
            if (e) {
                parsedExporter = {
                    'otlp_file/development': {
                        output_stream: (0, utils_1.getStringFromConfigFile)(e['output_stream']) ?? 'stdout',
                    },
                };
            }
            break;
        case 'console':
            parsedExporter = {
                console: {},
            };
            break;
    }
    return parsedExporter;
}
function setTracerProvider(config, tracerProvider) {
    if (tracerProvider && tracerProvider.processors?.length > 0) {
        config.tracer_provider = (0, tracerProviderModel_1.initializeDefaultTracerProviderConfiguration)();
        // Limits
        if (tracerProvider['limits']) {
            const attributeValueLengthLimit = (0, utils_1.getNumberFromConfigFile)(tracerProvider['limits']['attribute_value_length_limit']);
            if (attributeValueLengthLimit) {
                config.tracer_provider.limits.attribute_value_length_limit =
                    attributeValueLengthLimit;
            }
            const attributeCountLimit = (0, utils_1.getNumberFromConfigFile)(tracerProvider['limits']['attribute_count_limit']);
            if (attributeCountLimit) {
                config.tracer_provider.limits.attribute_count_limit =
                    attributeCountLimit;
            }
            const eventCountLimit = (0, utils_1.getNumberFromConfigFile)(tracerProvider['limits']['event_count_limit']);
            if (eventCountLimit) {
                config.tracer_provider.limits.event_count_limit = eventCountLimit;
            }
            const linkCountLimit = (0, utils_1.getNumberFromConfigFile)(tracerProvider['limits']['link_count_limit']);
            if (linkCountLimit) {
                config.tracer_provider.limits.link_count_limit = linkCountLimit;
            }
            const eventAttributeCountLimit = (0, utils_1.getNumberFromConfigFile)(tracerProvider['limits']['event_attribute_count_limit']);
            if (eventAttributeCountLimit) {
                config.tracer_provider.limits.event_attribute_count_limit =
                    eventAttributeCountLimit;
            }
            const linkAttributeCountLimit = (0, utils_1.getNumberFromConfigFile)(tracerProvider['limits']['link_attribute_count_limit']);
            if (linkAttributeCountLimit) {
                config.tracer_provider.limits.link_attribute_count_limit =
                    linkAttributeCountLimit;
            }
        }
        // Processors
        for (let i = 0; i < tracerProvider['processors'].length; i++) {
            const processorType = Object.keys(tracerProvider['processors'][i])[0];
            if (processorType === 'batch') {
                const element = tracerProvider['processors'][i]['batch'];
                if (element) {
                    const parsedExporter = parseConfigSpanOrLogRecordExporter(element['exporter'], ProviderType.TRACER);
                    const batchConfig = {
                        batch: {
                            schedule_delay: (0, utils_1.getNumberFromConfigFile)(element['schedule_delay']) ?? 5000,
                            export_timeout: (0, utils_1.getNumberFromConfigFile)(element['export_timeout']) ?? 30000,
                            max_queue_size: (0, utils_1.getNumberFromConfigFile)(element['max_queue_size']) ?? 2048,
                            max_export_batch_size: (0, utils_1.getNumberFromConfigFile)(element['max_export_batch_size']) ??
                                512,
                            exporter: parsedExporter,
                        },
                    };
                    config.tracer_provider.processors.push(batchConfig);
                }
            }
            else if (processorType === 'simple') {
                const element = tracerProvider['processors'][i]['simple'];
                if (element) {
                    const parsedExporter = parseConfigSpanOrLogRecordExporter(element['exporter'], ProviderType.TRACER);
                    const simpleConfig = {
                        simple: {
                            exporter: parsedExporter,
                        },
                    };
                    config.tracer_provider.processors.push(simpleConfig);
                }
            }
        }
    }
    else if (tracerProvider &&
        (tracerProvider.processors == null ||
            tracerProvider.processors.length === 0)) {
        api_1.diag.warn('TracerProvider must have at least one processor configured');
    }
}
exports.setTracerProvider = setTracerProvider;
function getCardinalityLimits(limits) {
    if (limits == null) {
        limits = {};
    }
    const defaultLimit = (0, utils_1.getNumberFromConfigFile)(limits['default']) ?? 2000;
    return {
        default: defaultLimit,
        counter: (0, utils_1.getNumberFromConfigFile)(limits['counter']) ?? defaultLimit,
        gauge: (0, utils_1.getNumberFromConfigFile)(limits['gauge']) ?? defaultLimit,
        histogram: (0, utils_1.getNumberFromConfigFile)(limits['histogram']) ?? defaultLimit,
        observable_counter: (0, utils_1.getNumberFromConfigFile)(limits['observable_counter']) ?? defaultLimit,
        observable_gauge: (0, utils_1.getNumberFromConfigFile)(limits['observable_gauge']) ?? defaultLimit,
        observable_up_down_counter: (0, utils_1.getNumberFromConfigFile)(limits['observable_up_down_counter']) ??
            defaultLimit,
        up_down_counter: (0, utils_1.getNumberFromConfigFile)(limits['up_down_counter']) ?? defaultLimit,
    };
}
function getProducers(producers) {
    const parsedProducers = [];
    if (producers) {
        for (let j = 0; j < producers.length; j++) {
            const producer = producers[j];
            if (Object.keys(producer)[0] === 'opencensus') {
                parsedProducers.push({ opencensus: {} });
            }
        }
    }
    return parsedProducers;
}
function getTemporalityPreference(temporalityPreference) {
    const temporalityPreferenceType = (0, utils_1.getStringFromConfigFile)(temporalityPreference);
    switch (temporalityPreferenceType) {
        case 'cumulative':
            return meterProviderModel_1.ExporterTemporalityPreference.Cumulative;
        case 'delta':
            return meterProviderModel_1.ExporterTemporalityPreference.Delta;
        case 'low_memory':
            return meterProviderModel_1.ExporterTemporalityPreference.LowMemory;
        default:
            return meterProviderModel_1.ExporterTemporalityPreference.Cumulative;
    }
}
exports.getTemporalityPreference = getTemporalityPreference;
function getDefaultHistogramAggregation(defaultHistogramAggregation) {
    const defaultHistogramAggregationType = (0, utils_1.getStringFromConfigFile)(defaultHistogramAggregation);
    switch (defaultHistogramAggregationType) {
        case 'explicit_bucket_histogram':
            return meterProviderModel_1.ExporterDefaultHistogramAggregation.ExplicitBucketHistogram;
        case 'base2_exponential_bucket_histogram':
            return meterProviderModel_1.ExporterDefaultHistogramAggregation.Base2ExponentialBucketHistogram;
        default:
            return meterProviderModel_1.ExporterDefaultHistogramAggregation.ExplicitBucketHistogram;
    }
}
function parseMetricExporter(exporter) {
    const exporterType = Object.keys(exporter)[0];
    let parsedExporter = {};
    let e;
    let certFile;
    let clientCertFile;
    let clientKeyFile;
    let compression;
    let headers;
    let headersList;
    let insecure;
    switch (exporterType) {
        case 'otlp_http':
            e = exporter['otlp_http'];
            if (e) {
                parsedExporter = {
                    otlp_http: {
                        endpoint: (0, utils_1.getStringFromConfigFile)(e['endpoint']) ??
                            'http://localhost:4318/v1/metrics',
                        timeout: (0, utils_1.getNumberFromConfigFile)(e['timeout']) ?? 10000,
                        encoding: (0, utils_1.getStringFromConfigFile)(e['encoding']) === 'json'
                            ? commonModel_1.OtlpHttpEncoding.JSON
                            : commonModel_1.OtlpHttpEncoding.Protobuf,
                        temporality_preference: getTemporalityPreference(e['temporality_preference']),
                        default_histogram_aggregation: getDefaultHistogramAggregation(e['default_histogram_aggregation']),
                    },
                };
                compression = (0, utils_1.getStringFromConfigFile)(e['compression']);
                if (compression && parsedExporter.otlp_http) {
                    parsedExporter.otlp_http.compression = compression;
                }
                headersList = (0, utils_1.getStringFromConfigFile)(e['headers_list']);
                if (headersList && parsedExporter.otlp_http) {
                    parsedExporter.otlp_http.headers_list = headersList;
                }
                headers = getConfigHeaders(e['headers']);
                if (headers && parsedExporter.otlp_http) {
                    parsedExporter.otlp_http.headers = headers;
                }
                if (e['tls']) {
                    certFile = (0, utils_1.getStringFromConfigFile)(e['tls']['ca_file']);
                    clientCertFile = (0, utils_1.getStringFromConfigFile)(e['tls']['cert_file']);
                    clientKeyFile = (0, utils_1.getStringFromConfigFile)(e['tls']['key_file']);
                    const tls = (0, utils_1.getHttpTlsConfig)(certFile, clientKeyFile, clientCertFile);
                    if (tls) {
                        parsedExporter.otlp_http.tls = tls;
                    }
                }
            }
            break;
        case 'otlp_grpc':
            e = exporter['otlp_grpc'];
            if (e) {
                parsedExporter = {
                    otlp_grpc: {
                        endpoint: (0, utils_1.getStringFromConfigFile)(e['endpoint']) ?? 'http://localhost:4317',
                        timeout: (0, utils_1.getNumberFromConfigFile)(e['timeout']) ?? 10000,
                        temporality_preference: getTemporalityPreference(e['temporality_preference']),
                        default_histogram_aggregation: getDefaultHistogramAggregation(e['default_histogram_aggregation']),
                    },
                };
                compression = (0, utils_1.getStringFromConfigFile)(e['compression']);
                if (compression && parsedExporter.otlp_grpc) {
                    parsedExporter.otlp_grpc.compression = compression;
                }
                headersList = (0, utils_1.getStringFromConfigFile)(e['headers_list']);
                if (headersList && parsedExporter.otlp_grpc) {
                    parsedExporter.otlp_grpc.headers_list = headersList;
                }
                headers = getConfigHeaders(e['headers']);
                if (headers && parsedExporter.otlp_grpc) {
                    parsedExporter.otlp_grpc.headers = headers;
                }
                if (e['tls']) {
                    certFile = (0, utils_1.getStringFromConfigFile)(e['tls']['ca_file']);
                    clientCertFile = (0, utils_1.getStringFromConfigFile)(e['tls']['cert_file']);
                    clientKeyFile = (0, utils_1.getStringFromConfigFile)(e['tls']['key_file']);
                    insecure = (0, utils_1.getBooleanFromConfigFile)(e['tls']['insecure']);
                    const tls = (0, utils_1.getGrpcTlsConfig)(certFile, clientKeyFile, clientCertFile, insecure);
                    if (tls) {
                        parsedExporter.otlp_grpc.tls = tls;
                    }
                }
            }
            break;
        case 'otlp_file/development':
            e = exporter['otlp_file/development'];
            if (e) {
                parsedExporter = {
                    'otlp_file/development': {
                        output_stream: (0, utils_1.getStringFromConfigFile)(e['output_stream']) ?? 'stdout',
                        temporality_preference: getTemporalityPreference(e['temporality_preference']),
                        default_histogram_aggregation: getDefaultHistogramAggregation(e['default_histogram_aggregation']),
                    },
                };
            }
            break;
        case 'console':
            e = exporter['console'];
            if (e) {
                parsedExporter = {
                    console: {
                        temporality_preference: getTemporalityPreference(e['temporality_preference']),
                        default_histogram_aggregation: getDefaultHistogramAggregation(e['default_histogram_aggregation']),
                    },
                };
            }
            break;
    }
    return parsedExporter;
}
function setMeterProvider(config, meterProvider) {
    if (meterProvider && meterProvider.readers?.length > 0) {
        config.meter_provider = (0, meterProviderModel_1.initializeDefaultMeterProviderConfiguration)();
        const exemplarFilter = (0, utils_1.getStringFromConfigFile)(meterProvider['exemplar_filter']);
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
        for (let i = 0; i < meterProvider.readers.length; i++) {
            const readerType = Object.keys(meterProvider['readers'][i])[0];
            if (readerType === 'pull') {
                const element = meterProvider['readers'][i]['pull'];
                if (element) {
                    const exporter = {
                        'prometheus/development': {
                            host: (0, utils_1.getStringFromConfigFile)(element['exporter']['prometheus/development']['host']) ?? 'localhost',
                            port: (0, utils_1.getNumberFromConfigFile)(element['exporter']['prometheus/development']['port']) ?? 9464,
                            without_scope_info: (0, utils_1.getBooleanFromConfigFile)(element['exporter']['prometheus/development']['without_scope_info']) ?? false,
                            without_target_info: (0, utils_1.getBooleanFromConfigFile)(element['exporter']['prometheus/development']['without_target_info']) ?? false,
                        },
                    };
                    if (element['exporter']['prometheus/development']['with_resource_constant_labels']) {
                        exporter['prometheus/development'].with_resource_constant_labels =
                            {
                                included: (0, utils_1.getStringListFromConfigFile)(element['exporter']['prometheus/development']['with_resource_constant_labels']?.['included']) ?? [],
                                excluded: (0, utils_1.getStringListFromConfigFile)(element['exporter']['prometheus/development']['with_resource_constant_labels']?.['excluded']) ?? [],
                            };
                    }
                    if (element['exporter']['prometheus/development']['translation_strategy']) {
                        const ts = (0, utils_1.getStringFromConfigFile)(element['exporter']['prometheus/development']['translation_strategy']);
                        switch (ts) {
                            case 'underscore_escaping_with_suffixes':
                                exporter['prometheus/development'].translation_strategy =
                                    meterProviderModel_1.ExperimentalPrometheusTranslationStrategy.UnderscoreEscapingWithSuffixes;
                                break;
                            case 'underscore_escaping_without_suffixes':
                                exporter['prometheus/development'].translation_strategy =
                                    meterProviderModel_1.ExperimentalPrometheusTranslationStrategy.UnderscoreEscapingWithoutSuffixes;
                                break;
                            case 'no_utf8_escaping_with_suffixes':
                                exporter['prometheus/development'].translation_strategy =
                                    meterProviderModel_1.ExperimentalPrometheusTranslationStrategy.NoUtf8EscapingWithSuffixes;
                                break;
                            case 'no_translation':
                                exporter['prometheus/development'].translation_strategy =
                                    meterProviderModel_1.ExperimentalPrometheusTranslationStrategy.NoTranslation;
                                break;
                        }
                    }
                    const pullReader = {
                        pull: {
                            exporter: exporter,
                            cardinality_limits: getCardinalityLimits(element['cardinality_limits']),
                        },
                    };
                    const p = getProducers(element['producers']);
                    if (p.length > 0 && pullReader.pull) {
                        pullReader.pull.producers = p;
                    }
                    config.meter_provider.readers.push(pullReader);
                }
            }
            else if (readerType === 'periodic') {
                const element = meterProvider['readers'][i]['periodic'];
                if (element) {
                    const parsedExporter = parseMetricExporter(element['exporter']);
                    const periodicReader = {
                        periodic: {
                            exporter: parsedExporter,
                            cardinality_limits: getCardinalityLimits(element['cardinality_limits']),
                            interval: (0, utils_1.getNumberFromConfigFile)(element['interval']) ?? 60000,
                            timeout: (0, utils_1.getNumberFromConfigFile)(element['timeout']) ?? 30000,
                        },
                    };
                    const p = getProducers(element['producers']);
                    if (p.length > 0 && periodicReader.periodic) {
                        periodicReader.periodic.producers = p;
                    }
                    config.meter_provider.readers.push(periodicReader);
                }
            }
        }
        if (meterProvider['views'] && meterProvider['views'].length > 0) {
            config.meter_provider.views = [];
            for (let j = 0; j < meterProvider['views'].length; j++) {
                const element = meterProvider['views'][j];
                const view = {};
                if (element['selector']) {
                    const selector = {};
                    const instrumentName = (0, utils_1.getStringFromConfigFile)(element['selector']['instrument_name']);
                    if (instrumentName) {
                        selector.instrument_name = instrumentName;
                    }
                    const unit = (0, utils_1.getStringFromConfigFile)(element['selector']['unit']);
                    if (unit) {
                        selector.unit = unit;
                    }
                    const meterName = (0, utils_1.getStringFromConfigFile)(element['selector']['meter_name']);
                    if (meterName) {
                        selector.meter_name = meterName;
                    }
                    const meterVersion = (0, utils_1.getStringFromConfigFile)(element['selector']['meter_version']);
                    if (meterVersion) {
                        selector.meter_version = meterVersion;
                    }
                    const meterSchemaUrl = (0, utils_1.getStringFromConfigFile)(element['selector']['meter_schema_url']);
                    if (meterSchemaUrl) {
                        selector.meter_schema_url = meterSchemaUrl;
                    }
                    const instrumentType = (0, utils_1.getStringFromConfigFile)(element['selector']['instrument_type']);
                    if (instrumentType) {
                        switch (instrumentType) {
                            case 'counter':
                                selector.instrument_type = meterProviderModel_1.InstrumentType.Counter;
                                break;
                            case 'gauge':
                                selector.instrument_type = meterProviderModel_1.InstrumentType.Gauge;
                                break;
                            case 'histogram':
                                selector.instrument_type = meterProviderModel_1.InstrumentType.Histogram;
                                break;
                            case 'observable_counter':
                                selector.instrument_type = meterProviderModel_1.InstrumentType.ObservableCounter;
                                break;
                            case 'observable_gauge':
                                selector.instrument_type = meterProviderModel_1.InstrumentType.ObservableGauge;
                                break;
                            case 'observable_up_down_counter':
                                selector.instrument_type =
                                    meterProviderModel_1.InstrumentType.ObservableUpDownCounter;
                                break;
                            case 'up_down_counter':
                                selector.instrument_type = meterProviderModel_1.InstrumentType.UpDownCounter;
                                break;
                        }
                    }
                    if (Object.keys(selector).length > 0) {
                        view.selector = selector;
                    }
                }
                if (element['stream']) {
                    const stream = {};
                    const name = (0, utils_1.getStringFromConfigFile)(element['stream']['name']);
                    if (name) {
                        stream.name = name;
                    }
                    const description = (0, utils_1.getStringFromConfigFile)(element['stream']['description']);
                    if (description) {
                        stream.description = description;
                    }
                    const aggregationCardinalityLimit = (0, utils_1.getNumberFromConfigFile)(element['stream']['aggregation_cardinality_limit']);
                    if (aggregationCardinalityLimit) {
                        stream.aggregation_cardinality_limit = aggregationCardinalityLimit;
                    }
                    if (element['stream']['attribute_keys']) {
                        stream.attribute_keys = {
                            included: (0, utils_1.getStringListFromConfigFile)(element['stream']['attribute_keys']['included']) ?? [],
                            excluded: (0, utils_1.getStringListFromConfigFile)(element['stream']['attribute_keys']['excluded']) ?? [],
                        };
                    }
                    const rawAgg = element['stream']['aggregation'];
                    if (rawAgg) {
                        const aggregation = {};
                        if (rawAgg['default']) {
                            aggregation.default = {};
                        }
                        if (rawAgg['drop']) {
                            aggregation.drop = {};
                        }
                        if (rawAgg['last_value']) {
                            aggregation.last_value = {};
                        }
                        if (rawAgg['sum']) {
                            aggregation.sum = {};
                        }
                        if (rawAgg['explicit_bucket_histogram']) {
                            aggregation.explicit_bucket_histogram = {
                                boundaries: (0, utils_1.getNumberListFromConfigFile)(rawAgg['explicit_bucket_histogram']['boundaries']) ?? [
                                    0, 5, 10, 25, 50, 75, 100, 250, 500, 750, 1000, 2500, 5000,
                                    7500, 10000,
                                ],
                                record_min_max: (0, utils_1.getBooleanFromConfigFile)(rawAgg['explicit_bucket_histogram']['record_min_max']) === false
                                    ? false
                                    : true,
                            };
                        }
                        if (rawAgg['base2_exponential_bucket_histogram']) {
                            aggregation.base2_exponential_bucket_histogram = {
                                record_min_max: (0, utils_1.getBooleanFromConfigFile)(rawAgg['base2_exponential_bucket_histogram']['record_min_max']) === false
                                    ? false
                                    : true,
                            };
                            const maxScale = (0, utils_1.getNumberFromConfigFile)(rawAgg['base2_exponential_bucket_histogram']['max_scale']);
                            if (maxScale) {
                                aggregation.base2_exponential_bucket_histogram.max_scale =
                                    maxScale;
                            }
                            const maxSize = (0, utils_1.getNumberFromConfigFile)(rawAgg['base2_exponential_bucket_histogram']['max_size']);
                            if (maxSize) {
                                aggregation.base2_exponential_bucket_histogram.max_size =
                                    maxSize;
                            }
                        }
                        stream.aggregation = aggregation;
                    }
                    if (Object.keys(stream).length > 0) {
                        view.stream = stream;
                    }
                }
                config.meter_provider.views.push(view);
            }
        }
    }
    else if (meterProvider &&
        (meterProvider.readers == null || meterProvider.readers.length === 0)) {
        api_1.diag.warn('MeterProvider must have at least one reader configured');
    }
}
exports.setMeterProvider = setMeterProvider;
function getSeverity(severity) {
    const severityType = (0, utils_1.getStringFromConfigFile)(severity);
    switch (severityType) {
        case 'debug':
            return commonModel_1.SeverityNumber.DEBUG;
        case 'debug2':
            return commonModel_1.SeverityNumber.DEBUG2;
        case 'debug3':
            return commonModel_1.SeverityNumber.DEBUG3;
        case 'debug4':
            return commonModel_1.SeverityNumber.DEBUG4;
        case 'info':
            return commonModel_1.SeverityNumber.INFO;
        case 'info2':
            return commonModel_1.SeverityNumber.INFO2;
        case 'info3':
            return commonModel_1.SeverityNumber.INFO3;
        case 'info4':
            return commonModel_1.SeverityNumber.INFO4;
        case 'warn':
            return commonModel_1.SeverityNumber.WARN;
        case 'warn2':
            return commonModel_1.SeverityNumber.WARN2;
        case 'warn3':
            return commonModel_1.SeverityNumber.WARN3;
        case 'warn4':
            return commonModel_1.SeverityNumber.WARN4;
        case 'error':
            return commonModel_1.SeverityNumber.ERROR;
        case 'error2':
            return commonModel_1.SeverityNumber.ERROR2;
        case 'error3':
            return commonModel_1.SeverityNumber.ERROR3;
        case 'error4':
            return commonModel_1.SeverityNumber.ERROR4;
        case 'fatal':
            return commonModel_1.SeverityNumber.FATAL;
        case 'fatal2':
            return commonModel_1.SeverityNumber.FATAL2;
        case 'fatal3':
            return commonModel_1.SeverityNumber.FATAL3;
        case 'fatal4':
            return commonModel_1.SeverityNumber.FATAL4;
        case 'trace':
            return commonModel_1.SeverityNumber.TRACE;
        case 'trace2':
            return commonModel_1.SeverityNumber.TRACE2;
        case 'trace3':
            return commonModel_1.SeverityNumber.TRACE3;
        case 'trace4':
            return commonModel_1.SeverityNumber.TRACE4;
        default:
            return undefined;
    }
}
exports.getSeverity = getSeverity;
function setLoggerProvider(config, loggerProvider) {
    if (loggerProvider && loggerProvider.processors?.length > 0) {
        config.logger_provider = (0, loggerProviderModel_1.initializeDefaultLoggerProviderConfiguration)();
        // Limits
        if (loggerProvider['limits']) {
            const attributeValueLengthLimit = (0, utils_1.getNumberFromConfigFile)(loggerProvider['limits']['attribute_value_length_limit']);
            const attributeCountLimit = (0, utils_1.getNumberFromConfigFile)(loggerProvider['limits']['attribute_count_limit']);
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
        }
        // Processors
        for (let i = 0; i < loggerProvider['processors'].length; i++) {
            const processorType = Object.keys(loggerProvider['processors'][i])[0];
            if (processorType === 'batch') {
                const element = loggerProvider['processors'][i]['batch'];
                if (element) {
                    const parsedExporter = parseConfigSpanOrLogRecordExporter(element['exporter'], ProviderType.LOGGER);
                    const batchConfig = {
                        batch: {
                            schedule_delay: (0, utils_1.getNumberFromConfigFile)(element['schedule_delay']) ?? 1000,
                            export_timeout: (0, utils_1.getNumberFromConfigFile)(element['export_timeout']) ?? 30000,
                            max_queue_size: (0, utils_1.getNumberFromConfigFile)(element['max_queue_size']) ?? 2048,
                            max_export_batch_size: (0, utils_1.getNumberFromConfigFile)(element['max_export_batch_size']) ??
                                512,
                            exporter: parsedExporter,
                        },
                    };
                    config.logger_provider.processors.push(batchConfig);
                }
            }
            else if (processorType === 'simple') {
                const element = loggerProvider['processors'][i]['simple'];
                if (element) {
                    const parsedExporter = parseConfigSpanOrLogRecordExporter(element['exporter'], ProviderType.LOGGER);
                    const simpleConfig = {
                        simple: {
                            exporter: parsedExporter,
                        },
                    };
                    config.logger_provider.processors.push(simpleConfig);
                }
            }
        }
        // logger_configurator/development
        if (loggerProvider['logger_configurator/development']) {
            const defaultConfigDisabled = (0, utils_1.getBooleanFromConfigFile)(loggerProvider['logger_configurator/development']['default_config']?.['enabled']);
            if (defaultConfigDisabled || defaultConfigDisabled === false) {
                config.logger_provider['logger_configurator/development'] = {
                    default_config: {
                        enabled: defaultConfigDisabled,
                    },
                };
            }
            if (loggerProvider['logger_configurator/development'].loggers &&
                loggerProvider['logger_configurator/development'].loggers.length > 0) {
                const loggers = [];
                for (let i = 0; i < loggerProvider['logger_configurator/development'].loggers.length; i++) {
                    const logger = loggerProvider['logger_configurator/development'].loggers[i];
                    let enabled = false;
                    let traceBased;
                    let minSeverity;
                    if (logger['config']) {
                        enabled =
                            (0, utils_1.getBooleanFromConfigFile)(logger['config']['enabled']) ?? false;
                        traceBased = (0, utils_1.getBooleanFromConfigFile)(logger['config']['trace_based']);
                        if (logger['config']['minimum_severity']) {
                            minSeverity = getSeverity(logger['config']['minimum_severity']);
                        }
                    }
                    const name = (0, utils_1.getStringFromConfigFile)(logger['name']);
                    if (name) {
                        const loggerNew = {
                            name: name,
                            config: {
                                enabled: enabled,
                            },
                        };
                        if (traceBased !== undefined) {
                            loggerNew.config.trace_based = traceBased;
                        }
                        if (minSeverity !== undefined) {
                            loggerNew.config.minimum_severity = minSeverity;
                        }
                        loggers.push(loggerNew);
                    }
                }
                if (config.logger_provider['logger_configurator/development'] == null) {
                    config.logger_provider['logger_configurator/development'] = {};
                }
                config.logger_provider['logger_configurator/development'].loggers =
                    loggers;
            }
        }
    }
    else if (loggerProvider &&
        (loggerProvider.processors == null ||
            loggerProvider.processors.length === 0)) {
        api_1.diag.warn('LoggerProvider must have at least one processor configured');
    }
}
exports.setLoggerProvider = setLoggerProvider;
//# sourceMappingURL=FileConfigFactory.js.map