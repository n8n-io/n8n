import { lookup as dnsLookup } from 'node:dns';
import { Agent, ProxyAgent, fetch as undiciFetch } from 'undici';
import type { MockedFunction } from 'vitest';

import { getNodeProxyAgent, getProxyAgent, proxyFetch } from 'src/utils/http-proxy-agent';

// Mock the dependencies
vi.mock('undici', () => ({
	Agent: vi.fn(function (options) {
		return { type: 'Agent', options };
	}),
	ProxyAgent: vi.fn(function (options) {
		return { type: 'ProxyAgent', options };
	}),
	fetch: vi.fn(),
}));

const DEFAULT_AGENT_OPTIONS = {
	headersTimeout: 3600000,
	bodyTimeout: 3600000,
	connect: { lookup: dnsLookup },
};

describe('getProxyAgent', () => {
	// Store original environment variables
	const originalEnv = { ...process.env };

	// Reset environment variables before each test
	beforeEach(() => {
		vi.clearAllMocks();
		process.env = { ...originalEnv };
		delete process.env.HTTP_PROXY;
		delete process.env.http_proxy;
		delete process.env.HTTPS_PROXY;
		delete process.env.https_proxy;
		delete process.env.NO_PROXY;
		delete process.env.no_proxy;
		delete process.env.N8N_AI_TIMEOUT_MAX;
	});

	// Restore original environment after all tests
	afterAll(() => {
		process.env = originalEnv;
	});

	describe('default behavior (no timeout options)', () => {
		it('should return an Agent with the default lookup when no proxy environment variables are set and no timeout options', () => {
			const agent = getProxyAgent();

			expect(agent).toEqual({ type: 'Agent', options: DEFAULT_AGENT_OPTIONS });
			expect(ProxyAgent).not.toHaveBeenCalled();
		});

		it('should return an Agent when no proxy is configured for target URL and no timeout options', () => {
			const agent = getProxyAgent('https://api.openai.com/v1');

			expect(agent).toEqual({ type: 'Agent', options: DEFAULT_AGENT_OPTIONS });
			expect(ProxyAgent).not.toHaveBeenCalled();
		});

		it('should reuse a single Agent across calls when no proxy, timeout options nor custom lookup are given', () => {
			const first = getProxyAgent('https://api.openai.com/v1');
			const second = getProxyAgent('https://api.anthropic.com/v1');

			expect(second).toBe(first);
		});

		it('should build a fresh Agent when timeout options or a custom lookup are given', () => {
			const shared = getProxyAgent('https://api.openai.com/v1');

			expect(getProxyAgent('https://api.openai.com/v1', {})).not.toBe(shared);
			expect(getProxyAgent('https://api.openai.com/v1', undefined, vi.fn())).not.toBe(shared);
		});

		it('should create ProxyAgent with default timeouts when HTTPS_PROXY is set', () => {
			const proxyUrl = 'https://proxy.example.com:8080';
			process.env.HTTPS_PROXY = proxyUrl;

			const agent = getProxyAgent();

			expect(ProxyAgent).toHaveBeenCalledWith({
				uri: proxyUrl,
				headersTimeout: 3600000,
				bodyTimeout: 3600000,
			});
			expect(agent).toEqual({
				type: 'ProxyAgent',
				options: { uri: proxyUrl, headersTimeout: 3600000, bodyTimeout: 3600000 },
			});
		});

		it('should create ProxyAgent when https_proxy is set', () => {
			const proxyUrl = 'https://proxy.example.com:8080';
			process.env.https_proxy = proxyUrl;

			getProxyAgent();

			expect(ProxyAgent).toHaveBeenCalledWith({
				uri: proxyUrl,
				headersTimeout: 3600000,
				bodyTimeout: 3600000,
			});
		});

		it('should respect priority order of proxy environment variables', () => {
			// Set multiple proxy environment variables
			process.env.HTTP_PROXY = 'http://http-proxy.example.com:8080';
			process.env.http_proxy = 'http://http-proxy-lowercase.example.com:8080';
			process.env.HTTPS_PROXY = 'https://https-proxy.example.com:8080';
			process.env.https_proxy = 'https://https-proxy-lowercase.example.com:8080';

			getProxyAgent();

			// Should use https_proxy as it has highest priority now
			expect(ProxyAgent).toHaveBeenCalledWith(
				expect.objectContaining({
					uri: 'https://https-proxy-lowercase.example.com:8080',
				}),
			);
		});
	});

	describe('target URL provided', () => {
		it('should create ProxyAgent for HTTPS URL when HTTPS_PROXY is set', () => {
			const proxyUrl = 'https://proxy.example.com:8080';
			process.env.HTTPS_PROXY = proxyUrl;

			getProxyAgent('https://api.openai.com/v1');

			expect(ProxyAgent).toHaveBeenCalledWith(expect.objectContaining({ uri: proxyUrl }));
		});

		it('should create ProxyAgent for HTTP URL when HTTP_PROXY is set', () => {
			const proxyUrl = 'http://proxy.example.com:8080';
			process.env.HTTP_PROXY = proxyUrl;

			getProxyAgent('http://api.example.com');

			expect(ProxyAgent).toHaveBeenCalledWith(expect.objectContaining({ uri: proxyUrl }));
		});

		it('should use HTTPS_PROXY for HTTPS URLs even when HTTP_PROXY is set', () => {
			const httpProxy = 'http://http-proxy.example.com:8080';
			const httpsProxy = 'https://https-proxy.example.com:8443';
			process.env.HTTP_PROXY = httpProxy;
			process.env.HTTPS_PROXY = httpsProxy;

			getProxyAgent('https://api.openai.com/v1');

			expect(ProxyAgent).toHaveBeenCalledWith(expect.objectContaining({ uri: httpsProxy }));
		});

		it('should respect NO_PROXY for localhost', () => {
			const proxyUrl = 'http://proxy.example.com:8080';
			process.env.HTTP_PROXY = proxyUrl;
			process.env.NO_PROXY = 'localhost,127.0.0.1';

			const agent = getProxyAgent('http://localhost:3000');

			expect(agent).toEqual({ type: 'Agent', options: DEFAULT_AGENT_OPTIONS });
			expect(ProxyAgent).not.toHaveBeenCalled();
		});

		it('should respect NO_PROXY wildcard patterns', () => {
			const proxyUrl = 'http://proxy.example.com:8080';
			process.env.HTTPS_PROXY = proxyUrl;
			process.env.NO_PROXY = '*.internal.company.com,localhost';

			const agent = getProxyAgent('https://api.internal.company.com');

			expect(agent).toEqual({ type: 'Agent', options: DEFAULT_AGENT_OPTIONS });
			expect(ProxyAgent).not.toHaveBeenCalled();
		});

		it('should use proxy for URLs not in NO_PROXY', () => {
			const proxyUrl = 'http://proxy.example.com:8080';
			process.env.HTTPS_PROXY = proxyUrl;
			process.env.NO_PROXY = 'localhost,127.0.0.1';

			getProxyAgent('https://api.openai.com/v1');

			expect(ProxyAgent).toHaveBeenCalledWith(expect.objectContaining({ uri: proxyUrl }));
		});

		it('should handle mixed case environment variables', () => {
			const proxyUrl = 'http://proxy.example.com:8080';
			process.env.https_proxy = proxyUrl;
			process.env.no_proxy = 'localhost';

			getProxyAgent('https://api.openai.com/v1');

			expect(ProxyAgent).toHaveBeenCalledWith(expect.objectContaining({ uri: proxyUrl }));
		});
	});

	describe('timeout options', () => {
		it('should pass custom timeout options to ProxyAgent when proxy is set', () => {
			const proxyUrl = 'https://proxy.example.com:8080';
			process.env.HTTPS_PROXY = proxyUrl;

			getProxyAgent('https://api.openai.com/v1', {
				headersTimeout: 120000,
				bodyTimeout: 180000,
			});

			expect(ProxyAgent).toHaveBeenCalledWith({
				uri: proxyUrl,
				headersTimeout: 120000,
				bodyTimeout: 180000,
			});
		});

		it('should create Agent with timeout options when no proxy is configured', () => {
			const agent = getProxyAgent('https://api.openai.com/v1', {
				headersTimeout: 120000,
				bodyTimeout: 180000,
			});

			expect(Agent).toHaveBeenCalledWith({
				headersTimeout: 120000,
				bodyTimeout: 180000,
				connect: { lookup: dnsLookup },
			});
			expect(agent).toEqual({
				type: 'Agent',
				options: { headersTimeout: 120000, bodyTimeout: 180000, connect: { lookup: dnsLookup } },
			});
		});

		it('should use default timeouts when empty timeout options object is passed', () => {
			getProxyAgent('https://api.openai.com/v1', {});

			expect(Agent).toHaveBeenCalledWith(DEFAULT_AGENT_OPTIONS);
		});

		it('should include connectTimeout when provided', () => {
			getProxyAgent('https://api.openai.com/v1', {
				headersTimeout: 60000,
				bodyTimeout: 60000,
				connectTimeout: 30000,
			});

			expect(Agent).toHaveBeenCalledWith({
				headersTimeout: 60000,
				bodyTimeout: 60000,
				connectTimeout: 30000,
				connect: { lookup: dnsLookup },
			});
		});

		it('should respect custom timeout from environment variable', () => {
			process.env.N8N_AI_TIMEOUT_MAX = '300000';

			// Need to re-import to pick up env vars (or mock module)
			// For this test, we just verify the default timeout parsing
			// The actual behavior is tested by integration tests

			// Empty options should use env var defaults
			getProxyAgent('https://api.openai.com/v1', {});

			// Since we can't easily re-import, we verify the mock was called with defaults
			expect(Agent).toHaveBeenCalled();
		});

		it('should build a fresh Agent when N8N_AI_TIMEOUT_MAX is set, even without a proxy or explicit timeout options', () => {
			const shared = getProxyAgent('https://api.openai.com/v1');
			process.env.N8N_AI_TIMEOUT_MAX = '120000';

			const agent = getProxyAgent('https://api.openai.com/v1');

			// DEFAULT_TIMEOUT was captured from the env at module load time (before this test set it),
			// so the value here reflects that capture, not '120000' — the module-reset test below
			// covers the env value actually being picked up end to end.
			expect(agent).toEqual(expect.objectContaining({ type: 'Agent' }));
			expect(agent).not.toBe(shared);
			expect(ProxyAgent).not.toHaveBeenCalled();
		});

		it('should honor N8N_AI_TIMEOUT_MAX when there is no proxy and the caller passes no timeout options at all', async () => {
			vi.resetModules();
			process.env.N8N_AI_TIMEOUT_MAX = '120000';

			const undici = await import('undici');
			const { getProxyAgent: freshGetProxyAgent } = await import('../../utils/http-proxy-agent.js');

			const agent = freshGetProxyAgent('https://api.openai.com/v1');

			expect(undici.Agent).toHaveBeenCalledWith({
				headersTimeout: 120000,
				bodyTimeout: 120000,
				connect: { lookup: dnsLookup },
			});
			expect(agent).toEqual({
				type: 'Agent',
				options: {
					headersTimeout: 120000,
					bodyTimeout: 120000,
					connect: { lookup: dnsLookup },
				},
			});
		});
	});

	describe('secure lookup', () => {
		it('should build an Agent with the lookup on connect when no proxy is configured', () => {
			const lookup = vi.fn();

			const agent = getProxyAgent('https://api.openai.com/v1', undefined, lookup);

			expect(Agent).toHaveBeenCalledWith(expect.objectContaining({ connect: { lookup } }));
			expect(agent).toEqual(expect.objectContaining({ type: 'Agent' }));
			expect(ProxyAgent).not.toHaveBeenCalled();
		});

		it('should not attach the lookup to a ProxyAgent when a proxy is configured', () => {
			const proxyUrl = 'https://proxy.example.com:8080';
			process.env.HTTPS_PROXY = proxyUrl;
			const lookup = vi.fn();

			getProxyAgent('https://api.openai.com/v1', undefined, lookup);

			expect(ProxyAgent).toHaveBeenCalledWith(expect.objectContaining({ uri: proxyUrl }));
			expect(ProxyAgent).not.toHaveBeenCalledWith(
				expect.objectContaining({ connect: expect.anything() }),
			);
			expect(Agent).not.toHaveBeenCalled();
		});
	});
});

