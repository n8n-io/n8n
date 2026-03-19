import { z } from 'zod';

import { Config, Env } from '../decorators';

/** Schema for sample rates (0.0 to 1.0). */
const sampleRateSchema = z.number({ coerce: true }).min(0).max(1);

@Config
export class OtelConfig {
	/** Whether to enable OpenTelemetry tracing. */
	@Env('OTEL_ENABLED')
	enabled: boolean = false;

	/** OTLP exporter endpoint. */
	@Env('OTEL_EXPORTER_OTLP_ENDPOINT')
	otlpEndpoint: string = 'http://localhost:4318';

	/** OTLP exporter protocol ('http/protobuf' or 'grpc'). */
	@Env('OTEL_EXPORTER_OTLP_PROTOCOL')
	otlpProtocol: string = 'http/protobuf';

	/** Service name reported to the OTLP backend. */
	@Env('OTEL_SERVICE_NAME')
	serviceName: string = 'n8n';

	/** Trace sampling rate (0.0 to 1.0). */
	@Env('OTEL_TRACES_SAMPLER_ARG', sampleRateSchema)
	sampleRate: number = 1;
}
