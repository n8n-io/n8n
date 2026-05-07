import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { proxyFetch } from '@n8n/ai-utilities';
import type { IExecuteFunctions } from 'n8n-workflow';
import type { Mock, MockedClass, MockedFunction } from 'vitest';
import { mockDeep } from 'vitest-mock-extended';
import { expect } from 'vitest';

import type { McpAuthenticationOption } from '../types';
import { connectMcpClient, getAuthHeaders, tryRefreshOAuth2Token } from '../utils';

vi.mock('@modelcontextprotocol/sdk/client/index.js');
vi.mock('@modelcontextprotocol/sdk/client/streamableHttp.js');
vi.mock('@modelcontextprotocol/sdk/client/sse.js');
vi.mock('@n8n/ai-utilities', () => ({
	proxyFetch: vi.fn(),
}));

const MockedClient = Client as MockedClass<typeof Client>;

describe('utils', () => {
	describe('tryRefreshOAuth2Token', () => {
		it('should refresh an OAuth2 token without headers', async () => {
			const ctx = mockDeep<IExecuteFunctions>();
			ctx.helpers.refreshOAuth2Token.mockResolvedValue({
				access_token: 'new-access-token',
			});

			const headers = await tryRefreshOAuth2Token(ctx, 'mcpOAuth2Api');

			expect(headers).toEqual({ Authorization: 'Bearer new-access-token' });
		});

		it('should refresh an OAuth2 token with headers', async () => {
			const ctx = mockDeep<IExecuteFunctions>();
			ctx.helpers.refreshOAuth2Token.mockResolvedValue({
				access_token: 'new-access-token',
			});

			const headers = await tryRefreshOAuth2Token(ctx, 'mcpOAuth2Api', {
				Foo: 'bar',
				Authorization: 'Bearer old-access-token',
			});

			expect(headers).toEqual({
				Foo: 'bar',
				Authorization: 'Bearer new-access-token',
			});
		});

		it('should return null if the authentication method is not oAuth2Api', async () => {
			const ctx = mockDeep<IExecuteFunctions>();

			const headers = await tryRefreshOAuth2Token(ctx, 'headerAuth');

			expect(headers).toBeNull();
		});

		it('should return null if the refreshOAuth2Token returns no access_token', async () => {
			const ctx = mockDeep<IExecuteFunctions>();
			ctx.helpers.refreshOAuth2Token.mockResolvedValue({
				access_token: null,
			});

			const headers = await tryRefreshOAuth2Token(ctx, 'mcpOAuth2Api');

			expect(headers).toBeNull();
		});

		it('should return null if the refreshOAuth2Token throws an error', async () => {
			const ctx = mockDeep<IExecuteFunctions>();
			ctx.helpers.refreshOAuth2Token.mockRejectedValue(new Error('Failed to refresh OAuth2 token'));

			const headers = await tryRefreshOAuth2Token(ctx, 'mcpOAuth2Api');

			expect(headers).toBeNull();
		});
	});

	describe('getAuthHeaders', () => {
		it('should return the headers for mcpOAuth2Api', async () => {
			const ctx = mockDeep<IExecuteFunctions>();
			ctx.getCredentials.mockResolvedValue({
				oauthTokenData: {
					access_token: 'access-token',
				},
			});

			const result = await getAuthHeaders(ctx, 'mcpOAuth2Api');

			expect(result).toEqual({ headers: { Authorization: 'Bearer access-token' } });
		});

		it('should return the headers for headerAuth', async () => {
			const ctx = mockDeep<IExecuteFunctions>();
			ctx.getCredentials.mockResolvedValue({
				name: 'Foo',
				value: 'bar',
			});

			const result = await getAuthHeaders(ctx, 'headerAuth');

			expect(result).toEqual({ headers: { Foo: 'bar' } });
		});

		it('should return the headers for bearerAuth', async () => {
			const ctx = mockDeep<IExecuteFunctions>();
			ctx.getCredentials.mockResolvedValue({
				token: 'access-token',
			});

			const result = await getAuthHeaders(ctx, 'bearerAuth');

			expect(result).toEqual({ headers: { Authorization: 'Bearer access-token' } });
		});

		it('should return the headers for multipleHeadersAuth', async () => {
			const ctx = mockDeep<IExecuteFunctions>();
			ctx.getCredentials.mockResolvedValue({
				headers: {
					values: [
						{ name: 'Foo', value: 'bar' },
						{ name: 'Test', value: '123' },
					],
				},
			});

			const result = await getAuthHeaders(ctx, 'multipleHeadersAuth');

			expect(result).toEqual({ headers: { Foo: 'bar', Test: '123' } });
		});

		it('should return an empty object for none', async () => {
			const ctx = mockDeep<IExecuteFunctions>();

			const result = await getAuthHeaders(ctx, 'none');

			expect(result).toEqual({});
		});

		it('should return an empty object for an unknown authentication method', async () => {
			const ctx = mockDeep<IExecuteFunctions>();

			const result = await getAuthHeaders(ctx, 'unknown' as McpAuthenticationOption);

			expect(result).toEqual({});
		});

		it.each([
			'headerAuth',
			'bearerAuth',
			'mcpOAuth2Api',
			'multipleHeadersAuth',
		] as McpAuthenticationOption[])(
			'should return an empty object for %s when it fails',
			async (authentication) => {
				const ctx = mockDeep<IExecuteFunctions>();
				ctx.getCredentials.mockRejectedValue(new Error('Failed to get credentials'));

				const result = await getAuthHeaders(ctx, authentication);

				expect(result).toEqual({});
			},
		);
	});
	describe('connectMcpClient', () => {
		const mockClient = {
			connect: vi.fn(),
		};

		const mockedProxyFetch = proxyFetch as MockedFunction<typeof proxyFetch>;

		beforeEach(() => {
			vi.clearAllMocks();
			vi.restoreAllMocks();

			MockedClient.mockImplementation(function () {
				return mockClient as unknown as Client;
			});
		});

		describe.each([
			['httpStreamable', StreamableHTTPClientTransport],
			['sse', SSEClientTransport],
		] as const)('%s transport', (transport, TransportClass) => {
			it('should connect successfully and pass a custom fetch', async () => {
				mockClient.connect.mockResolvedValue(undefined);

				await connectMcpClient({
					serverTransport: transport,
					endpointUrl: 'https://example.com',
					headers: { Authorization: 'Bearer token' },
					name: 'test-client',
					version: 1,
				});

				expect(TransportClass).toHaveBeenCalledTimes(1);

				const [, opts] = (TransportClass as Mock).mock.calls[0];
				expect(opts.fetch).toBeTypeOf('function');
			});

			it('should return auth error on 401 during connect', async () => {
				mockClient.connect.mockRejectedValueOnce(new Error('Request failed with status 401'));

				const result = await connectMcpClient({
					serverTransport: transport,
					endpointUrl: 'https://example.com',
					headers: { Authorization: 'Bearer token' },
					name: 'test-client',
					version: 1,
				});

				expect(result.ok).toBe(false);
				if (!result.ok) {
					expect(result.error.type).toBe('auth');
				}
			});

			it('should return connection error on non-auth failure', async () => {
				mockClient.connect.mockRejectedValueOnce(new Error('Connection refused'));

				const result = await connectMcpClient({
					serverTransport: transport,
					endpointUrl: 'https://example.com',
					name: 'test-client',
					version: 1,
				});

				expect(result.ok).toBe(false);
				if (!result.ok) {
					expect(result.error.type).toBe('connection');
				}
			});

			it('should inject auth headers into fetch requests', async () => {
				mockClient.connect.mockResolvedValue(undefined);
				mockedProxyFetch.mockResolvedValue(new Response('ok', { status: 200 }));

				await connectMcpClient({
					serverTransport: transport,
					endpointUrl: 'https://example.com',
					headers: { Authorization: 'Bearer my-token' },
					name: 'test-client',
					version: 1,
				});

				// The authFetch function is passed to the transport constructor but never called
				// by the mocked transport. Extract it and invoke directly to test its behavior.
				const [, opts] = (TransportClass as Mock).mock.calls[0];
				await opts.fetch('https://example.com/mcp', {});

				expect(mockedProxyFetch).toHaveBeenCalled();

				const call = mockedProxyFetch.mock.calls[0];

				expect(call[0]).toBe('https://example.com/mcp');
				expect(call[1]).toEqual(
					expect.objectContaining({
						headers: expect.objectContaining({
							Authorization: 'Bearer my-token',
						}),
					}),
				);
			});

			it('should preserve SDK headers passed as Headers instance', async () => {
				mockClient.connect.mockResolvedValue(undefined);

				const sdkHeaders = new Headers({
					Accept: 'text/event-stream',
					'mcp-protocol-version': '2025-03-26',
				});

				mockedProxyFetch.mockResolvedValue(new Response('ok', { status: 200 }));

				await connectMcpClient({
					serverTransport: transport,
					endpointUrl: 'https://example.com',
					headers: { Authorization: 'Bearer my-token' },
					name: 'test-client',
					version: 1,
				});

				// Simulate the transport calling authFetch with a Headers instance as init.headers.
				// Headers entries() normalises keys to lowercase, so Accept becomes 'accept'.
				const [, opts] = (TransportClass as Mock).mock.calls[0];
				await opts.fetch('https://example.com', { headers: sdkHeaders });

				const [, callOpts] = mockedProxyFetch.mock.calls[0];

				// @ts-expect-error - Mocking
				expect(callOpts.headers).toEqual(
					expect.objectContaining({
						accept: expect.any(String),
					}),
				);
			});

			it('should retry on 401 response with refreshed headers', async () => {
				mockClient.connect.mockResolvedValue(undefined);

				const onUnauthorized = vi.fn().mockResolvedValue({
					Authorization: 'Bearer refreshed-token',
				});

				mockedProxyFetch
					.mockResolvedValueOnce(new Response('Unauthorized', { status: 401 }))
					.mockResolvedValueOnce(new Response('ok', { status: 200 }));

				const result = await connectMcpClient({
					serverTransport: transport,
					endpointUrl: 'https://example.com',
					headers: { Authorization: 'Bearer old-token' },
					name: 'test-client',
					version: 1,
					onUnauthorized,
				});

				const [, opts] = (TransportClass as Mock).mock.calls[0];
				await opts.fetch('https://example.com', {});

				expect(result.ok).toBe(true);
				expect(onUnauthorized).toHaveBeenCalledTimes(1);
				expect(mockedProxyFetch).toHaveBeenCalledTimes(2);
			});

			it('should use refreshed headers for subsequent requests', async () => {
				mockClient.connect.mockResolvedValue(undefined);

				const onUnauthorized = vi.fn().mockResolvedValue({
					Authorization: 'Bearer refreshed-token',
				});

				mockedProxyFetch.mockResolvedValue(new Response('ok', { status: 200 }));

				await connectMcpClient({
					serverTransport: transport,
					endpointUrl: 'https://example.com',
					headers: { Authorization: 'Bearer old-token' },
					name: 'test-client',
					version: 1,
					onUnauthorized,
				});

				const [, opts] = (TransportClass as Mock).mock.calls[0];
				await opts.fetch('https://example.com', {});

				expect(mockedProxyFetch).toHaveBeenCalledTimes(1);
			});

			it('should not retry on 401 when onUnauthorized returns null', async () => {
				mockClient.connect.mockResolvedValue(undefined);

				const onUnauthorized = vi.fn().mockResolvedValue(null);

				mockedProxyFetch.mockResolvedValueOnce(new Response('Unauthorized', { status: 401 }));

				const result = await connectMcpClient({
					serverTransport: transport,
					endpointUrl: 'https://example.com',
					headers: { Authorization: 'Bearer token' },
					name: 'test-client',
					version: 1,
					onUnauthorized,
				});

				const [, opts] = (TransportClass as Mock).mock.calls[0];
				await opts.fetch('https://example.com', {});

				expect(result.ok).toBe(true);
				expect(onUnauthorized).toHaveBeenCalledTimes(1);
				expect(mockedProxyFetch).toHaveBeenCalledTimes(1);
			});

			it('should not retry on 401 when onUnauthorized is not provided', async () => {
				mockClient.connect.mockResolvedValue(undefined);

				mockedProxyFetch.mockResolvedValueOnce(new Response('Unauthorized', { status: 401 }));

				const result = await connectMcpClient({
					serverTransport: transport,
					endpointUrl: 'https://example.com',
					headers: { Authorization: 'Bearer token' },
					name: 'test-client',
					version: 1,
				});

				const [, opts] = (TransportClass as Mock).mock.calls[0];
				await opts.fetch('https://example.com', {});

				expect(result.ok).toBe(true);
				expect(mockedProxyFetch).toHaveBeenCalledTimes(1);
			});
		});
	});
});
