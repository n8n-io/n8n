import { passthroughEgressFilter } from '@n8n/backend-network/egress';
import { buildDispatcher, dispatchedFetch } from '@n8n/backend-network/transport';
import { lookup as dnsLookup } from 'node:dns';
import { createServer } from 'node:http';
import { createRequire } from 'node:module';
import type { AddressInfo } from 'node:net';
import type { MockedFunction } from 'vitest';

import {
	getNodeProxyAgent,
	getProxyAgent,
	proxyFetch,
	type EgressFilter,
} from 'src/utils/http-proxy-agent';

vi.mock('@n8n/backend-network/transport', () => ({
	buildDispatcher: vi.fn((proxy: unknown, ssrf: unknown, options: unknown) => ({
		type: 'Dispatcher',
		proxy,
		ssrf,
		options,
	})),
	dispatchedFetch: vi.fn(),
}));

const mockBuildDispatcher = buildDispatcher as unknown as MockedFunction<typeof buildDispatcher>;
const mockDispatchedFetch = dispatchedFetch as unknown as MockedFunction<typeof dispatchedFetch>;

const makeEgressFilter = (): EgressFilter => ({
	validateUrl: vi.fn(async () => ({ ok: true as const })),
	validateConnectionHost: vi.fn(() => ({ ok: true as const })),
	createSecureLookup: vi.fn(() => vi.fn()),
});

// The real "no policy configured" singleton — detected by object identity.
const passthroughFilter: EgressFilter = passthroughEgressFilter;

