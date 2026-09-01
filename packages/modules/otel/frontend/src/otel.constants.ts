import { OTLP_PROTOCOLS, type OtlpProtocol } from '@n8n/api-types';

export { OTLP_PROTOCOLS, type OtlpProtocol };

export const OTEL_STORE = 'otel';

/**
 * Route name for the OpenTelemetry settings page. Owned by this module rather
 * than by the shared `VIEWS` enum, so the module can be packaged without the
 * shell holding one of its identifiers. The value is unchanged, so existing
 * URLs and telemetry keep resolving.
 */
export const OTEL_SETTINGS_VIEW = 'SettingsOpenTelemetryView';

/** Name of the span emitted by the "Send test trace" button — shown in the result copy. */
export const OTEL_TEST_SPAN_NAME = 'n8n.test_trace';

/** Maps each settings field to its env-var name — shown in per-field tooltips. */
export const OTEL_FIELD_ENV_VARS = {
	enabled: 'N8N_OTEL_ENABLED',
	exporterProtocol: 'N8N_OTEL_EXPORTER_OTLP_PROTOCOL',
	exporterEndpoint: 'N8N_OTEL_EXPORTER_OTLP_ENDPOINT',
	exporterTracingPath: 'N8N_OTEL_EXPORTER_OTLP_TRACING_PATH',
	exporterServiceName: 'N8N_OTEL_EXPORTER_SERVICE_NAME',
	exporterHeaders: 'N8N_OTEL_EXPORTER_OTLP_HEADERS',
	tracesSampleRate: 'N8N_OTEL_TRACES_SAMPLE_RATE',
	startupConnectivityTimeoutMs: 'N8N_OTEL_STARTUP_CONNECTIVITY_TIMEOUT_MS',
	includeNodeSpans: 'N8N_OTEL_TRACES_INCLUDE_NODE_SPANS',
	injectOutbound: 'N8N_OTEL_TRACES_INJECT_OUTBOUND',
	productionExecutionsOnly: 'N8N_OTEL_TRACES_PRODUCTION_ONLY',
} as const;
