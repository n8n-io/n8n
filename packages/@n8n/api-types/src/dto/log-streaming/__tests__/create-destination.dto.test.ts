import { CreateDestinationDto } from '../create-destination.dto';

describe('CreateDestinationDto', () => {
	describe('Webhook Destination - Valid requests', () => {
		test.each([
			{
				name: 'minimal webhook destination',
				request: {
					__type: '$$MessageEventBusDestinationWebhook',
					url: 'https://example.com/webhook',
				},
				parsedResult: {
					__type: '$$MessageEventBusDestinationWebhook',
					url: 'https://example.com/webhook',
				},
			},
			{
				name: 'webhook with all optional fields',
				request: {
					__type: '$$MessageEventBusDestinationWebhook',
					url: 'https://example.com/webhook',
					id: '550e8400-e29b-41d4-a716-446655440000',
					label: 'Production Webhook',
					enabled: true,
					subscribedEvents: ['n8n.audit', 'n8n.workflow'],
					anonymizeAuditMessages: false,
					method: 'POST',
					authentication: 'none',
					sendPayload: true,
				},
				parsedResult: {
					__type: '$$MessageEventBusDestinationWebhook',
					url: 'https://example.com/webhook',
					id: '550e8400-e29b-41d4-a716-446655440000',
					label: 'Production Webhook',
					enabled: true,
					subscribedEvents: ['n8n.audit', 'n8n.workflow'],
					anonymizeAuditMessages: false,
					method: 'POST',
					authentication: 'none',
					sendPayload: true,
				},
			},
			{
				name: 'webhook with circuit breaker options',
				request: {
					__type: '$$MessageEventBusDestinationWebhook',
					url: 'https://example.com/webhook',
					circuitBreaker: {
						maxFailures: 5,
						maxDuration: 10000,
						halfOpenRequests: 3,
						failureWindow: 60000,
						maxConcurrentHalfOpenRequests: 2,
					},
				},
				parsedResult: {
					__type: '$$MessageEventBusDestinationWebhook',
					url: 'https://example.com/webhook',
					circuitBreaker: {
						maxFailures: 5,
						maxDuration: 10000,
						halfOpenRequests: 3,
						failureWindow: 60000,
						maxConcurrentHalfOpenRequests: 2,
					},
				},
			},
			{
				name: 'webhook with nested proxy from fixedCollection',
				request: {
					__type: '$$MessageEventBusDestinationWebhook',
					url: 'https://example.com/webhook',
					options: {
						proxy: {
							proxy: {
								protocol: 'http',
								host: '127.0.0.1',
								port: 3128,
							},
						},
					},
				},
				parsedResult: {
					__type: '$$MessageEventBusDestinationWebhook',
					url: 'https://example.com/webhook',
					options: {
						proxy: {
							proxy: {
								protocol: 'http',
								host: '127.0.0.1',
								port: 3128,
							},
						},
					},
				},
			},
			{
				name: 'webhook with nested redirect from fixedCollection',
				request: {
					__type: '$$MessageEventBusDestinationWebhook',
					url: 'https://example.com/webhook',
					options: {
						redirect: {
							redirect: {
								followRedirects: true,
								maxRedirects: 10,
							},
						},
					},
				},
				parsedResult: {
					__type: '$$MessageEventBusDestinationWebhook',
					url: 'https://example.com/webhook',
					options: {
						redirect: {
							redirect: {
								followRedirects: true,
								maxRedirects: 10,
							},
						},
					},
				},
			},
		])('should validate $name', ({ request, parsedResult }) => {
			const result = CreateDestinationDto.safeParse(request);
			expect(result.success).toBe(true);
			expect(result.data).toMatchObject(parsedResult);
		});
	});

	describe('Sentry Destination - Valid requests', () => {
		test.each([
			{
				name: 'minimal sentry destination',
				request: {
					__type: '$$MessageEventBusDestinationSentry',
					dsn: 'https://public@sentry.io/1',
				},
				parsedResult: {
					__type: '$$MessageEventBusDestinationSentry',
					dsn: 'https://public@sentry.io/1',
				},
			},
			{
				name: 'sentry with all optional fields',
				request: {
					__type: '$$MessageEventBusDestinationSentry',
					dsn: 'https://public@sentry.io/1',
					id: '550e8400-e29b-41d4-a716-446655440000',
					label: 'Production Sentry',
					enabled: true,
					subscribedEvents: ['n8n.audit'],
					anonymizeAuditMessages: true,
					tracesSampleRate: 0.5,
					sendPayload: false,
				},
				parsedResult: {
					__type: '$$MessageEventBusDestinationSentry',
					dsn: 'https://public@sentry.io/1',
					id: '550e8400-e29b-41d4-a716-446655440000',
					label: 'Production Sentry',
					enabled: true,
					subscribedEvents: ['n8n.audit'],
					anonymizeAuditMessages: true,
					tracesSampleRate: 0.5,
					sendPayload: false,
				},
			},
			{
				name: 'sentry with traces sample rate 0',
				request: {
					__type: '$$MessageEventBusDestinationSentry',
					dsn: 'https://public@sentry.io/1',
					tracesSampleRate: 0,
				},
				parsedResult: {
					__type: '$$MessageEventBusDestinationSentry',
					dsn: 'https://public@sentry.io/1',
					tracesSampleRate: 0,
				},
			},
			{
				name: 'sentry with traces sample rate 1',
				request: {
					__type: '$$MessageEventBusDestinationSentry',
					dsn: 'https://public@sentry.io/1',
					tracesSampleRate: 1,
				},
				parsedResult: {
					__type: '$$MessageEventBusDestinationSentry',
					dsn: 'https://public@sentry.io/1',
					tracesSampleRate: 1,
				},
			},
		])('should validate $name', ({ request, parsedResult }) => {
			const result = CreateDestinationDto.safeParse(request);
			expect(result.success).toBe(true);
			expect(result.data).toMatchObject(parsedResult);
		});
	});

	describe('Syslog Destination - Valid requests', () => {
		test.each([
			{
				name: 'minimal syslog destination',
				request: {
					__type: '$$MessageEventBusDestinationSyslog',
					host: '127.0.0.1',
				},
				parsedResult: {
					__type: '$$MessageEventBusDestinationSyslog',
					host: '127.0.0.1',
				},
			},
			{
				name: 'syslog with all optional fields',
				request: {
					__type: '$$MessageEventBusDestinationSyslog',
					host: 'syslog.example.com',
					id: '550e8400-e29b-41d4-a716-446655440000',
					label: 'Production Syslog',
					enabled: true,
					subscribedEvents: ['n8n.workflow', 'n8n.execution'],
					anonymizeAuditMessages: false,
					port: 514,
					protocol: 'tcp',
					facility: 16,
					app_name: 'n8n-production',
					eol: '\n',
				},
				parsedResult: {
					__type: '$$MessageEventBusDestinationSyslog',
					host: 'syslog.example.com',
					id: '550e8400-e29b-41d4-a716-446655440000',
					label: 'Production Syslog',
					enabled: true,
					subscribedEvents: ['n8n.workflow', 'n8n.execution'],
					anonymizeAuditMessages: false,
					port: 514,
					protocol: 'tcp',
					facility: 16,
					app_name: 'n8n-production',
					eol: '\n',
				},
			},
			{
				name: 'syslog with UDP protocol',
				request: {
					__type: '$$MessageEventBusDestinationSyslog',
					host: 'localhost',
					protocol: 'udp',
				},
				parsedResult: {
					__type: '$$MessageEventBusDestinationSyslog',
					host: 'localhost',
					protocol: 'udp',
				},
			},
			{
				name: 'syslog with TLS protocol',
				request: {
					__type: '$$MessageEventBusDestinationSyslog',
					host: 'secure.syslog.com',
					protocol: 'tls',
					port: 6514,
				},
				parsedResult: {
					__type: '$$MessageEventBusDestinationSyslog',
					host: 'secure.syslog.com',
					protocol: 'tls',
					port: 6514,
				},
			},
			{
				name: 'syslog with minimum facility (0)',
				request: {
					__type: '$$MessageEventBusDestinationSyslog',
					host: 'localhost',
					facility: 0,
				},
				parsedResult: {
					__type: '$$MessageEventBusDestinationSyslog',
					host: 'localhost',
					facility: 0,
				},
			},
			{
				name: 'syslog with maximum facility (23)',
				request: {
					__type: '$$MessageEventBusDestinationSyslog',
					host: 'localhost',
					facility: 23,
				},
				parsedResult: {
					__type: '$$MessageEventBusDestinationSyslog',
					host: 'localhost',
					facility: 23,
				},
			},
		])('should validate $name', ({ request, parsedResult }) => {
			const result = CreateDestinationDto.safeParse(request);
			expect(result.success).toBe(true);
			expect(result.data).toMatchObject(parsedResult);
		});
	});

	describe('Invalid requests', () => {
		test.each([
			{
				name: 'invalid __type',
				request: {
					__type: 'InvalidType',
					url: 'https://example.com/webhook',
				},
				expectedErrorPaths: ['__type'],
			},
			{
				name: 'webhook missing required url',
				request: {
					__type: '$$MessageEventBusDestinationWebhook',
				},
				expectedErrorPaths: ['url'],
			},
			{
				name: 'webhook with invalid url',
				request: {
					__type: '$$MessageEventBusDestinationWebhook',
					url: 'not-a-url',
				},
				expectedErrorPaths: ['url'],
			},
			{
				name: 'webhook URL without a domain',
				request: {
					__type: '$$MessageEventBusDestinationWebhook',
					url: 'https://',
				},
				expectedErrorPaths: ['url'],
			},
			{
				name: 'webhook with invalid authentication type',
				request: {
					__type: '$$MessageEventBusDestinationWebhook',
					url: 'https://example.com/webhook',
					authentication: 'invalidAuth',
				},
				expectedErrorPaths: ['authentication'],
			},
			{
				name: 'sentry missing required dsn',
				request: {
					__type: '$$MessageEventBusDestinationSentry',
				},
				expectedErrorPaths: ['dsn'],
			},
			{
				name: 'sentry with invalid dsn',
				request: {
					__type: '$$MessageEventBusDestinationSentry',
					dsn: 'not-a-url',
				},
				expectedErrorPaths: ['dsn'],
			},
			{
				name: 'sentry DSN without a domain',
				request: {
					__type: '$$MessageEventBusDestinationSentry',
					dsn: 'https://',
				},
				expectedErrorPaths: ['dsn'],
			},
			{
				name: 'sentry with traces sample rate below 0',
				request: {
					__type: '$$MessageEventBusDestinationSentry',
					dsn: 'https://public@sentry.io/1',
					tracesSampleRate: -0.1,
				},
				expectedErrorPaths: ['tracesSampleRate'],
			},
			{
				name: 'sentry with traces sample rate above 1',
				request: {
					__type: '$$MessageEventBusDestinationSentry',
					dsn: 'https://public@sentry.io/1',
					tracesSampleRate: 1.1,
				},
				expectedErrorPaths: ['tracesSampleRate'],
			},
			{
				name: 'syslog missing required host',
				request: {
					__type: '$$MessageEventBusDestinationSyslog',
				},
				expectedErrorPaths: ['host'],
			},
			{
				name: 'syslog with empty host',
				request: {
					__type: '$$MessageEventBusDestinationSyslog',
					host: '',
				},
				expectedErrorPaths: ['host'],
			},
			{
				name: 'syslog with numeric shorthand host',
				request: {
					__type: '$$MessageEventBusDestinationSyslog',
					host: '1',
				},
				expectedErrorPaths: ['host'],
			},
			{
				name: 'syslog with invalid host and port',
				request: {
					__type: '$$MessageEventBusDestinationSyslog',
					host: '',
					port: 0,
				},
				expectedErrorPaths: ['host', 'port'],
			},
			{
				name: 'syslog with invalid port (negative)',
				request: {
					__type: '$$MessageEventBusDestinationSyslog',
					host: 'localhost',
					port: -1,
				},
				expectedErrorPaths: ['port'],
			},
			{
				name: 'syslog with invalid port (zero)',
				request: {
					__type: '$$MessageEventBusDestinationSyslog',
					host: 'localhost',
					port: 0,
				},
				expectedErrorPaths: ['port'],
			},
			{
				name: 'syslog with invalid protocol',
				request: {
					__type: '$$MessageEventBusDestinationSyslog',
					host: 'localhost',
					protocol: 'http',
				},
				expectedErrorPaths: ['protocol'],
			},
			{
				name: 'syslog with facility below 0',
				request: {
					__type: '$$MessageEventBusDestinationSyslog',
					host: 'localhost',
					facility: -1,
				},
				expectedErrorPaths: ['facility'],
			},
			{
				name: 'syslog with facility above 23',
				request: {
					__type: '$$MessageEventBusDestinationSyslog',
					host: 'localhost',
					facility: 24,
				},
				expectedErrorPaths: ['facility'],
			},
			{
				name: 'webhook with flat proxy (missing fixedCollection nesting)',
				request: {
					__type: '$$MessageEventBusDestinationWebhook',
					url: 'https://example.com/webhook',
					options: {
						proxy: {
							protocol: 'http',
							host: '127.0.0.1',
							port: 3128,
						},
					},
				},
				expectedErrorPaths: ['proxy'],
			},
			{
				name: 'circuit breaker with negative maxFailures',
				request: {
					__type: '$$MessageEventBusDestinationWebhook',
					url: 'https://example.com/webhook',
					circuitBreaker: {
						maxFailures: -1,
					},
				},
				expectedErrorPaths: ['circuitBreaker', 'maxFailures'],
			},
			{
				name: 'circuit breaker with zero maxFailures',
				request: {
					__type: '$$MessageEventBusDestinationWebhook',
					url: 'https://example.com/webhook',
					circuitBreaker: {
						maxFailures: 0,
					},
				},
				expectedErrorPaths: ['circuitBreaker', 'maxFailures'],
			},
		])('should fail validation for $name', ({ request, expectedErrorPaths }) => {
			const result = CreateDestinationDto.safeParse(request);
			const issuesPaths = result.error?.issues.map((issue) => issue.path.join('.')) ?? [];

			expect(result.success).toBe(false);

			// Check that all expected error paths are present
			for (const expectedPath of expectedErrorPaths) {
				expect(issuesPaths.some((path) => path.includes(expectedPath))).toBe(true);
			}
		});
	});
});

