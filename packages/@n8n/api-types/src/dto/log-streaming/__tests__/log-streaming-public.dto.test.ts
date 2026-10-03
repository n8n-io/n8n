import {
	LogStreamingDestinationListPublicDto,
	LogStreamingDestinationPublicDto,
	LogStreamingEventTypesPublicDto,
} from '../log-streaming-public.dto';

describe('LogStreamingEventTypesPublicDto', () => {
	test('accepts a list of event names', () => {
		const result = LogStreamingEventTypesPublicDto.safeParse({
			data: ['n8n.workflow.started', 'n8n.workflow.success', 'n8n.workflow.failed'],
		});

		expect(result.success).toBe(true);
	});

	test('accepts an empty list', () => {
		expect(LogStreamingEventTypesPublicDto.safeParse({ data: [] }).success).toBe(true);
	});

	test.each([
		['a missing data field', {}],
		['a string instead of the array', { data: 'n8n.workflow.started' }],
		['a non-string event name', { data: [1] }],
	])('rejects %s', (_, input) => {
		expect(LogStreamingEventTypesPublicDto.safeParse(input).success).toBe(false);
	});
});

const common = {
	id: '88be6560-bfb4-455c-8aa1-06971e9e5522',
	label: 'My destination',
	enabled: true,
	subscribedEvents: ['n8n.workflow', 'n8n.audit'],
	anonymizeAuditMessages: false,
	circuitBreaker: { maxFailures: 5, failureWindow: 60000 },
};

const webhook = {
	...common,
	type: 'webhook',
	url: 'https://example.com/n8n-events',
	method: 'POST',
	sendHeaders: true,
	specifyHeaders: 'keypair',
	headerParameters: { parameters: [{ name: 'Authorization', value: 'Bearer token' }] },
	sendQuery: false,
	options: {
		timeout: 5000,
		allowUnauthorizedCerts: false,
		queryParameterArrays: 'brackets',
		redirect: { redirect: { followRedirects: true, maxRedirects: 5 } },
		proxy: { proxy: { protocol: 'https', host: 'proxy.example.com', port: 8080 } },
		socket: { keepAlive: true, maxSockets: 50, maxFreeSockets: 5 },
	},
};

const syslog = {
	...common,
	type: 'syslog',
	host: 'syslog.example.com',
	port: 514,
	protocol: 'udp',
	facility: 16,
	app_name: 'n8n',
};

const sentry = {
	...common,
	type: 'sentry',
	dsn: 'https://examplePublicKey@o0.ingest.sentry.io/0',
};

describe('LogStreamingDestinationPublicDto', () => {
	test.each([
		['a webhook destination', webhook],
		['a syslog destination', syslog],
		['a sentry destination', sentry],
	])('accepts %s', (_, input) => {
		const result = LogStreamingDestinationPublicDto.safeParse(input);

		expect(result.success).toBe(true);
	});

	test('strips the fields the UI does not expose', () => {
		const result = LogStreamingDestinationPublicDto.parse({
			...webhook,
			__type: '$$MessageEventBusDestinationWebhook',
			credentials: { httpBasicAuth: { id: '1', name: 'basic' } },
			responseCodeMustMatch: true,
			sendPayload: true,
		});

		expect(result).not.toHaveProperty('__type');
		expect(result).not.toHaveProperty('credentials');
		expect(result).not.toHaveProperty('responseCodeMustMatch');
		expect(result).not.toHaveProperty('sendPayload');
	});

	test.each([
		['a missing id', { ...webhook, id: undefined }],
		['an unknown type', { ...webhook, type: 'kafka' }],
		['a webhook without a url', { ...webhook, url: undefined }],
		['a syslog without a host', { ...syslog, host: undefined }],
		['a sentry without a dsn', { ...sentry, dsn: undefined }],
		['a facility above 23', { ...syslog, facility: 24 }],
	])('rejects %s', (_, input) => {
		expect(LogStreamingDestinationPublicDto.safeParse(input).success).toBe(false);
	});
});

describe('LogStreamingDestinationListPublicDto', () => {
	test('accepts a list of destinations', () => {
		const result = LogStreamingDestinationListPublicDto.safeParse({
			data: [webhook, syslog, sentry],
		});

		expect(result.success).toBe(true);
	});

	test('rejects a missing data field', () => {
		expect(LogStreamingDestinationListPublicDto.safeParse({}).success).toBe(false);
	});
});
