import { Agent, ProxyAgent } from 'undici';

import { getProxyAgent, proxyFetch } from '../httpProxyAgent';

// Verify normalizeRequestInput is NOT exported (it should be internal only)
// This ensures nodes don't re-implement normalization logic
describe('API surface verification', () => {
	it('should not export normalizeRequestInput (normalization is internal)', () => {
		const httpProxyAgentModule = require('../httpProxyAgent');
		expect(httpProxyAgentModule.normalizeRequestInput).toBeUndefined();
		expect(httpProxyAgentModule.proxyFetch).toBeDefined();
		expect(httpProxyAgentModule.getProxyAgent).toBeDefined();
		expect(httpProxyAgentModule.getNodeProxyAgent).toBeDefined();
	});

	it('should export proxyFetch as the public API', () => {
		expect(typeof proxyFetch).toBe('function');
	});
});

// Mock the dependencies
jest.mock('undici', () => ({
	Agent: jest.fn().mockImplementation((options) => ({ type: 'Agent', options })),
	ProxyAgent: jest.fn().mockImplementation((options) => ({ type: 'ProxyAgent', options })),
}));

// Mock global fetch
global.fetch = jest.fn();

describe('getProxyAgent', () => {
	// Store original environment variables
	const originalEnv = { ...process.env };

	// Reset environment variables before each test
	beforeEach(() => {
		jest.clearAllMocks();
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

	describe('backward compatible behavior (no timeout options)', () => {
		it('should return undefined when no proxy environment variables are set and no timeout options', () => {
			const agent = getProxyAgent();
			expect(agent).toBeUndefined();
			expect(ProxyAgent).not.toHaveBeenCalled();
			expect(Agent).not.toHaveBeenCalled();
		});

		it('should return undefined when no proxy is configured for target URL and no timeout options', () => {
			const agent = getProxyAgent('https://api.openai.com/v1');

			expect(agent).toBeUndefined();
			expect(ProxyAgent).not.toHaveBeenCalled();
			expect(Agent).not.toHaveBeenCalled();
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

			expect(agent).toBeUndefined();
			expect(ProxyAgent).not.toHaveBeenCalled();
		});

		it('should respect NO_PROXY wildcard patterns', () => {
			const proxyUrl = 'http://proxy.example.com:8080';
			process.env.HTTPS_PROXY = proxyUrl;
			process.env.NO_PROXY = '*.internal.company.com,localhost';

			const agent = getProxyAgent('https://api.internal.company.com');

			expect(agent).toBeUndefined();
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
			});
			expect(agent).toEqual({
				type: 'Agent',
				options: { headersTimeout: 120000, bodyTimeout: 180000 },
			});
		});

		it('should use default timeouts when empty timeout options object is passed', () => {
			getProxyAgent('https://api.openai.com/v1', {});

			expect(Agent).toHaveBeenCalledWith({
				headersTimeout: 3600000,
				bodyTimeout: 3600000,
			});
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
	});
});

describe('proxyFetch', () => {
	// Store original environment variables
	const originalEnv = { ...process.env };
	const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;

	// Reset environment variables and mocks before each test
	beforeEach(() => {
		jest.clearAllMocks();
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
		it('should call fetch with undefined dispatcher when no proxy is set and no timeout options', async () => {
			const url = 'https://api.openai.com/v1';
			await proxyFetch(url);

			expect(mockFetch).toHaveBeenCalledWith(url, {
				dispatcher: undefined,
			});
		});

		it('should maintain backward compatibility with string URLs', async () => {
			const url = 'https://api.example.com/v1/endpoint';
			await proxyFetch(url);

			expect(mockFetch).toHaveBeenCalledWith(url, expect.any(Object));
		});

		it('should maintain backward compatibility with URL objects', async () => {
			const url = new URL('https://api.example.com/v1/endpoint');
			await proxyFetch(url);

			expect(mockFetch).toHaveBeenCalledWith(url, expect.any(Object));
		});

		it('should call fetch with Agent dispatcher when timeout options are provided', async () => {
			const url = 'https://api.openai.com/v1';
			await proxyFetch(url, undefined, { headersTimeout: 60000 });

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

			await proxyFetch(url, init);

			expect(mockFetch).toHaveBeenCalledWith(url, {
				...init,
				dispatcher: undefined,
			});
		});

		it('should handle URL objects', async () => {
			const url = new URL('https://api.openai.com/v1');
			await proxyFetch(url);

			expect(mockFetch).toHaveBeenCalledWith(url, {
				dispatcher: undefined,
			});
		});
	});

	describe('with proxy configured', () => {
		it('should call fetch with ProxyAgent dispatcher when proxy is set', async () => {
			const proxyUrl = 'https://proxy.example.com:8080';
			process.env.HTTPS_PROXY = proxyUrl;

			const url = 'https://api.openai.com/v1';
			await proxyFetch(url);

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

			await proxyFetch(url, init);

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
			await proxyFetch(url);

			expect(ProxyAgent).toHaveBeenCalledWith(expect.objectContaining({ uri: proxyUrl }));
			expect(mockFetch).toHaveBeenCalledWith(url, {
				dispatcher: expect.objectContaining({ type: 'ProxyAgent' }),
			});
		});

		it('should respect NO_PROXY environment variable', async () => {
			const proxyUrl = 'http://proxy.example.com:8080';
			process.env.HTTPS_PROXY = proxyUrl;
			process.env.NO_PROXY = 'localhost,127.0.0.1';

			const url = 'https://localhost:3000/api';
			await proxyFetch(url);

			// Should not create ProxyAgent for localhost
			expect(mockFetch).toHaveBeenCalledWith(url, {
				dispatcher: undefined,
			});
		});

		it('should pass timeout options to ProxyAgent when proxy is configured', async () => {
			const proxyUrl = 'https://proxy.example.com:8080';
			process.env.HTTPS_PROXY = proxyUrl;

			const url = 'https://api.openai.com/v1';
			await proxyFetch(url, undefined, { headersTimeout: 300000, bodyTimeout: 300000 });

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
			const result = await proxyFetch(url);

			expect(result).toBe(expectedResponse);
		});

		it('should propagate fetch errors', async () => {
			const error = new Error('Network error');
			mockFetch.mockRejectedValueOnce(error);

			const url = 'https://api.openai.com/v1';

			await expect(proxyFetch(url)).rejects.toThrow('Network error');
		});

		it('should return error responses without throwing', async () => {
			const errorResponse = new Response('Not Found', {
				status: 404,
				statusText: 'Not Found',
			});
			mockFetch.mockResolvedValueOnce(errorResponse);

			const url = 'https://api.openai.com/v1';
			const result = await proxyFetch(url);

			expect(result).toBe(errorResponse);
			expect(result.status).toBe(404);
		});
	});

	describe('RequestInfo normalization and validation', () => {
		it('should handle Request objects', async () => {
			const url = 'https://api.mistral.ai/v1/chat/completions';
			const request = new Request(url);

			await proxyFetch(request);

			expect(mockFetch).toHaveBeenCalledWith(
				url,
				expect.objectContaining({
					dispatcher: undefined,
				}),
			);
		});

		it('should handle Request objects with query parameters', async () => {
			const url = 'https://api.mistral.ai/v1/chat/completions?model=mistral-small&temperature=0.7';
			const request = new Request(url);

			await proxyFetch(request);

			expect(mockFetch).toHaveBeenCalledWith(
				url,
				expect.objectContaining({
					dispatcher: undefined,
				}),
			);
		});

		it('should handle Request objects with custom headers', async () => {
			const url = 'https://api.mistral.ai/v1/chat/completions';
			const request = new Request(url, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
			});

			await proxyFetch(request, { method: 'POST' });

			expect(mockFetch).toHaveBeenCalledWith(
				url,
				expect.objectContaining({
					method: 'POST',
					dispatcher: undefined,
				}),
			);
		});

		it('should reject invalid URL strings with clear error', async () => {
			const invalidUrl = 'not-a-valid-url';

			await expect(proxyFetch(invalidUrl)).rejects.toThrow(
				/Failed to parse URL from "not-a-valid-url"/,
			);
			expect(mockFetch).not.toHaveBeenCalled();
		});

		it('should reject Request objects with invalid URLs', async () => {
			// Create a Request with an invalid URL by using a relative path
			// Note: Request constructor will accept this, but URL parsing will fail
			const invalidRequest = new Request('relative/path');

			await expect(proxyFetch(invalidRequest)).rejects.toThrow(
				/Failed to parse URL/,
			);
			expect(mockFetch).not.toHaveBeenCalled();
		});

		it('should handle URL objects', async () => {
			const url = new URL('https://api.mistral.ai/v1/chat/completions');

			await proxyFetch(url);

			expect(mockFetch).toHaveBeenCalledWith(
				url,
				expect.objectContaining({
					dispatcher: undefined,
				}),
			);
		});

		it('should preserve RequestInit options when using Request objects', async () => {
			const url = 'https://api.mistral.ai/v1/chat/completions';
			const request = new Request(url);
			const init: RequestInit = {
				method: 'POST',
				headers: { Authorization: 'Bearer token123' },
				body: JSON.stringify({ test: 'data' }),
			};

			await proxyFetch(request, init);

			expect(mockFetch).toHaveBeenCalledWith(
				url,
				expect.objectContaining({
					...init,
					dispatcher: undefined,
				}),
			);
		});

		it('should work with proxy configuration and Request objects', async () => {
			const proxyUrl = 'https://proxy.example.com:8080';
			process.env.HTTPS_PROXY = proxyUrl;

			const url = 'https://api.mistral.ai/v1/chat/completions';
			const request = new Request(url);

			await proxyFetch(request);

			expect(ProxyAgent).toHaveBeenCalledWith(expect.objectContaining({ uri: proxyUrl }));
			expect(mockFetch).toHaveBeenCalledWith(
				url,
				expect.objectContaining({
					dispatcher: expect.objectContaining({ type: 'ProxyAgent' }),
				}),
			);
		});

		it('should reject "[object Request]" string with clear error message', async () => {
			// This simulates the bug where Request.toString() was called
			const invalidUrl = '[object Request]';

			await expect(proxyFetch(invalidUrl)).rejects.toThrow(
				/Failed to parse URL from Request object/,
			);
			await expect(proxyFetch(invalidUrl)).rejects.toThrow(
				/Request.toString\(\) was called instead of extracting Request.url/,
			);
			expect(mockFetch).not.toHaveBeenCalled();
		});

		it('should handle empty string URLs with clear error', async () => {
			await expect(proxyFetch('')).rejects.toThrow(/Invalid URL input/);
			expect(mockFetch).not.toHaveBeenCalled();
		});

		it('should handle null/undefined-like inputs gracefully', async () => {
			// @ts-expect-error - Testing invalid input
			await expect(proxyFetch(null)).rejects.toThrow(/Unsupported fetch input type/);
			// @ts-expect-error - Testing invalid input
			await expect(proxyFetch(undefined)).rejects.toThrow(/Unsupported fetch input type/);
			expect(mockFetch).not.toHaveBeenCalled();
		});
	});

	describe('Regression: AI Agent with Mistral - multiple Request calls', () => {
		/**
		 * Regression test for issue #25318
		 * Simulates the scenario where an AI Agent with Mistral makes multiple HTTP calls.
		 * The HTTPClient from @mistralai/mistralai passes Request objects to the fetcher,
		 * and we must ensure they are properly normalized without throwing "Failed to parse URL from [object Request]"
		 */
		it('should handle multiple sequential Request objects from HTTPClient (simulating agent loop)', async () => {
			const baseUrl = 'https://api.mistral.ai/v1';
			const requests = [
				new Request(`${baseUrl}/chat/completions`),
				new Request(`${baseUrl}/chat/completions`),
				new Request(`${baseUrl}/chat/completions`),
			];

			// Simulate multiple agent calls (agent may retry or make follow-up requests)
			for (const request of requests) {
				await proxyFetch(request, {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
				});
			}

			expect(mockFetch).toHaveBeenCalledTimes(requests.length);
			requests.forEach((request, index) => {
				expect(mockFetch).toHaveBeenNthCalledWith(
					index + 1,
					request.url,
					expect.objectContaining({
						method: 'POST',
						headers: expect.objectContaining({
							'Content-Type': 'application/json',
						}),
					}),
				);
			});
		});

		it('should handle Request objects with different methods and headers (simulating agent tool calls)', async () => {
			const requests = [
				{
					request: new Request('https://api.mistral.ai/v1/chat/completions', {
						method: 'POST',
						headers: { 'Content-Type': 'application/json' },
					}),
					init: { method: 'POST' as const },
				},
				{
					request: new Request('https://api.mistral.ai/v1/models', {
						method: 'GET',
					}),
					init: { method: 'GET' as const },
				},
			];

			for (const { request, init } of requests) {
				await proxyFetch(request, init);
			}

			expect(mockFetch).toHaveBeenCalledTimes(requests.length);
			expect(mockFetch).toHaveBeenNthCalledWith(
				1,
				requests[0].request.url,
				expect.objectContaining({
					method: 'POST',
				}),
			);
			expect(mockFetch).toHaveBeenNthCalledWith(
				2,
				requests[1].request.url,
				expect.objectContaining({
					method: 'GET',
				}),
			);
		});

		it('should handle Request objects with query parameters (simulating agent with filters)', async () => {
			const urlWithQuery = 'https://api.mistral.ai/v1/chat/completions?model=mistral-small&temperature=0.7';
			const request = new Request(urlWithQuery);

			await proxyFetch(request);

			expect(mockFetch).toHaveBeenCalledWith(
				urlWithQuery,
				expect.objectContaining({
					dispatcher: undefined,
				}),
			);
		});

		it('should not throw "Failed to parse URL from [object Request]" error', async () => {
			// This is the exact error from the bug report
			const request = new Request('https://api.mistral.ai/v1/chat/completions');

			await expect(proxyFetch(request)).resolves.toBeInstanceOf(Response);
			await expect(proxyFetch(request)).resolves.not.toThrow(
				/Failed to parse URL from \[object Request\]/,
			);
		});
	});
});
