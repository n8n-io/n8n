/*
 * Copyright The OpenTelemetry Authors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
import { DiagLogLevel } from '@opentelemetry/api';
import { TracesSamplerValues } from './sampling';
const DEFAULT_LIST_SEPARATOR = ',';
/**
 * Environment interface to define all names
 */
const ENVIRONMENT_BOOLEAN_KEYS = ['OTEL_SDK_DISABLED'];
function isEnvVarABoolean(key) {
    return (ENVIRONMENT_BOOLEAN_KEYS.indexOf(key) > -1);
}
const ENVIRONMENT_NUMBERS_KEYS = [
    'OTEL_BSP_EXPORT_TIMEOUT',
    'OTEL_BSP_MAX_EXPORT_BATCH_SIZE',
    'OTEL_BSP_MAX_QUEUE_SIZE',
    'OTEL_BSP_SCHEDULE_DELAY',
    'OTEL_BLRP_EXPORT_TIMEOUT',
    'OTEL_BLRP_MAX_EXPORT_BATCH_SIZE',
    'OTEL_BLRP_MAX_QUEUE_SIZE',
    'OTEL_BLRP_SCHEDULE_DELAY',
    'OTEL_ATTRIBUTE_VALUE_LENGTH_LIMIT',
    'OTEL_ATTRIBUTE_COUNT_LIMIT',
    'OTEL_SPAN_ATTRIBUTE_VALUE_LENGTH_LIMIT',
    'OTEL_SPAN_ATTRIBUTE_COUNT_LIMIT',
    'OTEL_LOGRECORD_ATTRIBUTE_VALUE_LENGTH_LIMIT',
    'OTEL_LOGRECORD_ATTRIBUTE_COUNT_LIMIT',
    'OTEL_SPAN_EVENT_COUNT_LIMIT',
    'OTEL_SPAN_LINK_COUNT_LIMIT',
    'OTEL_SPAN_ATTRIBUTE_PER_EVENT_COUNT_LIMIT',
    'OTEL_SPAN_ATTRIBUTE_PER_LINK_COUNT_LIMIT',
    'OTEL_EXPORTER_OTLP_TIMEOUT',
    'OTEL_EXPORTER_OTLP_TRACES_TIMEOUT',
    'OTEL_EXPORTER_OTLP_METRICS_TIMEOUT',
    'OTEL_EXPORTER_OTLP_LOGS_TIMEOUT',
    'OTEL_EXPORTER_JAEGER_AGENT_PORT',
];
function isEnvVarANumber(key) {
    return (ENVIRONMENT_NUMBERS_KEYS.indexOf(key) > -1);
}
const ENVIRONMENT_LISTS_KEYS = [
    'OTEL_NO_PATCH_MODULES',
    'OTEL_PROPAGATORS',
];
function isEnvVarAList(key) {
    return ENVIRONMENT_LISTS_KEYS.indexOf(key) > -1;
}
export const DEFAULT_ATTRIBUTE_VALUE_LENGTH_LIMIT = Infinity;
export const DEFAULT_ATTRIBUTE_COUNT_LIMIT = 128;
export const DEFAULT_SPAN_ATTRIBUTE_PER_EVENT_COUNT_LIMIT = 128;
export const DEFAULT_SPAN_ATTRIBUTE_PER_LINK_COUNT_LIMIT = 128;
/**
 * Default environment variables
 */
