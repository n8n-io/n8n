import http from 'http';
import https from 'https';
import type { AddressInfo } from 'net';
import nock from 'nock';
import { promisify } from 'util';

import { installGlobalProxyAgent, uninstallGlobalProxyAgent } from '../http-proxy';

interface TestResponse {
	message: string;
	timestamp: number;
}

interface ProxyRequest {
	method: string;
	url: string;
	timestamp: number;
}

async function createMockProxyServer() {
	const capturedRequests: ProxyRequest[] = [];
	const server = http.createServer((req, res) => {
		capturedRequests.push({
			method: req.method ?? 'GET',
			url: req.url ?? '',
			timestamp: Date.now(),
		});

		res.setHeader('Content-Type', 'application/json');
		res.end(JSON.stringify({ message: 'proxied', timestamp: Date.now() }));
	});

	server.on('connect', (req, clientSocket) => {
		capturedRequests.push({
			method: 'CONNECT',
			url: req.url ?? '',
			timestamp: Date.now(),
		});

		clientSocket.write('HTTP/1.1 200 Connection Established\r\n\r\n');
		clientSocket.end();
	});

	await new Promise<void>((resolve, reject) => {
		server.listen(0, '127.0.0.1', resolve);
		server.on('error', reject);
	});

	const address = server.address() as AddressInfo;

	return {
		server,
		port: address.port,
		url: `http://127.0.0.1:${address.port}`,
		capturedRequests,
		clearRequests: () => (capturedRequests.length = 0),
	};
}

async function makeRequest(url: string): Promise<TestResponse> {
	return await new Promise((resolve, reject) => {
		const urlObj = new URL(url);
		const httpModule = urlObj.protocol === 'https:' ? https : http;

		const req = httpModule.get(url, { timeout: 5000 }, (res) => {
			let data = '';
			res.on('data', (chunk) => (data += chunk));
			res.on('end', () => {
				try {
					resolve(JSON.parse(data));
				} catch (error) {
					reject(error instanceof Error ? error : new Error(String(error)));
				}
			});
		});
		req.on('error', reject);
		req.on('timeout', () => {
			req.destroy();
			reject(new Error('Request timeout'));
		});
	});
}

