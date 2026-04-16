import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { mockDeep } from 'jest-mock-extended';
import type { IExecuteFunctions } from 'n8n-workflow';

import { proxyFetch } from '@n8n/ai-utilities';

import type { McpAuthenticationOption, McpServerTransport } from '../types';
import { connectMcpClient, getAuthHeaders, tryRefreshOAuth2Token } from '../utils';

jest.mock('@modelcontextprotocol/sdk/client/index.js');
jest.mock('@modelcontextprotocol/sdk/client/streamableHttp.js');
jest.mock('@modelcontextprotocol/sdk/client/sse.js');
jest.mock('@n8n/ai-utilities', () => ({
	proxyFetch: jest.fn(),
}));

const mockedProxyFetch = proxyFetch as jest.MockedFunction<typeof proxyFetch>;

const MockedClient = Client as jest.MockedClass<typeof Client>;

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
			connect: jest.fn(),
		};

		beforeEach(() => {
			jest.resetAllMocks();
			MockedClient.mockImplementation(() => mockClient as unknown as Client);
		});

		describe.each([
			['httpStreamable', StreamableHTTPClientTransport],
			['sse', SSEClientTransport],
		] as Array<
			[McpServerTransport, typeof StreamableHTTPClientTransport | typeof SSEClientTransport]
		>)('%s transport', (transport, Transport) => {
			it('should connect successfully and pass a custom fetch', async () => {
				(Transport as jest.Mock).mockImplementation(() => ({}));
				mockClient.connect.mockResolvedValue(undefined);

				const result = await connectMcpClient({
					serverTransport: transport,
					endpointUrl: 'https://example.com',
					headers: { Authorization: 'Bearer token' },
					name: 'test-client',
					version: 1,
				});

				expect(result.ok).toBe(true);
				expect(Transport).toHaveBeenCalledTimes(1);
				const transportOpts = (Transport as jest.Mock).mock.calls[0][1];
				expect(transportOpts.fetch).toBeDefined();
			});

			it('should return auth error on 401 during connect', async () => {
				(Transport as jest.Mock).mockImplementation(() => ({}));
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
				(Transport as jest.Mock).mockImplementation(() => ({}));
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
				let capturedFetch: typeof fetch | undefined;
				(Transport as jest.Mock).mockImplementation((_url: URL, opts: { fetch?: typeof fetch }) => {
					capturedFetch = opts?.fetch;
					return {};
				});
				mockClient.connect.mockResolvedValue(undefined);
				mockedProxyFetch.mockResolvedValue(new Response('ok', { status: 200 }));

				await connectMcpClient({
					serverTransport: transport,
					endpointUrl: 'https://example.com',
					headers: { Authorization: 'Bearer my-token' },
					name: 'test-client',
					version: 1,
				});

				expect(capturedFetch).toBeDefined();
				await capturedFetch!('https://example.com/mcp', {
					headers: { 'content-type': 'application/json' },
				});

				expect(mockedProxyFetch).toHaveBeenCalledWith(
					'https://example.com/mcp',
					expect.objectContaining({
						headers: expect.objectContaining({
							'content-type': 'application/json',
							Authorization: 'Bearer my-token',
						}),
					}),
				);
			});

			it('should preserve SDK headers passed as a Headers instance', async () => {
				let capturedFetch: typeof fetch | undefined;
				(Transport as jest.Mock).mockImplementation((_url: URL, opts: { fetch?: typeof fetch }) => {
					capturedFetch = opts?.fetch;
					return {};
				});
				mockClient.connect.mockResolvedValue(undefined);
				mockedProxyFetch.mockResolvedValue(new Response('ok', { status: 200 }));

				await connectMcpClient({
					serverTransport: transport,
					endpointUrl: 'https://example.com',
					headers: { Authorization: 'Bearer my-token' },
					name: 'test-client',
					version: 1,
				});

				expect(capturedFetch).toBeDefined();
				const sdkHeaders = new Headers({
					Accept: 'text/event-stream',
					'mcp-protocol-version': '2025-03-26',
				});
				await capturedFetch!('https://example.com/mcp', { headers: sdkHeaders });

				expect(mockedProxyFetch).toHaveBeenCalledWith(
					'https://example.com/mcp',
					expect.objectContaining({
						headers: expect.objectContaining({
							accept: 'text/event-stream',
							'mcp-protocol-version': '2025-03-26',
							Authorization: 'Bearer my-token',
						}),
					}),
				);
			});

			it('should retry on 401 response with refreshed headers from onUnauthorized', async () => {
				let capturedFetch: typeof fetch | undefined;
				(Transport as jest.Mock).mockImplementation((_url: URL, opts: { fetch?: typeof fetch }) => {
					capturedFetch = opts?.fetch;
					return {};
				});
				mockClient.connect.mockResolvedValue(undefined);

				const onUnauthorized = jest
					.fn()
					.mockResolvedValue({ Authorization: 'Bearer refreshed-token' });

				await connectMcpClient({
					serverTransport: transport,
					endpointUrl: 'https://example.com',
					headers: { Authorization: 'Bearer old-token' },
					name: 'test-client',
					version: 1,
					onUnauthorized,
				});

				mockedProxyFetch
					.mockResolvedValueOnce(new Response('Unauthorized', { status: 401 }))
					.mockResolvedValueOnce(new Response('ok', { status: 200 }));

				const response = await capturedFetch!('https://example.com/mcp', {});

				expect(response.status).toBe(200);
				expect(onUnauthorized).toHaveBeenCalledWith({ Authorization: 'Bearer old-token' });
				expect(mockedProxyFetch).toHaveBeenCalledTimes(2);
				expect(mockedProxyFetch).toHaveBeenNthCalledWith(
					2,
					'https://example.com/mcp',
					expect.objectContaining({
						headers: expect.objectContaining({
							Authorization: 'Bearer refreshed-token',
						}),
					}),
				);
			});

			it('should use refreshed headers for subsequent requests after 401 retry', async () => {
				let capturedFetch: typeof fetch | undefined;
				(Transport as jest.Mock).mockImplementation((_url: URL, opts: { fetch?: typeof fetch }) => {
					capturedFetch = opts?.fetch;
					return {};
				});
				mockClient.connect.mockResolvedValue(undefined);

				const onUnauthorized = jest
					.fn()
					.mockResolvedValue({ Authorization: 'Bearer refreshed-token' });

				await connectMcpClient({
					serverTransport: transport,
					endpointUrl: 'https://example.com',
					headers: { Authorization: 'Bearer old-token' },
					name: 'test-client',
					version: 1,
					onUnauthorized,
				});

				// First request: 401 -> refresh -> retry succeeds
				mockedProxyFetch
					.mockResolvedValueOnce(new Response('Unauthorized', { status: 401 }))
					.mockResolvedValueOnce(new Response('ok', { status: 200 }));
				await capturedFetch!('https://example.com/mcp', {});

				// Second request: should use the refreshed token directly
				mockedProxyFetch.mockResolvedValueOnce(new Response('ok', { status: 200 }));
				await capturedFetch!('https://example.com/mcp', {});

				expect(mockedProxyFetch).toHaveBeenNthCalledWith(
					3,
					'https://example.com/mcp',
					expect.objectContaining({
						headers: expect.objectContaining({
							Authorization: 'Bearer refreshed-token',
						}),
					}),
				);
			});

			it('should not retry on 401 when onUnauthorized returns null', async () => {
				let capturedFetch: typeof fetch | undefined;
				(Transport as jest.Mock).mockImplementation((_url: URL, opts: { fetch?: typeof fetch }) => {
					capturedFetch = opts?.fetch;
					return {};
				});
				mockClient.connect.mockResolvedValue(undefined);

				const onUnauthorized = jest.fn().mockResolvedValue(null);

				await connectMcpClient({
					serverTransport: transport,
					endpointUrl: 'https://example.com',
					headers: { Authorization: 'Bearer old-token' },
					name: 'test-client',
					version: 1,
					onUnauthorized,
				});

				mockedProxyFetch.mockResolvedValueOnce(new Response('Unauthorized', { status: 401 }));

				const response = await capturedFetch!('https://example.com/mcp', {});

				expect(response.status).toBe(401);
				expect(onUnauthorized).toHaveBeenCalledTimes(1);
				expect(mockedProxyFetch).toHaveBeenCalledTimes(1);
			});

			it('should not retry on 401 when onUnauthorized is not provided', async () => {
				let capturedFetch: typeof fetch | undefined;
				(Transport as jest.Mock).mockImplementation((_url: URL, opts: { fetch?: typeof fetch }) => {
					capturedFetch = opts?.fetch;
					return {};
				});
				mockClient.connect.mockResolvedValue(undefined);

				await connectMcpClient({
					serverTransport: transport,
					endpointUrl: 'https://example.com',
					headers: { Authorization: 'Bearer token' },
					name: 'test-client',
					version: 1,
				});

				mockedProxyFetch.mockResolvedValueOnce(new Response('Unauthorized', { status: 401 }));

				const response = await capturedFetch!('https://example.com/mcp', {});

				expect(response.status).toBe(401);
				expect(mockedProxyFetch).toHaveBeenCalledTimes(1);
			});
		});
	});
});