export const DEFAULT_ENVIRONMENT = {
    OTEL_SDK_DISABLED: false,
    CONTAINER_NAME: '',
    ECS_CONTAINER_METADATA_URI_V4: '',
    ECS_CONTAINER_METADATA_URI: '',
    HOSTNAME: '',
    KUBERNETES_SERVICE_HOST: '',
    NAMESPACE: '',
    OTEL_BSP_EXPORT_TIMEOUT: 30000,
    OTEL_BSP_MAX_EXPORT_BATCH_SIZE: 512,
    OTEL_BSP_MAX_QUEUE_SIZE: 2048,
    OTEL_BSP_SCHEDULE_DELAY: 5000,
    OTEL_BLRP_EXPORT_TIMEOUT: 30000,
    OTEL_BLRP_MAX_EXPORT_BATCH_SIZE: 512,
    OTEL_BLRP_MAX_QUEUE_SIZE: 2048,
    OTEL_BLRP_SCHEDULE_DELAY: 5000,
    OTEL_EXPORTER_JAEGER_AGENT_HOST: '',
    OTEL_EXPORTER_JAEGER_AGENT_PORT: 6832,
    OTEL_EXPORTER_JAEGER_ENDPOINT: '',
    OTEL_EXPORTER_JAEGER_PASSWORD: '',
    OTEL_EXPORTER_JAEGER_USER: '',
    OTEL_EXPORTER_OTLP_ENDPOINT: '',
    OTEL_EXPORTER_OTLP_TRACES_ENDPOINT: '',
    OTEL_EXPORTER_OTLP_METRICS_ENDPOINT: '',
    OTEL_EXPORTER_OTLP_LOGS_ENDPOINT: '',
    OTEL_EXPORTER_OTLP_HEADERS: '',
    OTEL_EXPORTER_OTLP_TRACES_HEADERS: '',
    OTEL_EXPORTER_OTLP_METRICS_HEADERS: '',
    OTEL_EXPORTER_OTLP_LOGS_HEADERS: '',
    OTEL_EXPORTER_OTLP_TIMEOUT: 10000,
    OTEL_EXPORTER_OTLP_TRACES_TIMEOUT: 10000,
    OTEL_EXPORTER_OTLP_METRICS_TIMEOUT: 10000,
    OTEL_EXPORTER_OTLP_LOGS_TIMEOUT: 10000,
    OTEL_EXPORTER_ZIPKIN_ENDPOINT: 'http://localhost:9411/api/v2/spans',
    OTEL_LOG_LEVEL: DiagLogLevel.INFO,
    OTEL_NO_PATCH_MODULES: [],
    OTEL_PROPAGATORS: ['tracecontext', 'baggage'],
    OTEL_RESOURCE_ATTRIBUTES: '',
    OTEL_SERVICE_NAME: '',
    OTEL_ATTRIBUTE_VALUE_LENGTH_LIMIT: DEFAULT_ATTRIBUTE_VALUE_LENGTH_LIMIT,
    OTEL_ATTRIBUTE_COUNT_LIMIT: DEFAULT_ATTRIBUTE_COUNT_LIMIT,
    OTEL_SPAN_ATTRIBUTE_VALUE_LENGTH_LIMIT: DEFAULT_ATTRIBUTE_VALUE_LENGTH_LIMIT,
    OTEL_SPAN_ATTRIBUTE_COUNT_LIMIT: DEFAULT_ATTRIBUTE_COUNT_LIMIT,
    OTEL_LOGRECORD_ATTRIBUTE_VALUE_LENGTH_LIMIT: DEFAULT_ATTRIBUTE_VALUE_LENGTH_LIMIT,
    OTEL_LOGRECORD_ATTRIBUTE_COUNT_LIMIT: DEFAULT_ATTRIBUTE_COUNT_LIMIT,
    OTEL_SPAN_EVENT_COUNT_LIMIT: 128,
    OTEL_SPAN_LINK_COUNT_LIMIT: 128,
    OTEL_SPAN_ATTRIBUTE_PER_EVENT_COUNT_LIMIT: DEFAULT_SPAN_ATTRIBUTE_PER_EVENT_COUNT_LIMIT,
    OTEL_SPAN_ATTRIBUTE_PER_LINK_COUNT_LIMIT: DEFAULT_SPAN_ATTRIBUTE_PER_LINK_COUNT_LIMIT,
    OTEL_TRACES_EXPORTER: '',
    OTEL_TRACES_SAMPLER: TracesSamplerValues.ParentBasedAlwaysOn,
    OTEL_TRACES_SAMPLER_ARG: '',
    OTEL_LOGS_EXPORTER: '',
    OTEL_EXPORTER_OTLP_INSECURE: '',
    OTEL_EXPORTER_OTLP_TRACES_INSECURE: '',
    OTEL_EXPORTER_OTLP_METRICS_INSECURE: '',
    OTEL_EXPORTER_OTLP_LOGS_INSECURE: '',
    OTEL_EXPORTER_OTLP_CERTIFICATE: '',
    OTEL_EXPORTER_OTLP_TRACES_CERTIFICATE: '',
    OTEL_EXPORTER_OTLP_METRICS_CERTIFICATE: '',
    OTEL_EXPORTER_OTLP_LOGS_CERTIFICATE: '',
    OTEL_EXPORTER_OTLP_COMPRESSION: '',
    OTEL_EXPORTER_OTLP_TRACES_COMPRESSION: '',
    OTEL_EXPORTER_OTLP_METRICS_COMPRESSION: '',
    OTEL_EXPORTER_OTLP_LOGS_COMPRESSION: '',
    OTEL_EXPORTER_OTLP_CLIENT_KEY: '',
    OTEL_EXPORTER_OTLP_TRACES_CLIENT_KEY: '',
    OTEL_EXPORTER_OTLP_METRICS_CLIENT_KEY: '',
    OTEL_EXPORTER_OTLP_LOGS_CLIENT_KEY: '',
    OTEL_EXPORTER_OTLP_CLIENT_CERTIFICATE: '',
    OTEL_EXPORTER_OTLP_TRACES_CLIENT_CERTIFICATE: '',
    OTEL_EXPORTER_OTLP_METRICS_CLIENT_CERTIFICATE: '',
    OTEL_EXPORTER_OTLP_LOGS_CLIENT_CERTIFICATE: '',
    OTEL_EXPORTER_OTLP_PROTOCOL: 'http/protobuf',
    OTEL_EXPORTER_OTLP_TRACES_PROTOCOL: 'http/protobuf',
    OTEL_EXPORTER_OTLP_METRICS_PROTOCOL: 'http/protobuf',
    OTEL_EXPORTER_OTLP_LOGS_PROTOCOL: 'http/protobuf',
    OTEL_EXPORTER_OTLP_METRICS_TEMPORALITY_PREFERENCE: 'cumulative',
};
/**
 * @param key
 * @param environment
 * @param values
 */
