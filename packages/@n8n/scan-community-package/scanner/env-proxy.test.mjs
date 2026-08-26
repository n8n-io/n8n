import axios from 'axios';
import { createServer } from 'node:http';

import { configureAxiosEnvProxy } from './env-proxy.mjs';

const PROXY_ENV_VARS = [
	'HTTP_PROXY',
	'http_proxy',
	'HTTPS_PROXY',
	'https_proxy',
	'NO_PROXY',
	'no_proxy',
	'ALL_PROXY',
	'all_proxy',
];

const listen = async (server) =>
	await new Promise((resolve) => {
		server.listen(0, '127.0.0.1', () => resolve(server.address().port));
	});

const close = async (server) =>
	await new Promise((resolve) => {
		server.closeAllConnections();
		server.close(() => resolve());
	});

describe('configureAxiosEnvProxy', () => {
	let savedProxyEnv;
	const servers = [];

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

	it('should route an http request through HTTP_PROXY', async () => {
		const seen = [];
		const proxy = createServer((req, res) => {
			seen.push({ url: req.url, host: req.headers.host });
			res.setHeader('Content-Type', 'application/json');
			res.end(JSON.stringify({ via: 'proxy' }));
		});
		servers.push(proxy);
		process.env.HTTP_PROXY = `http://127.0.0.1:${await listen(proxy)}`;

		const client = axios.create();
		configureAxiosEnvProxy(client);
		const { data } = await client.get('http://registry.host.invalid/some-package');

		expect(data).toEqual({ via: 'proxy' });
		expect(seen).toEqual([
			{ url: 'http://registry.host.invalid/some-package', host: 'registry.host.invalid' },
		]);
	});

	it('should send an https request to HTTPS_PROXY as a CONNECT to the target host', async () => {
		const connects = [];
		const proxy = createServer();
		proxy.on('connect', (req, socket) => {
			connects.push(req.url ?? '');
			socket.end('HTTP/1.1 502 Bad Gateway\r\n\r\n');
		});
		servers.push(proxy);
		process.env.HTTPS_PROXY = `http://127.0.0.1:${await listen(proxy)}`;

		const client = axios.create();
		configureAxiosEnvProxy(client);
		await expect(
			client.get('https://registry.host.invalid/some-package'),
		).rejects.toThrow();

		expect(connects).toEqual(['registry.host.invalid:443']);
	});

	it('should apply the shared default timeout, overridable per request', async () => {
		const client = axios.create();
		configureAxiosEnvProxy(client);

		expect(client.defaults.timeout).toBe(300_000);

		const registryServer = createServer((_req, res) => {
			res.setHeader('Content-Type', 'application/json');
			res.end(JSON.stringify({ via: 'direct' }));
		});
		servers.push(registryServer);
		const port = await listen(registryServer);

		const { config } = await client.get(`http://127.0.0.1:${port}/some-package`);
		expect(config.timeout).toBe(300_000);

		const { config: overridden } = await client.get(`http://127.0.0.1:${port}/some-package`, {
			timeout: 30_000,
		});
		expect(overridden.timeout).toBe(30_000);
	});

	it('should connect directly when NO_PROXY excludes the target host', async () => {
		const proxiedRequests = [];
		const proxy = createServer((req, res) => {
			proxiedRequests.push(req.url ?? '');
			res.end();
		});
		servers.push(proxy);

		const registryServer = createServer((_req, res) => {
			res.setHeader('Content-Type', 'application/json');
			res.end(JSON.stringify({ via: 'direct' }));
		});
		servers.push(registryServer);

		process.env.HTTP_PROXY = `http://127.0.0.1:${await listen(proxy)}`;
		process.env.NO_PROXY = '127.0.0.1';

		const client = axios.create();
		configureAxiosEnvProxy(client);
		const { data } = await client.get(
			`http://127.0.0.1:${await listen(registryServer)}/some-package`,
		);

		expect(data).toEqual({ via: 'direct' });
		expect(proxiedRequests).toEqual([]);
	});
});
