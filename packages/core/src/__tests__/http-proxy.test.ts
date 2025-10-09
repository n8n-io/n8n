import http from 'http';
import https from 'https';
import nock from 'nock';

import {
	installGlobalProxyAgent,
	uninstallGlobalProxyAgent,
	ProxyFromEnvHttpAgent,
	ProxyFromEnvHttpsAgent,
} from '../http-proxy';

const originalEnv = process.env;

interface MockResponse {
	direct?: boolean;
	proxied?: boolean;
}

const makeRequest = async (url: string): Promise<MockResponse> => {
	const urlObj = new URL(url);
	const client = urlObj.protocol === 'https:' ? https : http;

	return await new Promise<MockResponse>((resolve, reject) => {
		const req = client.get(url, (res) => {
			let data = '';
			res.on('data', (chunk) => {
				data += chunk;
			});
			res.on('end', () => {
				try {
					resolve(JSON.parse(data) as MockResponse);
				} catch (error) {
					reject(error instanceof Error ? error : new Error(String(error)));
				}
			});
		});
		req.on('error', reject);
	});
};

beforeEach(() => {
	delete process.env.HTTP_PROXY;
	delete process.env.HTTPS_PROXY;
	delete process.env.NO_PROXY;
	delete process.env.ALL_PROXY;
	uninstallGlobalProxyAgent();
	nock.cleanAll();
});

afterEach(() => {
	process.env = originalEnv;
	nock.cleanAll();
});

describe('HTTP Proxy Tests', () => {
	test.each([
		{
			name: 'should bypass proxy for NO_PROXY domains',
			env: {
				HTTP_PROXY: 'http://proxy.example.com:8080',
				HTTPS_PROXY: 'http://proxy.example.com:8080',
				NO_PROXY: 'localhost,*.example.com',
			},
			requests: [
				{ url: 'http://localhost/test', expectProxied: false },
				{ url: 'https://api.example.com/data', expectProxied: false },
				{ url: 'http://external.com/api', expectProxied: true },
			],
		},
		{
			name: 'should respect wildcard NO_PROXY patterns',
			env: {
				HTTP_PROXY: 'http://proxy.example.com:8080',
				NO_PROXY: 'sub.internal.com,192.168.1.1',
			},
			requests: [
				{ url: 'http://sub.internal.com/test', expectProxied: false },
				{ url: 'http://192.168.1.1/test', expectProxied: false },
				{ url: 'http://external.com/test', expectProxied: true },
			],
		},
		{
			name: 'should proxy all requests when NO_PROXY is not set',
			env: {
				HTTP_PROXY: 'http://proxy.example.com:8080',
				HTTPS_PROXY: 'http://proxy.example.com:8080',
			},
			requests: [
				{ url: 'http://localhost/test', expectProxied: true },
				{ url: 'https://api.example.com/data', expectProxied: true },
				{ url: 'http://external.com/api', expectProxied: true },
			],
		},
		{
			name: 'should proxy all requests with ALL_PROXY when NO_PROXY is not set',
			env: {
				ALL_PROXY: 'http://proxy.example.com:8080',
			},
			requests: [
				{ url: 'http://localhost/test', expectProxied: true },
				{ url: 'https://api.example.com/data', expectProxied: true },
				{ url: 'http://external.com/api', expectProxied: true },
			],
		},
		{
			name: 'should work without proxy configuration',
			env: {},
			requests: [
				{ url: 'http://example.com/test', expectProxied: false },
				{ url: 'https://api.com/data', expectProxied: false },
			],
		},
	])('$name', async ({ env, requests }) => {
		Object.assign(process.env, env);
		installGlobalProxyAgent();

		// Mock direct requests only (we'll test proxy logic differently)
		for (const { url, expectProxied } of requests) {
			if (!expectProxied) {
				const urlObj = new URL(url);
				nock(`${urlObj.protocol}//${urlObj.host}`)
					.get(urlObj.pathname + urlObj.search)
					.reply(200, { direct: true });
			}
		}

		for (const { url, expectProxied } of requests) {
			const urlObj = new URL(url);
			const agent =
				urlObj.protocol === 'https:'
					? ProxyFromEnvHttpsAgent(null, {}, url)
					: ProxyFromEnvHttpAgent(null, {}, url);

			if (expectProxied) {
				expect(agent.constructor.name).toMatch(/Proxy/);
				expect(agent.constructor.name).not.toBe('Agent');
			} else {
				expect(agent.constructor.name).toBe('Agent');

				const response = await makeRequest(url);
				expect(response.direct).toBe(true);
			}
		}
	});
});