const DEFAULT_BUILD_OPTIONS = {
	timeouts: { headersTimeout: 3600000, bodyTimeout: 3600000 },
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

	it('resolves undici v7, whose dispatchers the global fetch of every supported Node accepts', () => {
		// A v6 dispatcher handed to the global fetch of Node >= 26 rejects its
		// dispatch handlers ('invalid onError method'), so every consumer call
		// fails with an opaque 'fetch failed'. See the module doc.
		// createRequire bypasses the vi.mock('undici') above.
		const { version } = createRequire(__filename)('undici/package.json') as { version: string };
		expect(Number(version.split('.')[0])).toBeGreaterThanOrEqual(7);
	});

	describe('default behavior (no timeout options)', () => {
		it('should return a direct dispatcher when no proxy environment variables are set and no timeout options', () => {
			const agent = getProxyAgent(undefined, undefined, passthroughFilter);

			expect(agent).toEqual({
				type: 'Dispatcher',
				proxy: false,
				ssrf: 'disabled',
				options: DEFAULT_BUILD_OPTIONS,
			});
		});

		it('should return a direct dispatcher when no proxy is configured for target URL and no timeout options', () => {
			const agent = getProxyAgent('https://api.openai.com/v1', undefined, passthroughFilter);

			expect(agent).toEqual(expect.objectContaining({ type: 'Dispatcher', proxy: false }));
		});

		it('should reuse a single dispatcher across calls when no proxy, timeout options nor egress filter are given', () => {
			const first = getProxyAgent('https://api.openai.com/v1', undefined, passthroughFilter);
			const second = getProxyAgent('https://api.anthropic.com/v1', undefined, passthroughFilter);

			expect(second).toBe(first);
		});

		it('should keep the shared dispatcher for the passthrough egress filter', () => {
			const shared = getProxyAgent('https://api.openai.com/v1', undefined, passthroughFilter);

			expect(getProxyAgent('https://api.openai.com/v1', undefined, passthroughFilter)).toBe(shared);
		});

		it('should keep enforcement for a non-passthrough policy whose lookup is the system dns lookup', () => {
			const filter = makeEgressFilter();
			vi.mocked(filter.createSecureLookup).mockReturnValue(dnsLookup);

			getProxyAgent('https://api.example.com', undefined, filter);

			expect(mockBuildDispatcher).toHaveBeenCalledWith(false, filter, expect.anything());
		});

		it('should build a fresh dispatcher when timeout options or an egress filter are given', () => {
			const shared = getProxyAgent('https://api.openai.com/v1', undefined, passthroughFilter);

			expect(getProxyAgent('https://api.openai.com/v1', {}, passthroughFilter)).not.toBe(shared);
			expect(getProxyAgent('https://api.openai.com/v1', undefined, makeEgressFilter())).not.toBe(
				shared,
			);
		});

		it('should build an env-proxied dispatcher with default timeouts when HTTPS_PROXY is set', () => {
			process.env.HTTPS_PROXY = 'https://proxy.example.com:8080';

			const agent = getProxyAgent(undefined, undefined, passthroughFilter);

			expect(mockBuildDispatcher).toHaveBeenCalledWith('env', 'disabled', DEFAULT_BUILD_OPTIONS);
			expect(agent).toEqual(expect.objectContaining({ type: 'Dispatcher', proxy: 'env' }));
		});

		it('should build an env-proxied dispatcher when https_proxy is set', () => {
			process.env.https_proxy = 'https://proxy.example.com:8080';

			getProxyAgent(undefined, undefined, passthroughFilter);

			expect(mockBuildDispatcher).toHaveBeenCalledWith('env', 'disabled', expect.anything());
		});
	});

	describe('target URL provided', () => {
		it('should build an env-proxied dispatcher for HTTPS URL when HTTPS_PROXY is set', () => {
			process.env.HTTPS_PROXY = 'https://proxy.example.com:8080';

			getProxyAgent('https://api.openai.com/v1', undefined, passthroughFilter);

			expect(mockBuildDispatcher).toHaveBeenCalledWith('env', 'disabled', expect.anything());
		});

		it('should build an env-proxied dispatcher for HTTP URL when HTTP_PROXY is set', () => {
			process.env.HTTP_PROXY = 'http://proxy.example.com:8080';

			getProxyAgent('http://api.example.com', undefined, passthroughFilter);

			expect(mockBuildDispatcher).toHaveBeenCalledWith('env', 'disabled', expect.anything());
		});

		it('should respect NO_PROXY for localhost', () => {
			process.env.HTTP_PROXY = 'http://proxy.example.com:8080';
			process.env.NO_PROXY = 'localhost,127.0.0.1';

			const agent = getProxyAgent('http://localhost:3000', undefined, passthroughFilter);

			expect(agent).toEqual(expect.objectContaining({ type: 'Dispatcher', proxy: false }));
		});

		it('should respect NO_PROXY wildcard patterns', () => {
			process.env.HTTPS_PROXY = 'http://proxy.example.com:8080';
			process.env.NO_PROXY = '*.internal.company.com,localhost';

			const agent = getProxyAgent('https://api.internal.company.com', undefined, passthroughFilter);

			expect(agent).toEqual(expect.objectContaining({ type: 'Dispatcher', proxy: false }));
		});

		it('should use proxy for URLs not in NO_PROXY', () => {
			process.env.HTTPS_PROXY = 'http://proxy.example.com:8080';
			process.env.NO_PROXY = 'localhost,127.0.0.1';

			getProxyAgent('https://api.openai.com/v1', undefined, passthroughFilter);

			expect(mockBuildDispatcher).toHaveBeenCalledWith('env', 'disabled', expect.anything());
		});

		it('should handle mixed case environment variables', () => {
			process.env.https_proxy = 'http://proxy.example.com:8080';
			process.env.no_proxy = 'localhost';

			getProxyAgent('https://api.openai.com/v1', undefined, passthroughFilter);

			expect(mockBuildDispatcher).toHaveBeenCalledWith('env', 'disabled', expect.anything());
		});
	});

	describe('timeout options', () => {
		it('should pass custom timeout options when a proxy is set', () => {
			process.env.HTTPS_PROXY = 'https://proxy.example.com:8080';

			getProxyAgent(
				'https://api.openai.com/v1',
				{
					headersTimeout: 120000,
					bodyTimeout: 180000,
				},
				passthroughFilter,
			);

			expect(mockBuildDispatcher).toHaveBeenCalledWith('env', 'disabled', {
				timeouts: { headersTimeout: 120000, bodyTimeout: 180000 },
			});
		});

		it('should build a direct dispatcher with timeout options when no proxy is configured', () => {
			const agent = getProxyAgent(
				'https://api.openai.com/v1',
				{
					headersTimeout: 120000,
					bodyTimeout: 180000,
				},
				passthroughFilter,
			);

			expect(mockBuildDispatcher).toHaveBeenCalledWith(false, 'disabled', {
				timeouts: { headersTimeout: 120000, bodyTimeout: 180000 },
			});
			expect(agent).toEqual(expect.objectContaining({ type: 'Dispatcher', proxy: false }));
		});

		it('should use default timeouts when empty timeout options object is passed', () => {
			getProxyAgent('https://api.openai.com/v1', {}, passthroughFilter);

			expect(mockBuildDispatcher).toHaveBeenCalledWith(false, 'disabled', DEFAULT_BUILD_OPTIONS);
		});

		it('should include connectTimeout when provided', () => {
			getProxyAgent(
				'https://api.openai.com/v1',
				{
					headersTimeout: 60000,
					bodyTimeout: 60000,
					connectTimeout: 30000,
				},
				passthroughFilter,
			);

			expect(mockBuildDispatcher).toHaveBeenCalledWith(false, 'disabled', {
				timeouts: { headersTimeout: 60000, bodyTimeout: 60000, connectTimeout: 30000 },
			});
		});

		it('should build a fresh dispatcher when N8N_AI_TIMEOUT_MAX is set, even without a proxy or explicit timeout options', () => {
			const shared = getProxyAgent('https://api.openai.com/v1', undefined, passthroughFilter);
			process.env.N8N_AI_TIMEOUT_MAX = '120000';

			const agent = getProxyAgent('https://api.openai.com/v1', undefined, passthroughFilter);

			// DEFAULT_TIMEOUT was captured from the env at module load time (before this test set it),
			// so the value here reflects that capture, not '120000' — the module-reset test below
			// covers the env value actually being picked up end to end.
			expect(agent).toEqual(expect.objectContaining({ type: 'Dispatcher' }));
			expect(agent).not.toBe(shared);
		});

		it('should honor N8N_AI_TIMEOUT_MAX when there is no proxy and the caller passes no timeout options at all', async () => {
			vi.resetModules();
			process.env.N8N_AI_TIMEOUT_MAX = '120000';

			const transport = await import('@n8n/backend-network/transport');
			const egress = await import('@n8n/backend-network/egress');
			const { getProxyAgent: freshGetProxyAgent } = await import('../../utils/http-proxy-agent.js');

			freshGetProxyAgent('https://api.openai.com/v1', undefined, egress.passthroughEgressFilter);

			expect(transport.buildDispatcher).toHaveBeenCalledWith(false, 'disabled', {
				timeouts: { headersTimeout: 120000, bodyTimeout: 120000 },
			});
		});
	});

	describe('egress filter', () => {
		it('should build the dispatcher with the filter when no proxy is configured', () => {
			const egressFilter = makeEgressFilter();

			const agent = getProxyAgent('https://api.openai.com/v1', undefined, egressFilter);

			expect(mockBuildDispatcher).toHaveBeenCalledWith(false, egressFilter, DEFAULT_BUILD_OPTIONS);
			expect(agent).toEqual(expect.objectContaining({ ssrf: egressFilter }));
		});

		it('should build the dispatcher with the filter when a proxy is configured', () => {
			process.env.HTTPS_PROXY = 'https://proxy.example.com:8080';
			const egressFilter = makeEgressFilter();

			getProxyAgent('https://api.openai.com/v1', undefined, egressFilter);

			expect(mockBuildDispatcher).toHaveBeenCalledWith('env', egressFilter, DEFAULT_BUILD_OPTIONS);
		});
	});
});

