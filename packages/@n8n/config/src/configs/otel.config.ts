import { z } from 'zod';

import { Config, Env } from '../decorators';

const sampleRateSchema = z.number({ coerce: true }).min(0).max(1);
const protocolSchema = z.enum(['http/protobuf', 'grpc']);

@Config
export class OtelConfig {
	/** Whether to enable OpenTelemetry tracing. */
	@Env('OTEL_ENABLED')
	enabled: boolean = false;

	/** OTLP exporter endpoint. */
	@Env('OTEL_EXPORTER_OTLP_ENDPOINT')
	otlpEndpoint: string = 'http://localhost:4318';

	/** OTLP exporter protocol. */
	@Env('OTEL_EXPORTER_OTLP_PROTOCOL', protocolSchema)
	otlpProtocol: 'http/protobuf' | 'grpc' = 'http/protobuf';

	/** Service name reported to the OTLP backend. */
	@Env('OTEL_SERVICE_NAME')
	serviceName: string = 'n8n';

	/** Trace sampling rate (0.0 to 1.0). */
	@Env('OTEL_TRACES_SAMPLER_ARG', sampleRateSchema)
	sampleRate: number = 1;
}
