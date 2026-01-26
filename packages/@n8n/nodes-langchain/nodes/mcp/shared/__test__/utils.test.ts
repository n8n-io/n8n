import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { mockDeep } from 'jest-mock-extended';
import type { IExecuteFunctions } from 'n8n-workflow';

import type { McpAuthenticationOption, McpServerTransport } from '../types';
import { connectMcpClient, getAuthHeaders, tryRefreshOAuth2Token } from '../utils';

jest.mock('@modelcontextprotocol/sdk/client/index.js');
jest.mock('@modelcontextprotocol/sdk/client/streamableHttp.js');
jest.mock('@modelcontextprotocol/sdk/client/sse.js');

const MockedClient = Client as jest.MockedClass<typeof Client>;
const MockedHTTPTransport = StreamableHTTPClientTransport as jest.MockedClass<
	typeof StreamableHTTPClientTransport
>;
const MockedSSETransport = SSEClientTransport as jest.MockedClass<typeof SSEClientTransport>;

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
			const mockHttpTransport = {} as unknown as StreamableHTTPClientTransport;
			const mockSSETransport = {} as unknown as SSEClientTransport;
			MockedClient.mockImplementation(() => mockClient as unknown as Client);
			MockedHTTPTransport.mockImplementation(() => mockHttpTransport);
			MockedSSETransport.mockImplementation(() => mockSSETransport);
		});

		describe.each([
			['httpStreamable', StreamableHTTPClientTransport],
			['sse', SSEClientTransport],
		] as Array<
			[McpServerTransport, typeof StreamableHTTPClientTransport | typeof SSEClientTransport]
		>)('%s transport', (transport, Transport) => {
			it('should retry on 401 and succeed', async () => {
				const unauthorizedError = new Error('Request failed with status 401');
				const onUnauthorized = jest.fn().mockResolvedValue({ Authorization: 'Bearer new-token' });
				mockClient.connect
					.mockRejectedValueOnce(unauthorizedError)
					.mockResolvedValueOnce(undefined);

				const result = await connectMcpClient({
					serverTransport: transport,
					endpointUrl: 'https://example.com',
					headers: { Authorization: 'Bearer old-token' },
					name: 'test-client',
					version: 1,
					onUnauthorized,
				});

				expect(result.ok).toBe(true);
				expect(mockClient.connect).toHaveBeenCalledTimes(2);
				expect(onUnauthorized).toHaveBeenCalledWith({ Authorization: 'Bearer old-token' });
				expect(Transport).toHaveBeenCalledTimes(2);
				expect(Transport).toHaveBeenNthCalledWith(
					1,
					expect.any(URL),
					expect.objectContaining({
						requestInit: expect.objectContaining({
							headers: expect.objectContaining({
								Authorization: 'Bearer old-token',
							}),
						}),
					}),
				);
				expect(Transport).toHaveBeenNthCalledWith(
					2,
					expect.any(URL),
					expect.objectContaining({
						requestInit: expect.objectContaining({
							headers: expect.objectContaining({
								Authorization: 'Bearer new-token',
							}),
						}),
					}),
				);
			});

			it('should not retry on not 401', async () => {
				const error = new Error('Internal Server Error');
				mockClient.connect.mockRejectedValueOnce(error);

				const result = await connectMcpClient({
					serverTransport: transport,
					endpointUrl: 'https://example.com',
					headers: { Authorization: 'Bearer old-token' },
					name: 'test-client',
					version: 1,
				});

				expect(result.ok).toBe(false);
				if (!result.ok) {
					expect(result.error.type).toBe('connection');
				}
				expect(mockClient.connect).toHaveBeenCalledTimes(1);
				expect(Transport).toHaveBeenCalledTimes(1);
			});

			it('should not retry when onUnauthorized is not provided', async () => {
				const error = new Error('Request failed with status 401');
				mockClient.connect.mockRejectedValueOnce(error);

				const result = await connectMcpClient({
					serverTransport: transport,
					endpointUrl: 'https://example.com',
					headers: { Authorization: 'Bearer old-token' },
					name: 'test-client',
					version: 1,
				});

				expect(result.ok).toBe(false);
				if (!result.ok) {
					expect(result.error.type).toBe('auth');
				}
				expect(mockClient.connect).toHaveBeenCalledTimes(1);
				expect(Transport).toHaveBeenCalledTimes(1);
			});

			it('should not retry when onUnauthorized returns null', async () => {
				const error = new Error('Request failed with status 401');
				const onUnauthorized = jest.fn().mockResolvedValue(null);
				mockClient.connect.mockRejectedValueOnce(error);

				const result = await connectMcpClient({
					serverTransport: transport,
					endpointUrl: 'https://example.com',
					headers: { Authorization: 'Bearer old-token' },
					name: 'test-client',
					version: 1,
					onUnauthorized,
				});

				expect(result.ok).toBe(false);
				if (!result.ok) {
					expect(result.error.type).toBe('auth');
				}
				expect(mockClient.connect).toHaveBeenCalledTimes(1);
				expect(Transport).toHaveBeenCalledTimes(1);
				expect(onUnauthorized).toHaveBeenCalledWith({ Authorization: 'Bearer old-token' });
			});

			it('should not retry more than once', async () => {
				const error = new Error('Request failed with status 401');
				mockClient.connect.mockRejectedValue(error);
				const onUnauthorized = jest.fn().mockResolvedValue({ Authorization: 'Bearer new-token' });

				const result = await connectMcpClient({
					serverTransport: transport,
					endpointUrl: 'https://example.com',
					headers: { Authorization: 'Bearer old-token' },
					name: 'test-client',
					version: 1,
					onUnauthorized,
				});

				expect(result.ok).toBe(false);
				if (!result.ok) {
					expect(result.error.type).toBe('auth');
				}
				expect(mockClient.connect).toHaveBeenCalledTimes(2);
				expect(Transport).toHaveBeenCalledTimes(2);
				expect(onUnauthorized).toHaveBeenCalledTimes(1);
				expect(onUnauthorized).toHaveBeenCalledWith({ Authorization: 'Bearer old-token' });
			});
		});
	});
});