function parseBoolean(key, environment, values) {
    if (typeof values[key] === 'undefined') {
        return;
    }
    const value = String(values[key]);
    // support case-insensitive "true"
    environment[key] = value.toLowerCase() === 'true';
}
/**
 * Parses a variable as number with number validation
 * @param name
 * @param environment
 * @param values
 * @param min
 * @param max
 */
function parseNumber(name, environment, values, min = -Infinity, max = Infinity) {
    if (typeof values[name] !== 'undefined') {
        const value = Number(values[name]);
        if (!isNaN(value)) {
            if (value < min) {
                environment[name] = min;
            }
            else if (value > max) {
                environment[name] = max;
            }
            else {
                environment[name] = value;
            }
        }
    }
}
/**
 * Parses list-like strings from input into output.
 * @param name
 * @param environment
 * @param values
 * @param separator
 */
function parseStringList(name, output, input, separator = DEFAULT_LIST_SEPARATOR) {
    const givenValue = input[name];
    if (typeof givenValue === 'string') {
        output[name] = givenValue.split(separator).map(v => v.trim());
    }
}
// The support string -> DiagLogLevel mappings
const logLevelMap = {
    ALL: DiagLogLevel.ALL,
    VERBOSE: DiagLogLevel.VERBOSE,
    DEBUG: DiagLogLevel.DEBUG,
    INFO: DiagLogLevel.INFO,
    WARN: DiagLogLevel.WARN,
    ERROR: DiagLogLevel.ERROR,
    NONE: DiagLogLevel.NONE,
};
/**
 * Environmentally sets log level if valid log level string is provided
 * @param key
 * @param environment
 * @param values
 */
function setLogLevelFromEnv(key, environment, values) {
    const value = values[key];
    if (typeof value === 'string') {
        const theLevel = logLevelMap[value.toUpperCase()];
        if (theLevel != null) {
            environment[key] = theLevel;
        }
    }
}
/**
 * Parses environment values
 * @param values
 */
export function parseEnvironment(values) {
    const environment = {};
    for (const env in DEFAULT_ENVIRONMENT) {
        const key = env;
        switch (key) {
            case 'OTEL_LOG_LEVEL':
                setLogLevelFromEnv(key, environment, values);
                break;
            default:
                if (isEnvVarABoolean(key)) {
                    parseBoolean(key, environment, values);
                }
                else if (isEnvVarANumber(key)) {
                    parseNumber(key, environment, values);
                }
                else if (isEnvVarAList(key)) {
                    parseStringList(key, environment, values);
                }
                else {
                    const value = values[key];
                    if (typeof value !== 'undefined' && value !== null) {
                        environment[key] = String(value);
                    }
                }
        }
    }
    return environment;
}
//# sourceMappingURL=environment.js.map