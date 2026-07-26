import 'reflect-metadata';
import axios from 'axios';

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

// Mirror the global axios default that n8n-core sets at import time
// (`axios.defaults.proxy = false`). Under Vitest, core's axios-config side effect
// is not loaded into every test's module graph, so reproduce it here to keep the
// proxy-disabled-by-default behavior consistent with production.
axios.defaults.proxy = false;

vi.mock('@sentry/node');
vi.mock('@n8n_io/license-sdk');
vi.mock('@/telemetry');
vi.mock('@/eventbus/message-event-bus/message-event-bus');
vi.mock('@/push');