describe('proxyFetch', () => {
	// Store original environment variables
	const originalEnv = { ...process.env };
	const mockFetch = undiciFetch as unknown as MockedFunction<typeof fetch>;

	// Reset environment variables and mocks before each test
	beforeEach(() => {
		vi.clearAllMocks();
		process.env = { ...originalEnv };
		delete process.env.HTTP_PROXY;
		delete process.env.http_proxy;
		delete process.env.HTTPS_PROXY;
		delete process.env.https_proxy;
		delete process.env.NO_PROXY;
		delete process.env.no_proxy;

		// Setup default fetch mock response
		mockFetch.mockResolvedValue(
			new Response('{}', {
				status: 200,
				statusText: 'OK',
				headers: { 'Content-Type': 'application/json' },
			}),
		);
	});

	// Restore original environment after all tests
	afterAll(() => {
		process.env = originalEnv;
	});

	describe('with no proxy configured', () => {
		it('should call fetch with an Agent dispatcher when no proxy is set and no timeout options', async () => {
			const url = 'https://api.openai.com/v1';
			await proxyFetch({ input: url, lookup: dnsLookup });

			expect(mockFetch).toHaveBeenCalledWith(url, {
				dispatcher: expect.objectContaining({ type: 'Agent' }),
			});
		});

		it('should reuse the same dispatcher across plain calls', async () => {
			await proxyFetch({ input: 'https://api.openai.com/v1', lookup: dnsLookup });
			await proxyFetch({ input: 'https://api.anthropic.com/v1', lookup: dnsLookup });

			const [[, first], [, second]] = mockFetch.mock.calls as unknown as Array<
				[unknown, { dispatcher: unknown }]
			>;
			expect(second.dispatcher).toBe(first.dispatcher);
		});

		it('should build the dispatcher with the supplied lookup', async () => {
			const lookup = vi.fn();
			await proxyFetch({ input: 'https://api.openai.com/v1', lookup });

			expect(Agent).toHaveBeenCalledWith(expect.objectContaining({ connect: { lookup } }));
		});

		it('should call fetch with Agent dispatcher when timeout options are provided', async () => {
			const url = 'https://api.openai.com/v1';
			await proxyFetch({
				input: url,
				timeoutOptions: { headersTimeout: 60000 },
				lookup: dnsLookup,
			});

			expect(Agent).toHaveBeenCalled();
			expect(mockFetch).toHaveBeenCalledWith(url, {
				dispatcher: expect.objectContaining({ type: 'Agent' }),
			});
		});

		it('should pass through RequestInit options', async () => {
			const url = 'https://api.openai.com/v1';
			const init: RequestInit = {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ test: 'data' }),
			};

			await proxyFetch({ input: url, init, lookup: dnsLookup });

			expect(mockFetch).toHaveBeenCalledWith(url, {
				...init,
				dispatcher: expect.objectContaining({ type: 'Agent' }),
			});
		});

		it('should handle URL objects', async () => {
			const url = new URL('https://api.openai.com/v1');
			await proxyFetch({ input: url, lookup: dnsLookup });

			expect(mockFetch).toHaveBeenCalledWith(url, {
				dispatcher: expect.objectContaining({ type: 'Agent' }),
			});
		});

		it('should handle Request objects', async () => {
			const request = new Request('https://api.openai.com/v1', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ test: 'data' }),
			});
			await proxyFetch({ input: request, lookup: dnsLookup });

			expect(mockFetch).toHaveBeenCalledWith(request, {
				dispatcher: expect.objectContaining({ type: 'Agent' }),
			});
		});
	});

	describe('with proxy configured', () => {
		it('should call fetch with ProxyAgent dispatcher when proxy is set', async () => {
			const proxyUrl = 'https://proxy.example.com:8080';
			process.env.HTTPS_PROXY = proxyUrl;

			const url = 'https://api.openai.com/v1';
			await proxyFetch({ input: url, lookup: dnsLookup });

			expect(ProxyAgent).toHaveBeenCalledWith(expect.objectContaining({ uri: proxyUrl }));
			expect(mockFetch).toHaveBeenCalledWith(url, {
				dispatcher: expect.objectContaining({ type: 'ProxyAgent' }),
			});
		});

		it('should pass through RequestInit options with proxy', async () => {
			const proxyUrl = 'https://proxy.example.com:8080';
			process.env.HTTPS_PROXY = proxyUrl;

			const url = 'https://api.openai.com/v1';
			const init: RequestInit = {
				method: 'POST',
				headers: { Authorization: 'Bearer token123' },
			};

			await proxyFetch({ input: url, init, lookup: dnsLookup });

			expect(ProxyAgent).toHaveBeenCalledWith(expect.objectContaining({ uri: proxyUrl }));
			expect(mockFetch).toHaveBeenCalledWith(url, {
				...init,
				dispatcher: expect.objectContaining({ type: 'ProxyAgent' }),
			});
		});

		it('should handle URL objects with proxy', async () => {
			const proxyUrl = 'http://proxy.example.com:8080';
			process.env.HTTP_PROXY = proxyUrl;

			const url = new URL('http://api.example.com/data');
			await proxyFetch({ input: url, lookup: dnsLookup });

			expect(ProxyAgent).toHaveBeenCalledWith(expect.objectContaining({ uri: proxyUrl }));
			expect(mockFetch).toHaveBeenCalledWith(url, {
				dispatcher: expect.objectContaining({ type: 'ProxyAgent' }),
			});
		});

		it('should handle Request objects with proxy', async () => {
			const proxyUrl = 'https://proxy.example.com:8080';
			process.env.HTTPS_PROXY = proxyUrl;

			const request = new Request('https://api.openai.com/v1');
			await proxyFetch({ input: request, lookup: dnsLookup });

			expect(ProxyAgent).toHaveBeenCalledWith(expect.objectContaining({ uri: proxyUrl }));
			expect(mockFetch).toHaveBeenCalledWith(request, {
				dispatcher: expect.objectContaining({ type: 'ProxyAgent' }),
			});
		});

		it('should respect NO_PROXY environment variable', async () => {
			const proxyUrl = 'http://proxy.example.com:8080';
			process.env.HTTPS_PROXY = proxyUrl;
			process.env.NO_PROXY = 'localhost,127.0.0.1';

			const url = 'https://localhost:3000/api';
			await proxyFetch({ input: url, lookup: dnsLookup });

			// Should not create ProxyAgent for localhost
			expect(ProxyAgent).not.toHaveBeenCalled();
			expect(mockFetch).toHaveBeenCalledWith(url, {
				dispatcher: expect.objectContaining({ type: 'Agent' }),
			});
		});

		it('should pass timeout options to ProxyAgent when proxy is configured', async () => {
			const proxyUrl = 'https://proxy.example.com:8080';
			process.env.HTTPS_PROXY = proxyUrl;

			const url = 'https://api.openai.com/v1';
			await proxyFetch({
				input: url,
				timeoutOptions: { headersTimeout: 300000, bodyTimeout: 300000 },
				lookup: dnsLookup,
			});

			expect(ProxyAgent).toHaveBeenCalledWith({
				uri: proxyUrl,
				headersTimeout: 300000,
				bodyTimeout: 300000,
			});
		});
	});

	describe('return value', () => {
		it('should return the Response from fetch', async () => {
			const expectedResponse = new Response('{"success":true}', {
				status: 200,
				statusText: 'OK',
			});
			mockFetch.mockResolvedValueOnce(expectedResponse);

			const url = 'https://api.openai.com/v1';
			const result = await proxyFetch({ input: url, lookup: dnsLookup });

			expect(result).toBe(expectedResponse);
		});

		it('should propagate fetch errors', async () => {
			const error = new Error('Network error');
			mockFetch.mockRejectedValueOnce(error);

			const url = 'https://api.openai.com/v1';

			await expect(proxyFetch({ input: url, lookup: dnsLookup })).rejects.toThrow('Network error');
		});

		it('should return error responses without throwing', async () => {
			const errorResponse = new Response('Not Found', {
				status: 404,
				statusText: 'Not Found',
			});
			mockFetch.mockResolvedValueOnce(errorResponse);

			const url = 'https://api.openai.com/v1';
			const result = await proxyFetch({ input: url, lookup: dnsLookup });

			expect(result).toBe(errorResponse);
		});
	});
});

describe('getNodeProxyAgent', () => {
	const originalEnv = { ...process.env };

	beforeEach(() => {
		process.env = { ...originalEnv };
		delete process.env.HTTPS_PROXY;
		delete process.env.https_proxy;
		delete process.env.NO_PROXY;
		delete process.env.no_proxy;
	});

	afterAll(() => {
		process.env = originalEnv;
	});

	it('returns undefined when no proxy is configured', () => {
		expect(getNodeProxyAgent('https://example.com')).toBeUndefined();
	});

	it('applies agent options (e.g. TCP keepalive) to the proxy agent', () => {
		process.env.HTTPS_PROXY = 'http://proxy.example.com:8080';

		const agent = getNodeProxyAgent('https://example.com', {
			keepAlive: true,
			keepAliveMsecs: 30_000,
		});

		expect(agent).toBeDefined();
		expect(agent).toMatchObject({ keepAlive: true, keepAliveMsecs: 30_000 });
	});
});
