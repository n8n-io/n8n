import { Logger } from '@n8n/backend-common';
import { Container } from '@n8n/di';
import type http from 'node:http';
import { mock } from 'vitest-mock-extended';

import { EnvProxyRouter } from '../env-proxy-router';

// `getProxyForUrl` decides per request whether a proxy applies; the proxy agent
// is a plain factory callback, so the routing logic tests without any network
// or agent machinery.
const { getProxyForUrl } = vi.hoisted(() => ({
	getProxyForUrl: vi.fn<(url: string) => string>(),
}));

vi.mock('proxy-from-env', () => ({ getProxyForUrl }));

const options = (o: Partial<http.RequestOptions>): http.RequestOptions => o as http.RequestOptions;
const createAgent = () => vi.fn((proxyUrl: string) => ({ proxyUrl }));

describe('EnvProxyRouter', () => {
	beforeEach(() => getProxyForUrl.mockReset());

	describe('proxy-resolution URL', () => {
		it.each([
			{ scheme: 'http', defaultPort: 80, opts: { host: 'h', port: 80 }, url: 'http://h' },
			{ scheme: 'http', defaultPort: 80, opts: { host: 'h' }, url: 'http://h' },
			{ scheme: 'http', defaultPort: 80, opts: { host: 'h', port: 8080 }, url: 'http://h:8080' },
			{ scheme: 'http', defaultPort: 80, opts: { host: 'h', port: '8080' }, url: 'http://h:8080' },
			{ scheme: 'http', defaultPort: 80, opts: { port: 80 }, url: 'http://localhost' },
			{ scheme: 'https', defaultPort: 443, opts: { host: 'h', port: 443 }, url: 'https://h' },
			{ scheme: 'https', defaultPort: 443, opts: { host: 'h', port: 8443 }, url: 'https://h:8443' },
			{ scheme: 'http', defaultPort: 80, opts: { host: 'h', port: 'abc' }, url: 'http://h' },
		] as const)('resolves $opts against $url', ({ scheme, defaultPort, opts, url }) => {
			getProxyForUrl.mockReturnValue('');

			new EnvProxyRouter(scheme, defaultPort, createAgent()).resolve(options(opts));

			expect(getProxyForUrl).toHaveBeenCalledWith(url);
		});
	});

	it('warns and falls back to the default port when the port is unparseable', () => {
		const logger = mock<Logger>();
		Container.set(Logger, logger);
		getProxyForUrl.mockReturnValue('');

		new EnvProxyRouter('http', 80, createAgent()).resolve(options({ host: 'h', port: 'abc' }));

		expect(getProxyForUrl).toHaveBeenCalledWith('http://h');
		expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('abc'));
	});

	it('does not warn when no port is provided', () => {
		const logger = mock<Logger>();
		Container.set(Logger, logger);
		getProxyForUrl.mockReturnValue('');

		new EnvProxyRouter('http', 80, createAgent()).resolve(options({ host: 'h' }));

		expect(logger.warn).not.toHaveBeenCalled();
	});

	it('returns undefined when no proxy applies', () => {
		getProxyForUrl.mockReturnValue('');

		expect(
			new EnvProxyRouter('http', 80, createAgent()).resolve(options({ host: 'h' })),
		).toBeUndefined();
	});

	it('creates one proxy agent per proxy URL and reuses it', () => {
		getProxyForUrl.mockReturnValue('http://proxy.internal:3128');
		const createProxyAgent = createAgent();
		const router = new EnvProxyRouter('http', 80, createProxyAgent);

		const first = router.resolve(options({ host: 'a.example' }));
		const second = router.resolve(options({ host: 'b.example' }));

		expect(createProxyAgent).toHaveBeenCalledTimes(1);
		expect(first).toBe(second);
	});

	it('warns once and stops caching when the cache cap is exceeded', () => {
		const logger = mock<Logger>();
		Container.set(Logger, logger);
		// A distinct proxy URL per request, so every call is a fresh cache entry.
		getProxyForUrl.mockImplementation((url: string) => `http://proxy-${url}:3128`);
		const createProxyAgent = createAgent();
		const router = new EnvProxyRouter('http', 80, createProxyAgent);

		// 64 entries fill the cache; the 65th and 66th exceed the cap.
		for (let i = 0; i < 66; i++) {
			router.resolve(options({ host: `h${i}.example` }));
		}

		expect(logger.warn).toHaveBeenCalledTimes(1);
		expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('reached its limit'));
	});

	it('creates a separate proxy agent per distinct proxy URL', () => {
		getProxyForUrl
			.mockReturnValueOnce('http://proxy-a:3128')
			.mockReturnValueOnce('http://proxy-b:3128');
		const createProxyAgent = createAgent();
		const router = new EnvProxyRouter('http', 80, createProxyAgent);

		const a = router.resolve(options({ host: 'a.example' }));
		const b = router.resolve(options({ host: 'b.example' }));

		expect(createProxyAgent).toHaveBeenCalledTimes(2);
		expect(a).not.toBe(b);
	});
});
