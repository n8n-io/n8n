export const OTEL_STORE = 'otel';

/** Name of the span emitted by the "Send test trace" button — shown in the result copy. */
export const OTEL_TEST_SPAN_NAME = 'n8n.test_trace';

/** Maps each settings field to its env-var name — shown in per-field tooltips. */
export const OTEL_FIELD_ENV_VARS = {
	enabled: 'N8N_OTEL_ENABLED',
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
