"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.otelTelemetry = exports.OtelServerTelemetry = void 0;
const api_1 = require("@opentelemetry/api");
const resources_1 = require("@opentelemetry/resources");
const sdk_trace_node_1 = require("@opentelemetry/sdk-trace-node");
const exporter_trace_otlp_http_1 = require("@opentelemetry/exporter-trace-otlp-http");
const semantic_conventions_1 = require("@opentelemetry/semantic-conventions");
const update_version_notifier_1 = require("./utils/update-version-notifier");
const fetch_with_timeout_1 = require("./utils/fetch-with-timeout");
const OTEL_TRACES_URL = process.env.OTEL_TRACES_URL || 'https://otel.cloud.redocly.com/v1/traces';
class OtelServerTelemetry {
    init() {
        const nodeTracerProvider = new sdk_trace_node_1.NodeTracerProvider({
            resource: new resources_1.Resource({
                [semantic_conventions_1.ATTR_SERVICE_NAME]: `redocly-cli`,
                [semantic_conventions_1.ATTR_SERVICE_VERSION]: `@redocly/cli@${update_version_notifier_1.version}`,
            }),
        });
        nodeTracerProvider.addSpanProcessor(new sdk_trace_node_1.SimpleSpanProcessor(new exporter_trace_otlp_http_1.OTLPTraceExporter({
            url: OTEL_TRACES_URL,
            headers: {},
            timeoutMillis: fetch_with_timeout_1.DEFAULT_FETCH_TIMEOUT,
        })));
        nodeTracerProvider.register();
    }
    send(event, data) {
        const time = new Date();
        const eventId = crypto.randomUUID();
        const span = api_1.trace.getTracer('CliTelemetry').startSpan(`event.${event}`, {
            attributes: {
                'cloudevents.event_client.id': eventId,
                'cloudevents.event_client.type': event,
            },
            startTime: time,
        });
        for (const [key, value] of Object.entries(data)) {
            const keySnakeCase = key.replace(/([A-Z])/g, '_$1').toLowerCase();
            if (value !== undefined) {
                span.setAttribute(`cloudevents.event_data.${keySnakeCase}`, value);
            }
        }
        span.end(time);
    }
}
exports.OtelServerTelemetry = OtelServerTelemetry;
exports.otelTelemetry = new OtelServerTelemetry();
