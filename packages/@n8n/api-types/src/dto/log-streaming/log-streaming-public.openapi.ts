import type { ZodOpenAPIMetadata } from '@asteasolutions/zod-to-openapi';

export const logStreamingEventTypesFieldDocs = {
	data: {
		description: 'Event names that can be streamed to a destination.',
		example: ['n8n.workflow.started', 'n8n.workflow.success', 'n8n.workflow.failed'] as string[],
	},
} as const satisfies Record<string, ZodOpenAPIMetadata>;

export const logStreamingDestinationDocs = {
	description:
		'A log streaming destination. The `type` field selects the variant and its type-specific fields: `webhook`, `syslog`, or `sentry`.',
} as const satisfies ZodOpenAPIMetadata;

export const logStreamingDestinationListFieldDocs = {
	data: { description: 'The configured log streaming destinations.' },
} as const satisfies Record<string, ZodOpenAPIMetadata>;

export const logStreamingDestinationCommonFieldDocs = {
	id: {
		description:
			'Server-generated unique id of the destination. Returned in responses; not accepted in requests.',
		example: '88be6560-bfb4-455c-8aa1-06971e9e5522',
	},
	label: { description: 'Human-readable name shown in the UI.', example: 'My destination' },
	enabled: { description: 'Whether the destination currently receives events.', example: true },
	subscribedEvents: {
		description:
			'Event names (or group prefixes, e.g. `n8n.workflow`, which matches all `n8n.workflow.*` events) this destination receives. Retrieve the full list of streamable event names from `GET /settings/log-streaming/event-types`.',
		example: ['n8n.workflow', 'n8n.audit'] as string[],
	},
	anonymizeAuditMessages: {
		description: 'Whether audit message payloads are anonymized before being sent.',
		example: false,
	},
	circuitBreaker: {
		description:
			'Circuit-breaker tuning for delivery. After repeated failures the destination stops sending for a cool-down window instead of hammering an unhealthy target. All fields are optional; sensible defaults apply when omitted.',
	},
} as const satisfies Record<string, ZodOpenAPIMetadata>;

/**
 * A read-only request field has no runtime type of its own, so its descriptor must carry the whole
 * documented schema.
 */
export const logStreamingDestinationRequestReadOnlyFieldDocs = {
	id: { type: 'string', readOnly: true, ...logStreamingDestinationCommonFieldDocs.id },
} as const satisfies Record<string, ZodOpenAPIMetadata>;

export const logStreamingCircuitBreakerFieldDocs = {
	maxFailures: {
		description: 'Maximum failures within the sliding window before the breaker opens.',
	},
	failureWindow: {
		description: 'Sliding window, in milliseconds, over which failures are counted.',
	},
} as const satisfies Record<string, ZodOpenAPIMetadata>;

export const logStreamingParameterListDocs = {
	description: 'Key-value pairs used when the matching `specify*` field is `keypair`.',
} as const satisfies ZodOpenAPIMetadata;

export const logStreamingParameterFieldDocs = {
	name: { example: 'Authorization' },
	value: {
		description: 'Parameter value. Usually a string; numbers, booleans and null are also accepted.',
		example: 'Bearer <token>',
	},
} as const satisfies Record<string, ZodOpenAPIMetadata>;

export const logStreamingWebhookFieldDocs = {
	type: { description: 'Sends each event as an HTTP request to a URL.', example: 'webhook' },
	url: {
		description: 'Target URL that receives the event payload.',
		example: 'https://example.com/n8n-events',
	},
	method: { description: 'HTTP method used for the request.', example: 'POST' },
	sendHeaders: { description: 'Whether to attach custom headers to the request.', example: false },
	specifyHeaders: {
		description: 'How custom headers are provided — `keypair` or `json`.',
		example: 'keypair',
	},
	jsonHeaders: { description: 'Custom headers as a JSON string when `specifyHeaders` is `json`.' },
	sendQuery: {
		description: 'Whether to attach query parameters to the request.',
		example: false,
	},
	specifyQuery: { description: 'How query parameters are provided — `keypair` or `json`.' },
	jsonQuery: { description: 'Query parameters as a JSON string when `specifyQuery` is `json`.' },
	options: { description: 'Additional HTTP request options.' },
} as const satisfies Record<string, ZodOpenAPIMetadata>;

export const logStreamingWebhookOptionsFieldDocs = {
	timeout: { description: 'Request timeout in milliseconds.' },
	allowUnauthorizedCerts: {
		description: 'Accept self-signed or otherwise invalid TLS certificates.',
	},
	queryParameterArrays: {
		description: 'How array-valued query parameters are serialized into the query string.',
	},
	redirect: { description: 'Redirect-following behaviour.' },
	followRedirects: { description: 'Whether to follow HTTP redirects.' },
	maxRedirects: { description: 'Maximum number of redirects to follow.' },
	proxy: { description: 'Outbound proxy configuration.' },
	protocol: { description: 'Proxy protocol.' },
	host: { description: 'Proxy host, without protocol or port.' },
	port: { description: 'Proxy port.' },
	socket: { description: 'Connection socket options.' },
	keepAlive: { description: 'Whether to keep sockets open for reuse.' },
	maxSockets: { description: 'Maximum sockets per host kept open at once.' },
	maxFreeSockets: { description: 'Maximum idle sockets per host kept open.' },
} as const satisfies Record<string, ZodOpenAPIMetadata>;

export const logStreamingSyslogFieldDocs = {
	type: { description: 'Sends each event to a syslog server.', example: 'syslog' },
	host: { description: 'Syslog server host.', example: 'syslog.example.com' },
	port: { description: 'Syslog server port.', example: 514 },
	protocol: { description: 'Transport protocol.', example: 'udp' },
	facility: {
		description:
			'Syslog facility code (0–23, per RFC 5424). Common values: 0 Kernel, 1 User, 3 System, 13 Audit, 14 Alert, 16 Local0, 17 Local1, 18 Local2, 19 Local3, 20 Local4, 21 Local5, 22 Local6, 23 Local7.',
		example: 16,
	},
	app_name: { description: 'Application name reported in the syslog message.', example: 'n8n' },
	tlsCa: { description: 'PEM-encoded CA certificate used when `protocol` is `tls`.' },
} as const satisfies Record<string, ZodOpenAPIMetadata>;

export const logStreamingSentryFieldDocs = {
	type: { description: 'Sends each event to a Sentry project.', example: 'sentry' },
	dsn: {
		description: 'Sentry DSN the events are sent to.',
		example: 'https://examplePublicKey@o0.ingest.sentry.io/0',
	},
} as const satisfies Record<string, ZodOpenAPIMetadata>;
