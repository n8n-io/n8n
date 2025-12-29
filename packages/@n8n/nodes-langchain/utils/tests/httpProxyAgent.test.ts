import { ProxyAgent } from 'undici';

import { getProxyAgent, proxyFetch } from '../httpProxyAgent';

// Mock the dependencies
jest.mock('undici', () => ({
	ProxyAgent: jest.fn().mockImplementation((url: string) => ({ proxyUrl: url })),
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
	});

	// Restore original environment after all tests
	afterAll(() => {
		process.env = originalEnv;
	});

	describe('target URL not provided', () => {
		it('should return undefined when no proxy environment variables are set', () => {
			const agent = getProxyAgent();
			expect(agent).toBeUndefined();
			expect(ProxyAgent).not.toHaveBeenCalled();
		});

		it('should create ProxyAgent when HTTPS_PROXY is set', () => {
			const proxyUrl = 'https://proxy.example.com:8080';
			process.env.HTTPS_PROXY = proxyUrl;

			const agent = getProxyAgent();

			expect(agent).toEqual({ proxyUrl });
			expect(ProxyAgent).toHaveBeenCalledWith(proxyUrl);
		});

		it('should create ProxyAgent when https_proxy is set', () => {
			const proxyUrl = 'https://proxy.example.com:8080';
			process.env.https_proxy = proxyUrl;

			const agent = getProxyAgent();

			expect(ProxyAgent).toHaveBeenCalledWith(proxyUrl);
			expect(agent).toEqual({ proxyUrl });
		});

		it('should respect priority order of proxy environment variables', () => {
			// Set multiple proxy environment variables
			process.env.HTTP_PROXY = 'http://http-proxy.example.com:8080';
			process.env.http_proxy = 'http://http-proxy-lowercase.example.com:8080';
			process.env.HTTPS_PROXY = 'https://https-proxy.example.com:8080';
			process.env.https_proxy = 'https://https-proxy-lowercase.example.com:8080';

			const agent = getProxyAgent();

			// Should use https_proxy as it has highest priority now
			expect(ProxyAgent).toHaveBeenCalledWith('https://https-proxy-lowercase.example.com:8080');
			expect(agent).toEqual({ proxyUrl: 'https://https-proxy-lowercase.example.com:8080' });
		});
	});

	describe('target URL provided', () => {
		it('should return undefined when no proxy is configured', () => {
			const agent = getProxyAgent('https://api.openai.com/v1');

			expect(agent).toBeUndefined();
			expect(ProxyAgent).not.toHaveBeenCalled();
		});

		it('should create ProxyAgent for HTTPS URL when HTTPS_PROXY is set', () => {
			const proxyUrl = 'https://proxy.example.com:8080';
			process.env.HTTPS_PROXY = proxyUrl;

			const agent = getProxyAgent('https://api.openai.com/v1');

			expect(agent).toEqual({ proxyUrl });
			expect(ProxyAgent).toHaveBeenCalledWith(proxyUrl);
		});

		it('should create ProxyAgent for HTTP URL when HTTP_PROXY is set', () => {
			const proxyUrl = 'http://proxy.example.com:8080';
			process.env.HTTP_PROXY = proxyUrl;

			const agent = getProxyAgent('http://api.example.com');

			expect(agent).toEqual({ proxyUrl });
			expect(ProxyAgent).toHaveBeenCalledWith(proxyUrl);
		});

		it('should use HTTPS_PROXY for HTTPS URLs even when HTTP_PROXY is set', () => {
			const httpProxy = 'http://http-proxy.example.com:8080';
			const httpsProxy = 'https://https-proxy.example.com:8443';
			process.env.HTTP_PROXY = httpProxy;
			process.env.HTTPS_PROXY = httpsProxy;

			const agent = getProxyAgent('https://api.openai.com/v1');

			expect(agent).toEqual({ proxyUrl: httpsProxy });
			expect(ProxyAgent).toHaveBeenCalledWith(httpsProxy);
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

			const agent = getProxyAgent('https://api.openai.com/v1');

			expect(agent).toEqual({ proxyUrl });
			expect(ProxyAgent).toHaveBeenCalledWith(proxyUrl);
		});

		it('should handle mixed case environment variables', () => {
			const proxyUrl = 'http://proxy.example.com:8080';
			process.env.https_proxy = proxyUrl;
			process.env.no_proxy = 'localhost';

			const agent = getProxyAgent('https://api.openai.com/v1');

			expect(agent).toEqual({ proxyUrl });
			expect(ProxyAgent).toHaveBeenCalledWith(proxyUrl);
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
		it('should call fetch with undefined dispatcher when no proxy is set', async () => {
			const url = 'https://api.openai.com/v1';
			await proxyFetch(url);

			expect(mockFetch).toHaveBeenCalledWith(url, {
				dispatcher: undefined,
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

			expect(ProxyAgent).toHaveBeenCalledWith(proxyUrl);
			expect(mockFetch).toHaveBeenCalledWith(url, {
				dispatcher: { proxyUrl },
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

			expect(ProxyAgent).toHaveBeenCalledWith(proxyUrl);
			expect(mockFetch).toHaveBeenCalledWith(url, {
				...init,
				dispatcher: { proxyUrl },
			});
		});

		it('should handle URL objects with proxy', async () => {
			const proxyUrl = 'http://proxy.example.com:8080';
			process.env.HTTP_PROXY = proxyUrl;

			const url = new URL('http://api.example.com/data');
			await proxyFetch(url);

			expect(ProxyAgent).toHaveBeenCalledWith(proxyUrl);
			expect(mockFetch).toHaveBeenCalledWith(url, {
				dispatcher: { proxyUrl },
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
});
