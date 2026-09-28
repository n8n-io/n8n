import type { ZodOpenAPIMetadata } from '@asteasolutions/zod-to-openapi';

export const otelTestTraceRequestDocs = {
	description:
		'The connection details to test against an OTLP collector. Fields managed declaratively via environment variables are overridden with their effective value before the test is sent.',
} satisfies ZodOpenAPIMetadata;

export const otelTestTraceResultDocs = {
	description: 'The outcome of the test connection to the OTLP collector.',
} satisfies ZodOpenAPIMetadata;

export const otelTestTraceRequestFieldDocs = {
	exporterProtocol: {
		description:
			'The wire protocol used to send the test span. Collectors conventionally serve OTLP/HTTP on port 4318 and OTLP/gRPC on port 4317. The endpoint scheme (`http://` or `https://`) controls TLS for both protocols. Optional: omitting it selects `http/protobuf`, unless an environment variable manages this field, which then supplies the value.',
		example: 'http/protobuf',
	},
	exporterEndpoint: {
		description:
			'The base URL of the OTLP collector to export traces to. The value must be an `http://` or `https://` URL, because the scheme selects TLS — for gRPC, `https://` uses SSL and `http://` is plaintext.',
		example: 'http://localhost:4318',
	},
	exporterTracingPath: {
		description:
			'The path appended to the endpoint for the OTLP traces signal. Ignored when `exporterProtocol` is `grpc`, which takes no URL path.',
		example: '/v1/traces',
	},
	exporterServiceName: {
		description: 'The `service.name` resource attribute reported on the test span.',
		example: 'n8n',
	},
	exporterHeaders: {
		description:
			'Additional headers sent to the OTLP collector, as a single string of comma-separated `key=value` pairs (e.g. `authorization=Bearer my-token,x-tenant-id=acme`). Whitespace around each key and value is trimmed; a value may contain spaces but not commas. Use an empty string when unused.',
		example: 'authorization=Bearer my-token,x-tenant-id=acme',
	},
	startupConnectivityTimeoutMs: {
		description: 'How long, in milliseconds, to wait for the collector to respond.',
		example: 2000,
	},
} as const satisfies Record<string, ZodOpenAPIMetadata>;

export const otelTestTraceResultFieldDocs = {
	success: {
		description: 'Whether the test span was accepted by the collector.',
		example: true,
	},
	error: {
		description:
			'The error reported by the collector or exporter. Present only when `success` is false.',
		example: 'Failed to connect: 401 Unauthorized',
	},
} as const satisfies Record<string, ZodOpenAPIMetadata>;
