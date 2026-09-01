import { z } from 'zod';

import { Z } from '../../zod-class';

/**
 * Wire protocols for the OTLP trace exporter, using the value strings from the
 * upstream `OTEL_EXPORTER_OTLP_PROTOCOL` spec. `http/json` is not supported.
 * Declared here because both the frontend and the backend use it.
 */
export const OTLP_PROTOCOLS = ['http/protobuf', 'grpc'] as const;

export type OtlpProtocol = (typeof OTLP_PROTOCOLS)[number];

/**
 * The exporter endpoint. `z.string().url()` alone is too permissive: it accepts
 * opaque URLs such as `localhost:4318` and any scheme, e.g. `grpc://host:4317`.
 * The scheme is load-bearing — it selects TLS for both protocols — so only
 * `http://` and `https://` are valid. The match is case-insensitive because URL
 * schemes are case-insensitive (RFC 3986), so `HTTP://host` must keep passing.
 * Every value this rule rejects already fails at export time, so no working
 * configuration stops validating.
 */
export const exporterEndpointSchema = z
	.string()
	.url()
	.regex(/^https?:\/\//i, 'Endpoint must start with http:// or https://. The scheme selects TLS.');

export class UpdateOtelSettingsDto extends Z.class({
	enabled: z.boolean(),
	// Defaulted rather than required: this endpoint shipped without the field, so
	// a body written against the older API must stay valid on upgrade.
	exporterProtocol: z.enum(OTLP_PROTOCOLS).default('http/protobuf'),
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
