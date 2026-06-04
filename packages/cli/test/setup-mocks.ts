import 'reflect-metadata';

// Clear proxy env vars so axios doesn't create HttpsProxyAgent for outbound requests.
// Nock 14 uses @mswjs/interceptors which cannot intercept requests routed through a
// proxy agent, causing "No socket was returned" failures when no real proxy is reachable.
for (const key of [
	'HTTP_PROXY',
	'http_proxy',
	'HTTPS_PROXY',
	'https_proxy',
	'ALL_PROXY',
	'all_proxy',
	'NO_PROXY',
	'no_proxy',
]) {
	delete process.env[key];
}

vi.mock('@sentry/node');
vi.mock('@n8n_io/license-sdk');
vi.mock('@/telemetry');
vi.mock('@/eventbus/message-event-bus/message-event-bus');
vi.mock('@/push');
vi.mock('node:fs');
vi.mock('node:fs/promises');