describe('proxyFetch', () => {
	// Store original environment variables
	const originalEnv = { ...process.env };

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
		mockDispatchedFetch.mockResolvedValue(
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
		it('should fetch with a direct dispatcher when no proxy is set and no timeout options', async () => {
			const url = 'https://api.openai.com/v1';
			await proxyFetch({ input: url, egressFilter: passthroughFilter });

			expect(mockDispatchedFetch).toHaveBeenCalledWith(
				expect.objectContaining({ type: 'Dispatcher', proxy: false }),
				url,
				undefined,
			);
		});

		it('should reuse the same dispatcher across plain calls', async () => {
			await proxyFetch({ input: 'https://api.openai.com/v1', egressFilter: passthroughFilter });
			await proxyFetch({ input: 'https://api.anthropic.com/v1', egressFilter: passthroughFilter });

			const [[first], [second]] = mockDispatchedFetch.mock.calls;
			expect(second).toBe(first);
		});

		it('should build the dispatcher with the supplied egress filter', async () => {
			const egressFilter = makeEgressFilter();
			await proxyFetch({ input: 'https://api.openai.com/v1', egressFilter });

			expect(mockBuildDispatcher).toHaveBeenCalledWith(false, egressFilter, expect.anything());
			expect(mockDispatchedFetch).toHaveBeenCalledWith(
				expect.objectContaining({ ssrf: egressFilter }),
				'https://api.openai.com/v1',
				undefined,
			);
		});

		it('should fetch with a dispatcher when timeout options are provided', async () => {
			const url = 'https://api.openai.com/v1';
			await proxyFetch({
				input: url,
				timeoutOptions: { headersTimeout: 60000 },
				egressFilter: passthroughFilter,
			});

			expect(mockBuildDispatcher).toHaveBeenCalledWith(false, 'disabled', {
				timeouts: { headersTimeout: 60000, bodyTimeout: 3600000 },
			});
			expect(mockDispatchedFetch).toHaveBeenCalledWith(
				expect.objectContaining({ type: 'Dispatcher' }),
				url,
				undefined,
			);
		});

		it('should pass through RequestInit options', async () => {
			const url = 'https://api.openai.com/v1';
			const init: RequestInit = {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ test: 'data' }),
			};

			await proxyFetch({ input: url, init, egressFilter: passthroughFilter });

			expect(mockDispatchedFetch).toHaveBeenCalledWith(expect.anything(), url, init);
		});

		it('should handle URL objects', async () => {
			const url = new URL('https://api.openai.com/v1');
			await proxyFetch({ input: url, egressFilter: passthroughFilter });

			expect(mockDispatchedFetch).toHaveBeenCalledWith(expect.anything(), url, undefined);
		});

		it('should handle Request objects', async () => {
			const request = new Request('https://api.openai.com/v1', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ test: 'data' }),
			});
			await proxyFetch({ input: request, egressFilter: passthroughFilter });

			// A Request is decomposed into url + init: the package's undici fetch does
			// not recognize a Request built by another undici.
			expect(mockDispatchedFetch).toHaveBeenCalledWith(
				expect.anything(),
				'https://api.openai.com/v1',
				expect.objectContaining({
					method: 'POST',
					headers: [['content-type', 'application/json']],
				}),
			);
		});
	});

	describe('with proxy configured', () => {
		it('should fetch with an env-proxied dispatcher when proxy is set', async () => {
			process.env.HTTPS_PROXY = 'https://proxy.example.com:8080';

			const url = 'https://api.openai.com/v1';
			await proxyFetch({ input: url, egressFilter: passthroughFilter });

			expect(mockDispatchedFetch).toHaveBeenCalledWith(
				expect.objectContaining({ type: 'Dispatcher', proxy: 'env' }),
				url,
				undefined,
			);
		});

		it('should pass through RequestInit options with proxy', async () => {
			process.env.HTTPS_PROXY = 'https://proxy.example.com:8080';

			const url = 'https://api.openai.com/v1';
			const init: RequestInit = {
				method: 'POST',
				headers: { Authorization: 'Bearer token123' },
			};

			await proxyFetch({ input: url, init, egressFilter: passthroughFilter });

			expect(mockDispatchedFetch).toHaveBeenCalledWith(
				expect.objectContaining({ type: 'Dispatcher', proxy: 'env' }),
				url,
				init,
			);
		});

		it('should respect NO_PROXY environment variable', async () => {
			process.env.HTTPS_PROXY = 'http://proxy.example.com:8080';
			process.env.NO_PROXY = 'localhost,127.0.0.1';

			const url = 'https://localhost:3000/api';
			await proxyFetch({ input: url, egressFilter: passthroughFilter });

			expect(mockDispatchedFetch).toHaveBeenCalledWith(
				expect.objectContaining({ type: 'Dispatcher', proxy: false }),
				url,
				undefined,
			);
		});

		it('should pass timeout options to the dispatcher when proxy is configured', async () => {
			process.env.HTTPS_PROXY = 'https://proxy.example.com:8080';

			const url = 'https://api.openai.com/v1';
			await proxyFetch({
				input: url,
				timeoutOptions: { headersTimeout: 300000, bodyTimeout: 300000 },
				egressFilter: passthroughFilter,
			});

			expect(mockBuildDispatcher).toHaveBeenCalledWith('env', 'disabled', {
				timeouts: { headersTimeout: 300000, bodyTimeout: 300000 },
			});
		});
	});

	describe('return value', () => {
		it('should return the Response from fetch', async () => {
			const expectedResponse = new Response('{"success":true}', {
				status: 200,
				statusText: 'OK',
			});
			mockDispatchedFetch.mockResolvedValueOnce(expectedResponse);

			const url = 'https://api.openai.com/v1';
			const result = await proxyFetch({ input: url, egressFilter: passthroughFilter });

			expect(result).toBe(expectedResponse);
		});

		it('should propagate fetch errors', async () => {
			const error = new Error('Network error');
			mockDispatchedFetch.mockRejectedValueOnce(error);

			const url = 'https://api.openai.com/v1';

			await expect(proxyFetch({ input: url, egressFilter: passthroughFilter })).rejects.toThrow(
				'Network error',
			);
		});

		it('should return error responses without throwing', async () => {
			const errorResponse = new Response('Not Found', {
				status: 404,
				statusText: 'Not Found',
			});
			mockDispatchedFetch.mockResolvedValueOnce(errorResponse);

			const url = 'https://api.openai.com/v1';
			const result = await proxyFetch({ input: url, egressFilter: passthroughFilter });

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

describe('proxyFetch with the real undici', () => {
	const originalEnv = { ...process.env };

	beforeEach(() => {
		process.env = { ...originalEnv };
		delete process.env.HTTP_PROXY;
		delete process.env.http_proxy;
		delete process.env.HTTPS_PROXY;
		delete process.env.https_proxy;
	});

	afterAll(() => {
		process.env = originalEnv;
	});

	// The Mistral SDK builds its requests with the global Request class and hands
	// them to the fetcher; the package's undici fetch only recognizes its own
	// Request class and used to stringify these to '[object Request]'. Either
	// class can arrive, so both must reach the wire.
	it.each([
		['the global Request class', async () => Request],
		[
			'the undici Request class',
			async () => (await import('undici')).Request as unknown as typeof Request,
		],
	])('should send a Request built with %s', async (_, loadRequestClass) => {
		// The dispatcher and the fetch bound to it are mocked for the rest of this
		// file, so the real transport has to come back for these two.
		vi.doUnmock('@n8n/backend-network/transport');
		vi.resetModules();
		const { proxyFetch: realProxyFetch } = await import('../../utils/http-proxy-agent.js');
		const RequestClass = await loadRequestClass();

		const received: { method?: string; contentType?: string; body?: string } = {};
		const server = createServer((req, res) => {
			let body = '';
			req.on('data', (chunk: Buffer) => (body += chunk.toString()));
			req.on('end', () => {
				Object.assign(received, {
					method: req.method,
					contentType: req.headers['content-type'],
					body,
				});
				res.end('ok');
			});
		});
		await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
		const { port } = server.address() as AddressInfo;

		try {
			const request = new RequestClass(`http://127.0.0.1:${port}/v1/chat/completions`, {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: '{"model":"mistral-small"}',
			});
			const response = await realProxyFetch({ input: request, egressFilter: passthroughFilter });

			expect(await response.text()).toBe('ok');
			expect(received).toEqual({
				method: 'POST',
				contentType: 'application/json',
				body: '{"model":"mistral-small"}',
			});
		} finally {
			server.closeAllConnections();
			await new Promise((resolve) => server.close(resolve));
		}
	});
});
