"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPropagatorFromEnv = exports.getSpanProcessorsFromEnv = exports.getOtlpProtocolFromEnv = exports.filterBlanksAndNulls = exports.getResourceDetectorsFromEnv = void 0;
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
const RESOURCE_DETECTOR_ENVIRONMENT = 'env';
const RESOURCE_DETECTOR_HOST = 'host';
const RESOURCE_DETECTOR_OS = 'os';
const RESOURCE_DETECTOR_PROCESS = 'process';
const RESOURCE_DETECTOR_SERVICE_INSTANCE_ID = 'serviceinstance';
function getResourceDetectorsFromEnv() {
    // When updating this list, make sure to also update the section `resourceDetectors` on README.
    const resourceDetectors = new Map([
        [RESOURCE_DETECTOR_ENVIRONMENT, resources_1.envDetector],
        [RESOURCE_DETECTOR_HOST, resources_1.hostDetector],
        [RESOURCE_DETECTOR_OS, resources_1.osDetector],
        [RESOURCE_DETECTOR_SERVICE_INSTANCE_ID, resources_1.serviceInstanceIdDetector],
        [RESOURCE_DETECTOR_PROCESS, resources_1.processDetector],
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
function filterBlanksAndNulls(list) {
    return list.map(item => item.trim()).filter(s => s !== 'null' && s !== '');
}
exports.filterBlanksAndNulls = filterBlanksAndNulls;
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
function getJaegerExporter() {
    // The JaegerExporter does not support being required in bundled
    // environments. By delaying the require statement to here, we only crash when
    // the exporter is actually used in such an environment.
    try {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const { JaegerExporter } = require('@opentelemetry/exporter-jaeger');
        return new JaegerExporter();
    }
    catch (e) {
        throw new Error(`Could not instantiate JaegerExporter. This could be due to the JaegerExporter's lack of support for bundling. If possible, use @opentelemetry/exporter-trace-otlp-proto instead. Original Error: ${e}`);
    }
}
function getSpanProcessorsFromEnv() {
    const exportersMap = new Map([
        ['otlp', () => getOtlpExporterFromEnv()],
        ['zipkin', () => new exporter_zipkin_1.ZipkinExporter()],
        ['console', () => new sdk_trace_base_1.ConsoleSpanExporter()],
        ['jaeger', () => getJaegerExporter()],
    ]);
    const exporters = [];
    const processors = [];
    let traceExportersList = filterBlanksAndNulls(Array.from(new Set((0, core_1.getStringListFromEnv)('OTEL_TRACES_EXPORTER'))));
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
    const propagators = uniquePropagatorNames.map(name => {
        const propagator = propagatorsFactory.get(name)?.();
        if (!propagator) {
            api_1.diag.warn(`Propagator "${name}" requested through environment variable is unavailable.`);
            return undefined;
        }
        return propagator;
    });
    const validPropagators = propagators.reduce((list, item) => {
        if (item) {
            list.push(item);
        }
        return list;
    }, []);
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
//# sourceMappingURL=utils.js.map