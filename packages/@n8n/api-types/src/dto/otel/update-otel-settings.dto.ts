import { z } from 'zod';

import { Z } from '../../zod-class';

/**
 * Wire protocols for the OTLP trace exporter, using the value strings from the
 * upstream `OTEL_EXPORTER_OTLP_PROTOCOL` spec. `http/json` is not supported.
 * Declared here because both the frontend and the backend use it.
 */
export const OTLP_PROTOCOLS = ['http/protobuf', 'grpc'] as const;

export type OtlpProtocol = (typeof OTLP_PROTOCOLS)[number];

export class UpdateOtelSettingsDto extends Z.class({
	enabled: z.boolean(),
	// Defaulted rather than required: this endpoint shipped without the field, so
	// a body written against the older API must stay valid on upgrade.
	exporterProtocol: z.enum(OTLP_PROTOCOLS).default('http/protobuf'),
	exporterEndpoint: z.string().url(),
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
