import { Config, Env } from '@n8n/config';

@Config
export class OtelConfig {
	@Env('N8N_OTEL_ENABLED')
	enabled: boolean = false;

	@Env('N8N_OTEL_EXPORTER_OTLP_ENDPOINT')
	exporterEndpoint: string = 'http://localhost:4318';

	@Env('N8N_OTEL_EXPORTER_OTLP_TRACING_PATH')
	exporterTracingPath: string = '/v1/traces';

	@Env('N8N_OTEL_EXPORTER_OTLP_HEADERS')
	exporterHeaders: string = '';

	@Env('N8N_OTEL_EXPORTER_SERVICE_NAME')
	exporterServiceName: string = 'n8n';

	@Env('N8N_OTEL_TRACES_SAMPLE_RATE')
	tracesSampleRate: number = 1.0;

	@Env('N8N_OTEL_STARTUP_CONNECTIVITY_TIMEOUT_MS')
	startupConnectivityTimeoutMs: number = 2_000;

	@Env('N8N_OTEL_TRACES_INCLUDE_NODE_SPANS')
	includeNodeSpans: boolean = true;

	@Env('N8N_OTEL_TRACES_INJECT_OUTBOUND')
	injectOutbound: boolean = true;
}