describe('HTTP Proxy Tests', () => {
	let proxyServer: Awaited<ReturnType<typeof createMockProxyServer>>;

	beforeAll(async () => {
		proxyServer = await createMockProxyServer();
	});

	afterAll(async () => {
		await promisify(proxyServer.server.close.bind(proxyServer.server))();
	});

	beforeEach(() => {
		delete process.env.HTTP_PROXY;
		delete process.env.HTTPS_PROXY;
		delete process.env.NO_PROXY;
		delete process.env.ALL_PROXY;
		nock.cleanAll();
		nock.restore();
	});

	afterEach(() => {
		uninstallGlobalProxyAgent();
		proxyServer.clearRequests();
		nock.cleanAll();
	});

	test.each([
		{
			name: 'should use HTTP_PROXY for HTTP requests',
			env: { HTTP_PROXY: true },
			targetUrl: 'http://api.example.com:8080/test',
			expectProxied: true,
		},
		{
			name: 'should ignore HTTPS_PROXY for HTTP requests',
			env: { HTTPS_PROXY: true },
			targetUrl: 'http://api.example.com:8080/test',
			expectProxied: false,
		},
		{
			name: 'should use ALL_PROXY when specific proxy not set',
			env: { ALL_PROXY: true },
			targetUrl: 'http://api.example.com:8080/test',
			expectProxied: true,
		},
		{
			name: 'should prefer HTTP_PROXY over ALL_PROXY',
			env: { HTTP_PROXY: true, ALL_PROXY: 'http://unused:8080' },
			targetUrl: 'http://api.example.com:8080/test',
			expectProxied: true,
		},
		{
			name: 'should make direct requests when no proxy configured',
			env: {},
			targetUrl: 'http://api.example.com:8080/test',
			expectProxied: false,
		},
		{
			name: 'should bypass proxy for exact hostname match',
			env: { HTTP_PROXY: true, NO_PROXY: 'api.example.com' },
			targetUrl: 'http://api.example.com:8080/test',
			expectProxied: false,
		},
		{
			name: 'should bypass proxy for exact IP match',
			env: { HTTP_PROXY: true, NO_PROXY: '192.168.1.100' },
			targetUrl: 'http://192.168.1.100:8080/test',
			expectProxied: false,
		},
		{
			name: 'should proxy when hostname not in NO_PROXY',
			env: { HTTP_PROXY: true, NO_PROXY: 'example.com' },
			targetUrl: 'http://test.local:8080/api',
			expectProxied: true,
		},
		{
			name: 'should bypass proxy for wildcard subdomain patterns',
			env: { HTTP_PROXY: true, NO_PROXY: '*.local' },
			targetUrl: 'http://app.local:8080/api',
			expectProxied: false,
		},
		{
			name: 'should bypass proxy for nested wildcard patterns',
			env: { HTTP_PROXY: true, NO_PROXY: '*.example.com' },
			targetUrl: 'http://api.example.com:8080/data',
			expectProxied: false,
		},
		{
			name: 'should proxy when wildcard does not match',
			env: { HTTP_PROXY: true, NO_PROXY: '*.example.com' },
			targetUrl: 'http://test.local:8080/api',
			expectProxied: true,
		},
		{
			name: 'should handle multiple NO_PROXY patterns - match first',
			env: { HTTP_PROXY: true, NO_PROXY: 'localhost,*.local,example.com' },
			targetUrl: 'http://localhost:8080/test',
			expectProxied: false,
		},
		{
			name: 'should handle multiple NO_PROXY patterns - match middle',
			env: { HTTP_PROXY: true, NO_PROXY: 'localhost,*.local,example.com' },
			targetUrl: 'http://app.local:8080/api',
			expectProxied: false,
		},
		{
			name: 'should handle multiple NO_PROXY patterns - match last',
			env: { HTTP_PROXY: true, NO_PROXY: 'localhost,*.local,example.com' },
			targetUrl: 'http://example.com:8080/data',
			expectProxied: false,
		},
		{
			name: 'should proxy when none of multiple patterns match',
			env: { HTTP_PROXY: true, NO_PROXY: 'localhost,*.example.com,test.org' },
			targetUrl: 'http://app.local:8080/api',
			expectProxied: true,
		},
		{
			name: 'should respect NO_PROXY with ALL_PROXY',
			env: { ALL_PROXY: true, NO_PROXY: '*.example.com' },
			targetUrl: 'http://api.example.com:8080/test',
			expectProxied: false,
		},
		{
			name: 'should proxy when target not in NO_PROXY list',
			env: { HTTP_PROXY: true, NO_PROXY: 'localhost,*.internal' },
			targetUrl: 'http://api.example.com:8080/test',
			expectProxied: true,
		},
	])('$name', async ({ env, targetUrl, expectProxied }) => {
		if (env.HTTP_PROXY) process.env.HTTP_PROXY = proxyServer.url;
		if (env.HTTPS_PROXY) process.env.HTTPS_PROXY = proxyServer.url;
		if (env.ALL_PROXY === true) process.env.ALL_PROXY = proxyServer.url;
		if (env.ALL_PROXY && env.ALL_PROXY !== true) process.env.ALL_PROXY = env.ALL_PROXY;
		if (env.NO_PROXY) process.env.NO_PROXY = env.NO_PROXY;

		installGlobalProxyAgent();

		let scope: nock.Scope | undefined;
		if (!expectProxied) {
			scope = setupDirectRequestMock(targetUrl);
		}

		const response = await makeRequest(targetUrl);

		if (expectProxied) {
			expectProxiedResponse(response);
		} else {
			expectDirectResponse(response, scope);
		}
	});

	function setupDirectRequestMock(targetUrl: string) {
		if (!nock.isActive()) nock.activate();
		const url = new URL(targetUrl);
		return nock(`${url.protocol}//${url.host}`)
			.get(url.pathname)
			.reply(200, { message: 'direct', timestamp: Date.now() });
	}

	function expectProxiedResponse(response: TestResponse) {
		expect(response.message).toBe('proxied');
		expect(proxyServer.capturedRequests.length).toBeGreaterThan(0);
	}

	function expectDirectResponse(response: TestResponse, scope?: nock.Scope) {
		expect(response.message).toBe('direct');
		expect(proxyServer.capturedRequests).toHaveLength(0);
		expect(scope?.isDone()).toBe(true);
	}
});
