import { z } from 'zod';

import { Z } from '../../zod-class';

export class UpdateOtelSettingsDto extends Z.class({
	enabled: z.boolean(),
	// Mirrors the upstream `OTEL_EXPORTER_OTLP_PROTOCOL` value strings. Redeclared
	// here because api-types cannot import from the backend's otel module.
	// Defaulted rather than required: this endpoint shipped without the field, so
	// a body written against the older API must stay valid on upgrade.
	exporterProtocol: z.enum(['http/protobuf', 'grpc']).default('http/protobuf'),
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
