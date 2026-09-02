import { installGlobalProxyAgent } from '@n8n/backend-network';
import { uninstallGlobalProxyAgent } from '@n8n/backend-network/testing';
import dns from 'node:dns';
import { createServer, type Server } from 'node:http';
import type { AddressInfo, LookupFunction } from 'node:net';

import { createPassthroughSsrfGuard } from '../ssrf-guard';
import { fetchUrl } from '../web-fetch.utils';

const PROXY_ENV_VARS = [
	'HTTP_PROXY',
	'http_proxy',
	'HTTPS_PROXY',
	'https_proxy',
	'NO_PROXY',
	'no_proxy',
	'ALL_PROXY',
	'all_proxy',
] as const;

const listen = async (server: Server) =>
	await new Promise<number>((resolve) => {
		server.listen(0, '127.0.0.1', () => resolve((server.address() as AddressInfo).port));
	});

const close = async (server: Server) =>
	await new Promise<void>((resolve) => server.close(() => resolve()));

describe('web fetch proxy routing', () => {
	let savedProxyEnv: Record<string, string | undefined>;
	const servers: Server[] = [];

	beforeEach(() => {
		savedProxyEnv = {};
		for (const key of PROXY_ENV_VARS) {
			savedProxyEnv[key] = process.env[key];
			delete process.env[key];
		}
	});

	afterEach(async () => {
		uninstallGlobalProxyAgent();
		for (const key of PROXY_ENV_VARS) {
			if (savedProxyEnv[key] === undefined) {
				delete process.env[key];
			} else {
				process.env[key] = savedProxyEnv[key];
			}
		}
		await Promise.all(servers.splice(0).map(close));
	});

	it('should route an http fetch through HTTP_PROXY', async () => {
		const seen: Array<{ url?: string; host?: string }> = [];
		const proxy = createServer((req, res) => {
			seen.push({ url: req.url, host: req.headers.host });
			res.setHeader('Content-Type', 'text/html');
			res.end('<html><body>proxied</body></html>');
		});
		servers.push(proxy);
		process.env.HTTP_PROXY = `http://127.0.0.1:${await listen(proxy)}`;
		installGlobalProxyAgent();

		const result = await fetchUrl('http://page.host.invalid/article', createPassthroughSsrfGuard());

		expect(result.status).toBe('success');
		expect(result.body).toContain('proxied');
		expect(seen).toEqual([{ url: 'http://page.host.invalid/article', host: 'page.host.invalid' }]);
	});

	it('should send an https fetch to HTTPS_PROXY as a CONNECT to the target host', async () => {
		const connects: string[] = [];
		const proxy = createServer();
		proxy.on('connect', (req, socket) => {
			connects.push(req.url ?? '');
			socket.end('HTTP/1.1 502 Bad Gateway\r\n\r\n');
		});
		servers.push(proxy);
		process.env.HTTPS_PROXY = `http://127.0.0.1:${await listen(proxy)}`;
		installGlobalProxyAgent();

		// The proxy agent replays the rejected CONNECT's 502 as the response,
		// and fetchUrl accepts any status, so the fetch resolves with that 502.
		const result = await fetchUrl(
			'https://page.host.invalid/article',
			createPassthroughSsrfGuard(),
		);

		expect(result.httpStatus).toBe(502);
		expect(connects).toEqual(['page.host.invalid:443']);
	});

	it('should connect directly when NO_PROXY excludes the target host', async () => {
		const proxiedRequests: string[] = [];
		const proxy = createServer((req, res) => {
			proxiedRequests.push(req.url ?? '');
			res.end();
		});
		servers.push(proxy);

		const pageServer = createServer((_req, res) => {
			res.setHeader('Content-Type', 'text/html');
			res.end('<html><body>direct</body></html>');
		});
		servers.push(pageServer);

		process.env.HTTP_PROXY = `http://127.0.0.1:${await listen(proxy)}`;
		process.env.NO_PROXY = 'localhost';
		installGlobalProxyAgent();

		// The direct path must still run the guard's secure lookup: spy on it to
		// assert the per-request lookup survives the env-proxy global agent.
		const lookedUp: string[] = [];
		const secureLookup: LookupFunction = (hostname, options, onResult) => {
			lookedUp.push(hostname);
			dns.lookup(hostname, { ...options, family: 4 }, onResult);
		};
		const guard = { ...createPassthroughSsrfGuard(), createSecureLookup: () => secureLookup };

		const result = await fetchUrl(`http://localhost:${await listen(pageServer)}/article`, guard);

		expect(result.status).toBe('success');
		expect(result.body).toContain('direct');
		expect(lookedUp).toEqual(['localhost']);
		expect(proxiedRequests).toEqual([]);
	});
});
