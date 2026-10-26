import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';

import { ClientOAuth2 } from '@/client-oauth2';

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

const refreshVia = async (accessTokenUri: string) =>
	await new ClientOAuth2({
		clientId: 'client-id',
		clientSecret: 'client-secret',
		accessTokenUri,
		authentication: 'header',
	})
		.createToken({ access_token: 'expired', refresh_token: 'refresh-1' })
		.refresh();

describe('token refresh proxy routing', () => {
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
		for (const key of PROXY_ENV_VARS) {
			if (savedProxyEnv[key] === undefined) {
				delete process.env[key];
			} else {
				process.env[key] = savedProxyEnv[key];
			}
		}
		await Promise.all(servers.splice(0).map(close));
	});

	it('should route an http token refresh through HTTP_PROXY', async () => {
		const seen: Array<{ url?: string; host?: string }> = [];
		const proxy = createServer((req, res) => {
			seen.push({ url: req.url, host: req.headers.host });
			res.setHeader('Content-Type', 'application/json');
			res.end(JSON.stringify({ access_token: 'proxied-access', refresh_token: 'refresh-2' }));
		});
		servers.push(proxy);
		process.env.HTTP_PROXY = `http://127.0.0.1:${await listen(proxy)}`;

		const refreshed = await refreshVia('http://token.host.invalid/oauth/token');

		expect(refreshed.accessToken).toBe('proxied-access');
		expect(seen).toEqual([
			{ url: 'http://token.host.invalid/oauth/token', host: 'token.host.invalid' },
		]);
	});

	it('should send an https token refresh to HTTPS_PROXY as a CONNECT to the token host', async () => {
		const connects: string[] = [];
		const proxy = createServer();
		proxy.on('connect', (req, socket) => {
			connects.push(req.url ?? '');
			socket.end('HTTP/1.1 502 Bad Gateway\r\n\r\n');
		});
		servers.push(proxy);
		process.env.HTTPS_PROXY = `http://127.0.0.1:${await listen(proxy)}`;

		await expect(refreshVia('https://token.host.invalid/oauth/token')).rejects.toThrow();

		expect(connects).toEqual(['token.host.invalid:443']);
	});

	it('should connect directly when NO_PROXY excludes the token host', async () => {
		const proxiedRequests: string[] = [];
		const proxy = createServer((req, res) => {
			proxiedRequests.push(req.url ?? '');
			res.end();
		});
		servers.push(proxy);

		const tokenServer = createServer((_req, res) => {
			res.setHeader('Content-Type', 'application/json');
			res.end(JSON.stringify({ access_token: 'direct-access' }));
		});
		servers.push(tokenServer);

		process.env.HTTP_PROXY = `http://127.0.0.1:${await listen(proxy)}`;
		process.env.NO_PROXY = '127.0.0.1';

		const refreshed = await refreshVia(`http://127.0.0.1:${await listen(tokenServer)}/oauth/token`);

		expect(refreshed.accessToken).toBe('direct-access');
		expect(proxiedRequests).toEqual([]);
	});
});
