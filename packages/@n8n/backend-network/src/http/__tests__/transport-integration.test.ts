import type { AxiosRequestConfig } from 'axios';
import axios from 'axios';
import dns from 'node:dns';
import http from 'node:http';
import type { LookupFunction } from 'node:net';

import { makeSsrfBridge } from '../../ssrf/__tests__/mock-ssrf-bridge';
import { getBeforeRedirectFn, setAxiosAgents } from '../axios/utils';
import { type LocalServer, startServer } from '../local-server';
import { buildNodeAgents } from '../node-agents';

// End-to-end parity tests for the outbound transport layer. These spin up real
// local HTTP servers (a target and a proxy) and drive requests through the
// agents produced by `buildNodeAgents` / `setAxiosAgents` — exactly the way
// axios uses them — so they assert observable routing behaviour rather than
// implementation details.

async function httpGetWithAgent(url: string, agent: http.Agent): Promise<string> {
	return await new Promise((resolve, reject) => {
		const req = http.get(url, { agent, timeout: 5000 }, (res) => {
			let data = '';
			res.on('data', (chunk) => (data += chunk));
			res.on('end', () => resolve(data));
		});
		req.on('error', reject);
		req.on('timeout', () => {
			req.destroy();
			reject(new Error('timeout'));
		});
	});
}

describe('outbound transport integration', () => {
	let target: LocalServer;
	let proxy: LocalServer;
	const ORIGINAL_ENV = { ...process.env };

	beforeAll(async () => {
		target = await startServer((req, res) => {
			if (req.url === '/redirect') {
				res.writeHead(301, { Location: `${target.url}/final` });
				res.end();
				return;
			}
			const message = req.url === '/final' ? 'final' : 'direct';
			res.setHeader('Content-Type', 'application/json');
			res.end(JSON.stringify({ message }));
		});
		proxy = await startServer((_req, res) => {
			res.setHeader('Content-Type', 'application/json');
			res.end(JSON.stringify({ message: 'proxied' }));
		});
	});

	afterAll(async () => {
		await target.close();
		await proxy.close();
	});

	beforeEach(() => {
		delete process.env.HTTP_PROXY;
		delete process.env.HTTPS_PROXY;
		delete process.env.NO_PROXY;
		delete process.env.ALL_PROXY;
		target.clear();
		proxy.clear();
	});

	afterEach(() => {
		process.env = { ...ORIGINAL_ENV };
	});

	describe('setAxiosAgents routing', () => {
		it('routes through an explicit custom proxy', async () => {
			const config: AxiosRequestConfig = { url: `${target.url}/x`, method: 'GET', proxy: false };
			setAxiosAgents(config, undefined, proxy.url);

			const res = await axios(config);

			expect(res.data.message).toBe('proxied');
			expect(proxy.captured.length).toBeGreaterThan(0);
			expect(target.captured).toHaveLength(0);
		});

		it('routes through the env proxy (HTTP_PROXY)', async () => {
			process.env.HTTP_PROXY = proxy.url;
			const config: AxiosRequestConfig = {
				url: 'http://proxied-target.invalid/x',
				method: 'GET',
				proxy: false,
			};
			setAxiosAgents(config, undefined, undefined);

			const res = await axios(config);

			expect(res.data.message).toBe('proxied');
			expect(proxy.captured.length).toBeGreaterThan(0);
		});

		it('connects directly when no proxy is configured', async () => {
			const config: AxiosRequestConfig = { url: `${target.url}/x`, method: 'GET', proxy: false };
			setAxiosAgents(config, undefined, undefined);

			const res = await axios(config);

			expect(res.data.message).toBe('direct');
			expect(proxy.captured).toHaveLength(0);
		});

		it('bypasses the env proxy for NO_PROXY targets', async () => {
			process.env.HTTP_PROXY = proxy.url;
			process.env.NO_PROXY = '127.0.0.1';
			const config: AxiosRequestConfig = { url: `${target.url}/x`, method: 'GET', proxy: false };
			setAxiosAgents(config, undefined, undefined);

			const res = await axios(config);

			expect(res.data.message).toBe('direct');
			expect(proxy.captured).toHaveLength(0);
		});
	});

	describe('SSRF secure lookup is applied to direct connections only', () => {
		it('invokes the secure lookup for a direct (hostname) connection', async () => {
			const lookupSpy = vi.fn((hostname: string, options: dns.LookupOptions, onResult: unknown) =>
				dns.lookup(hostname, options, onResult as never),
			);
			const bridge = makeSsrfBridge({
				createSecureLookup: () => lookupSpy as unknown as LookupFunction,
			});

			const config: AxiosRequestConfig = {
				url: `http://localhost:${target.hostWithPort.split(':')[1]}/x`,
				method: 'GET',
				proxy: false,
			};
			setAxiosAgents(config, undefined, undefined, bridge);

			const res = await axios(config);

			expect(res.data.message).toBe('direct');
			expect(lookupSpy).toHaveBeenCalledWith('localhost', expect.anything(), expect.anything());
		});

		it('does NOT invoke the secure lookup when routed through a proxy', async () => {
			process.env.HTTP_PROXY = proxy.url;
			const lookupSpy = vi.fn((hostname: string, options: dns.LookupOptions, onResult: unknown) =>
				dns.lookup(hostname, options, onResult as never),
			);
			const bridge = makeSsrfBridge({
				createSecureLookup: () => lookupSpy as unknown as LookupFunction,
			});

			const config: AxiosRequestConfig = {
				url: 'http://proxied-target.invalid/x',
				method: 'GET',
				proxy: false,
			};
			setAxiosAgents(config, undefined, undefined, bridge);

			const res = await axios(config);

			expect(res.data.message).toBe('proxied');
			// The proxy host is an IP (no lookup) and the proxy resolves the final
			// target, so the secure lookup is never consulted on our side.
			expect(lookupSpy).not.toHaveBeenCalled();
		});
	});

	describe('env-proxy agent caching', () => {
		it('reuses a single cached proxy agent for the same proxy URL', async () => {
			process.env.HTTP_PROXY = proxy.url;
			const { httpAgent } = buildNodeAgents('env', 'disabled');

			await httpGetWithAgent('http://host-a.invalid/x', httpAgent);
			await httpGetWithAgent('http://host-b.invalid/x', httpAgent);

			const proxyCache = (httpAgent as unknown as { router: { proxyCache: Map<string, unknown> } })
				.router.proxyCache;
			expect(proxyCache.size).toBe(1);
			expect(proxy.captured.length).toBeGreaterThanOrEqual(2);
		});
	});

	describe('getBeforeRedirectFn', () => {
		it('rebuilds working agents and follows a redirect to completion', async () => {
			const config: AxiosRequestConfig = {
				url: `${target.url}/redirect`,
				method: 'GET',
				proxy: false,
				maxRedirects: 5,
			};
			config.beforeRedirect = getBeforeRedirectFn({}, config, undefined, true);
			setAxiosAgents(config, {}, undefined);

			const res = await axios(config);

			expect(res.data.message).toBe('final');
		});
	});
});
