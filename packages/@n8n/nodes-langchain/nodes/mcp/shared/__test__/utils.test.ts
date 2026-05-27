import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { proxyFetch } from '@n8n/ai-utilities';
import type { IExecuteFunctions, INode } from 'n8n-workflow';
import type { Mock, MockedClass, MockedFunction } from 'vitest';
import { mockDeep } from 'vitest-mock-extended';
import { expect } from 'vitest';

import type { McpAuthenticationOption } from '../types';
import {
	connectMcpClient,
	getAuthHeaders,
	mapToNodeOperationError,
	tryRefreshOAuth2Token,
} from '../utils';

vi.mock('@modelcontextprotocol/sdk/client/index.js');
vi.mock('@modelcontextprotocol/sdk/client/streamableHttp.js');
vi.mock('@modelcontextprotocol/sdk/client/sse.js');
vi.mock('@n8n/ai-utilities', async () => {
	const actual = await vi.importActual('@n8n/ai-utilities');
	return {
		...(actual as Record<string, unknown>),
		proxyFetch: vi.fn(),
	};
});

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
		it('should return the headers and credentials for mcpOAuth2Api', async () => {
			const ctx = mockDeep<IExecuteFunctions>();
			const credentials = {
				oauthTokenData: {
					access_token: 'access-token',
				},
			};
			ctx.getCredentials.mockResolvedValue(credentials);

			const result = await getAuthHeaders(ctx, 'mcpOAuth2Api');

			expect(result).toEqual({
				headers: { Authorization: 'Bearer access-token' },
				credentials,
			});
		});

		it('should return the headers and credentials for headerAuth', async () => {
			const ctx = mockDeep<IExecuteFunctions>();
			const credentials = {
				name: 'Foo',
				value: 'bar',
			};
			ctx.getCredentials.mockResolvedValue(credentials);

			const result = await getAuthHeaders(ctx, 'headerAuth');

			expect(result).toEqual({ headers: { Foo: 'bar' }, credentials });
		});

		it('should return the headers and credentials for bearerAuth', async () => {
			const ctx = mockDeep<IExecuteFunctions>();
			const credentials = {
				token: 'access-token',
			};
			ctx.getCredentials.mockResolvedValue(credentials);

			const result = await getAuthHeaders(ctx, 'bearerAuth');

			expect(result).toEqual({
				headers: { Authorization: 'Bearer access-token' },
				credentials,
			});
		});

		it('should return the headers and credentials for multipleHeadersAuth', async () => {
			const ctx = mockDeep<IExecuteFunctions>();
			const credentials = {
				headers: {
					values: [
						{ name: 'Foo', value: 'bar' },
						{ name: 'Test', value: '123' },
					],
				},
			};
			ctx.getCredentials.mockResolvedValue(credentials);

			const result = await getAuthHeaders(ctx, 'multipleHeadersAuth');

			expect(result).toEqual({
				headers: { Foo: 'bar', Test: '123' },
				credentials,
			});
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
			close: vi.fn(),
		};

		const mockedProxyFetch = proxyFetch as MockedFunction<typeof proxyFetch>;

		beforeEach(() => {
			vi.clearAllMocks();
			vi.restoreAllMocks();
			mockClient.close.mockResolvedValue(undefined);

			MockedClient.mockImplementation(function () {
				return mockClient as unknown as Client;
			});
		});

		describe.each([
			['httpStreamable', StreamableHTTPClientTransport],
			['sse', SSEClientTransport],
		] as const)('%s transport', (transport, TransportClass) => {
			it('should return cancelled without creating a transport when signal is already aborted', async () => {
				const abort = new AbortController();
				abort.abort();
				const addEventListener = vi.spyOn(abort.signal, 'addEventListener');

				const result = await connectMcpClient({
					serverTransport: transport,
					endpointUrl: 'https://example.com',
					name: 'test-client',
					version: 1,
					signal: abort.signal,
				});

				expect(result.ok).toBe(false);
				if (!result.ok) {
					expect(result.error.type).toBe('cancelled');
					expect(result.error.error.message).toBe('Execution was cancelled');
				}
				expect(TransportClass).not.toHaveBeenCalled();
				expect(mockClient.connect).not.toHaveBeenCalled();
				expect(addEventListener).toHaveBeenCalledWith('abort', expect.any(Function), {
					once: true,
				});
			});

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

			it('should connect successfully without a signal and not pass requestInit', async () => {
				mockClient.connect.mockResolvedValue(undefined);

				const result = await connectMcpClient({
					serverTransport: transport,
					endpointUrl: 'https://example.com',
					name: 'test-client',
					version: 1,
				});

				expect(result.ok).toBe(true);
				const [, opts] = (TransportClass as Mock).mock.calls[0];
				expect(opts).not.toHaveProperty('requestInit');
			});

			it('should pass the abort signal in requestInit when a signal is provided', async () => {
				mockClient.connect.mockResolvedValue(undefined);
				const abort = new AbortController();

				const result = await connectMcpClient({
					serverTransport: transport,
					endpointUrl: 'https://example.com',
					name: 'test-client',
					version: 1,
					signal: abort.signal,
				});

				expect(result.ok).toBe(true);
				const [, opts] = (TransportClass as Mock).mock.calls[0];
				expect(opts.requestInit).toEqual({ signal: abort.signal });
			});

			it('should attach a once abort listener that closes the client and swallows close rejection', async () => {
				mockClient.connect.mockResolvedValue(undefined);
				mockClient.close.mockRejectedValueOnce(new Error('close failed'));
				const abort = new AbortController();
				const addEventListener = vi.spyOn(abort.signal, 'addEventListener');

				await connectMcpClient({
					serverTransport: transport,
					endpointUrl: 'https://example.com',
					name: 'test-client',
					version: 1,
					signal: abort.signal,
				});

				expect(addEventListener).toHaveBeenCalledWith('abort', expect.any(Function), {
					once: true,
				});
				expect(() => abort.abort()).not.toThrow();
				await Promise.resolve();
				expect(mockClient.close).toHaveBeenCalledTimes(1);
			});

			it('should allow the returned client to close normally and close again on later abort', async () => {
				mockClient.connect.mockResolvedValue(undefined);
				const abort = new AbortController();

				const result = await connectMcpClient({
					serverTransport: transport,
					endpointUrl: 'https://example.com',
					name: 'test-client',
					version: 1,
					signal: abort.signal,
				});

				expect(result.ok).toBe(true);
				if (result.ok) {
					await result.result.close();
				}
				abort.abort();
				await Promise.resolve();
				expect(mockClient.close).toHaveBeenCalledTimes(2);
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

			it('should return cancelled when connect throws AbortError with a signal', async () => {
				const abortError = new Error('The operation was aborted');
				abortError.name = 'AbortError';
				mockClient.connect.mockRejectedValueOnce(abortError);
				const abort = new AbortController();

				const result = await connectMcpClient({
					serverTransport: transport,
					endpointUrl: 'https://example.com',
					name: 'test-client',
					version: 1,
					signal: abort.signal,
				});

				expect(result.ok).toBe(false);
				if (!result.ok) {
					expect(result.error.type).toBe('cancelled');
					expect(result.error.error).toBe(abortError);
				}
			});

			it('should return cancelled when the signal is aborted while connect fails', async () => {
				const abort = new AbortController();
				mockClient.connect.mockImplementationOnce(async () => {
					abort.abort();
					throw new Error('connect failed after cancellation');
				});

				const result = await connectMcpClient({
					serverTransport: transport,
					endpointUrl: 'https://example.com',
					name: 'test-client',
					version: 1,
					signal: abort.signal,
				});

				expect(result.ok).toBe(false);
				if (!result.ok) {
					expect(result.error.type).toBe('cancelled');
				}
			});

			it('should return connection when connect throws AbortError without a signal', async () => {
				const abortError = new Error('The operation was aborted');
				abortError.name = 'AbortError';
				mockClient.connect.mockRejectedValueOnce(abortError);

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

	describe('mapToNodeOperationError', () => {
		it('should map cancelled connection errors to an execution cancellation message', () => {
			const node = mockDeep<INode>();
			const error = new Error('abort');

			const result = mapToNodeOperationError(node, { type: 'cancelled', error });

			expect(result.message).toBe('Execution was cancelled');
		});
	});
});