describe('Destination host validation', () => {
	test.each([
		'localhost',
		'otel-collector',
		'log_collector',
		'123.example.com',
		'example.com.',
		'127.0.0.1',
		'::1',
		'2001:db8:85a3:0000:0000:8a2e:0370:7334',
	])('accepts syslog host %s', (host) => {
		expect(
			CreateDestinationDto.safeParse({ __type: '$$MessageEventBusDestinationSyslog', host })
				.success,
		).toBe(true);
	});

	test.each([
		'1',
		'127.1',
		'256.0.0.1',
		'foo..com',
		'-host',
		'host-',
		'::1]/x',
		'::1]?x',
		'::1]#x',
		'[::1]',
		'not:a:host',
	])('rejects syslog host %s', (host) => {
		const result = CreateDestinationDto.safeParse({
			__type: '$$MessageEventBusDestinationSyslog',
			host,
		});
		expect(result.success).toBe(false);
		expect(result.error?.issues.map((issue) => issue.path)).toContainEqual(['host']);
	});

	describe.each([
		{ __type: '$$MessageEventBusDestinationWebhook', field: 'url' },
		{ __type: '$$MessageEventBusDestinationSentry', field: 'dsn' },
	])('$field', ({ __type, field }) => {
		test.each([
			'http://otel-collector:4318/1',
			'https://123.example.com/1',
			'http://localhost:8080/1',
			'https://example.com./1',
			'http://127.0.0.1/1',
			'http://[::1]/1',
			'https://public@sentry-internal/1',
			'http://log_collector:8080/1',
		])('accepts %s', (value) => {
			expect(CreateDestinationDto.safeParse({ __type, [field]: value }).success).toBe(true);
		});
		test.each([
			'https://',
			'https://foo..com/1',
			'https://-host.com/1',
			'https://host-.com/1',
			'ftp://example.com/1',
		])('rejects %s', (value) => {
			const result = CreateDestinationDto.safeParse({ __type, [field]: value });
			expect(result.success).toBe(false);
			expect(result.error?.issues.map((issue) => issue.path)).toContainEqual([field]);
		});
	});
});
