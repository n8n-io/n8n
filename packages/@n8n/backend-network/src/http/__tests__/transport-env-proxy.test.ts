import http from 'node:http';

import { type LocalServer, startServer } from '../local-server';
import {
	createDispatcherTransport,
	type CreateDispatcherTransportOptions,
} from '../undici/transport';

// proxy-from-env reads these in both cases. Cleared so the host environment cannot change routing.
const PROXY_ENV_VARS = [
	'http_proxy',
	'https_proxy',
	'all_proxy',
	'no_proxy',
	'npm_config_proxy',
	'npm_config_http_proxy',
	'npm_config_https_proxy',
	'npm_config_no_proxy',
];

// Sends real requests through the `'env'` dispatcher to a local forward proxy.
describe("createDispatcherTransport({ proxy: 'env' })", () => {
	const requestLines: string[] = [];
	let target: LocalServer;
	let proxy: LocalServer;

	beforeAll(async () => {
		target = await startServer((req, res) => {
			// undici checks header timeouts about twice a second, so the delay must be well above 1 s.
			if (req.url === '/slow')
				setTimeout(() => res.writeHead(200, { connection: 'close' }).end('ok'), 2000);
			else res.end('ok');
		});
		proxy = await startServer((req, res) => {
			requestLines.push(`${req.method} ${req.url}`);
			http.get(req.url ?? '', (upstream) => upstream.pipe(res));
		});
	});

	afterAll(async () => {
		await proxy.close();
		await target.close();
	});

	beforeEach(() => {
		requestLines.length = 0;
		for (const name of PROXY_ENV_VARS) {
			vi.stubEnv(name, '');
			vi.stubEnv(name.toUpperCase(), '');
		}
	});

	afterEach(() => {
		vi.unstubAllEnvs();
	});

	const get = async (path = '/x', options?: CreateDispatcherTransportOptions) => {
		const response = await createDispatcherTransport({ proxy: 'env', ...options }).asCustomFetch()(
			`${target.url}${path}`,
		);
		return await response.text();
	};

	it('forwards a plain-HTTP request to HTTP_PROXY without CONNECT', async () => {
		vi.stubEnv('HTTP_PROXY', proxy.url);

		await expect(get()).resolves.toBe('ok');
		expect(requestLines).toEqual([`GET ${target.url}/x`]);
	});

	it('connects directly to a NO_PROXY host', async () => {
		vi.stubEnv('HTTP_PROXY', proxy.url);
		vi.stubEnv('NO_PROXY', '127.0.0.1');

		await expect(get()).resolves.toBe('ok');
		expect(requestLines).toEqual([]);
	});

	it('accepts an HTTP_PROXY without a scheme', async () => {
		vi.stubEnv('HTTP_PROXY', proxy.hostWithPort);

		await expect(get()).resolves.toBe('ok');
		expect(requestLines).toEqual([`GET ${target.url}/x`]);
	});

	it('keeps the timeouts when it forwards plain HTTP', async () => {
		vi.stubEnv('HTTP_PROXY', proxy.url);

		await expect(get('/slow', { timeouts: { headersTimeout: 100 } })).rejects.toMatchObject({
			cause: { code: 'UND_ERR_HEADERS_TIMEOUT' },
		});
	});

	it('rejects the request when the proxy URL is invalid', async () => {
		vi.stubEnv('HTTP_PROXY', 'http://[invalid');

		// The async authorizer runs first, so the error must reach the caller from inside a promise chain.
		await expect(get('/x', { authorize: async () => {} })).rejects.toThrow('fetch failed');
	});
});
