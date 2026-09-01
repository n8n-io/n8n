import { z } from 'zod';

import { Z } from '../../zod-class';

/**
 * Wire protocols for the OTLP trace exporter, using the value strings from the
 * upstream `OTEL_EXPORTER_OTLP_PROTOCOL` spec. `http/json` is not supported.
 */
export const OTLP_PROTOCOLS = ['http/protobuf', 'grpc'] as const;

export type OtlpProtocol = (typeof OTLP_PROTOCOLS)[number];

export const otlpProtocolSchema = z.enum(OTLP_PROTOCOLS);

/**
 * `z.string().url()` alone accepts opaque URLs such as `localhost:4318` and any
 * scheme. The scheme selects TLS for both protocols, so it must be http(s).
 */
export const exporterEndpointSchema = z
	.string()
	.url()
	.regex(/^https?:\/\//i, 'Endpoint must start with http:// or https://. The scheme selects TLS.');

export class UpdateOtelSettingsDto extends Z.class({
	enabled: z.boolean(),
	// Defaulted so a body from before the field still parses. An omitted protocol takes
	// the default, so an instance whose env var pins another protocol rejects the write.
	exporterProtocol: otlpProtocolSchema.default('http/protobuf'),
	exporterEndpoint: exporterEndpointSchema,
	// Ignored when the protocol is gRPC (gRPC endpoints take no URL path), but
	// still required so toggling protocols round-trips without losing the value.
	exporterTracingPath: z.string(),
	exporterServiceName: z.string().min(1),
	exporterHeaders: z.string(),
	tracesSampleRate: z.number().min(0).max(1),
	startupConnectivityTimeoutMs: z.number().int().nonnegative(),
	includeNodeSpans: z.boolean(),
	injectOutbound: z.boolean(),
	productionExecutionsOnly: z.boolean(),
}) {}
