import { z } from 'zod';

import { Z } from '../../zod-class';

export const OTLP_PROTOCOLS = ['http/protobuf', 'grpc'] as const;

export type OtlpProtocol = (typeof OTLP_PROTOCOLS)[number];

export const otlpProtocolSchema = z.enum(OTLP_PROTOCOLS);

export const exporterEndpointSchema = z
	.string()
	.url()
	.regex(/^https?:\/\//i, 'Endpoint must start with http:// or https://. The scheme selects TLS.');

export class UpdateOtelSettingsDto extends Z.class({
	enabled: z.boolean(),
	// Defaulted so a body from before this field existed still parses.
	exporterProtocol: otlpProtocolSchema.default('http/protobuf'),
	exporterEndpoint: exporterEndpointSchema,
	exporterTracingPath: z.string(),
	exporterServiceName: z.string().min(1),
	exporterHeaders: z.string(),
	tracesSampleRate: z.number().min(0).max(1),
	startupConnectivityTimeoutMs: z.number().int().nonnegative(),
	includeNodeSpans: z.boolean(),
	injectOutbound: z.boolean(),
	productionExecutionsOnly: z.boolean(),
}) {}
