import { Config, Env } from '@n8n/config';

@Config
export class OtelConfig {
	@Env('N8N_OTEL_ENABLED')
	enabled: boolean = false;

	@Env('N8N_OTEL_EXPORTER_OTLP_ENDPOINT')
	exporterOtlpEndpoint: string = 'http://localhost:4318';

	@Env('N8N_OTEL_EXPORTER_OTLP_HEADERS')
	exporterOtlpHeaders: string = '';

	@Env('N8N_OTEL_TRACES_SAMPLE_RATE')
	tracesSampleRate: number = 1.0;
}
