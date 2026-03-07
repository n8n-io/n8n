import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import type { ClientOAuth2TokenData } from '@n8n/client-oauth2';
import type {
	IExecuteFunctions,
	ILoadOptionsFunctions,
	INode,
	ISupplyDataFunctions,
	Result,
} from 'n8n-workflow';
import { createResultError, createResultOk, NodeOperationError } from 'n8n-workflow';

import { proxyFetch } from '@n8n/ai-utilities';

import type { McpAuthenticationOption, McpServerTransport, McpTool } from './types';

export async function getAllTools(client: Client, cursor?: string): Promise<McpTool[]> {
	const { tools, nextCursor } = await client.listTools({ cursor });

	if (nextCursor) {
		return (tools as McpTool[]).concat(await getAllTools(client, nextCursor));
	}

	return tools as McpTool[];
}

function safeCreateUrl(url: string, baseUrl?: string | URL): Result<URL, Error> {
	try {
		return createResultOk(new URL(url, baseUrl));
	} catch (error) {
		return createResultError(error);
	}
}

function normalizeAndValidateUrl(input: string): Result<URL, Error> {
	const withProtocol = !/^https?:\/\//i.test(input) ? `https://${input}` : input;
	const parsedUrl = safeCreateUrl(withProtocol);

	if (!parsedUrl.ok) {
		return createResultError(parsedUrl.error);
	}

	return parsedUrl;
}

function errorHasCode(error: unknown, code: number): boolean {
	return (
		!!error &&
		typeof error === 'object' &&
		(('code' in error && Number(error.code) === code) ||
			('message' in error &&
				typeof error.message === 'string' &&
				error.message.includes(code.toString())))
	);
}

function isUnauthorizedError(error: unknown): boolean {
	return errorHasCode(error, 401);
}

function isForbiddenError(error: unknown): boolean {
	return errorHasCode(error, 403);
}

type OnUnauthorizedHandler = (
	headers?: Record<string, string>,
) => Promise<Record<string, string> | null>;

type ConnectMcpClientError =
	| { type: 'invalid_url'; error: Error }
	| { type: 'connection'; error: Error }
	| { type: 'auth'; error: Error };

export function mapToNodeOperationError(
	node: INode,
	error: ConnectMcpClientError,
): NodeOperationError {
	switch (error.type) {
		case 'invalid_url':
			return new NodeOperationError(node, error.error, {
				message: 'Could not connect to your MCP server. The provided URL is invalid.',
			});
		case 'auth':
			return new NodeOperationError(node, error.error, {
				message: 'Could not connect to your MCP server. Authentication failed.',
				description: error.error.message,
			});
		case 'connection':
		default:
			return new NodeOperationError(node, error.error, {
				message: 'Could not connect to your MCP server',
				description: error.error.message,
			});
	}
}

export async function connectMcpClient({
	headers,
	serverTransport,
	endpointUrl,
	name,
	version,
	onUnauthorized,
}: {
	serverTransport: McpServerTransport;
	endpointUrl: string;
	headers?: Record<string, string>;
	name: string;
	version: number;
	onUnauthorized?: OnUnauthorizedHandler;
}): Promise<Result<Client, ConnectMcpClientError>> {
	const endpoint = normalizeAndValidateUrl(endpointUrl);

	if (!endpoint.ok) {
		return createResultError({ type: 'invalid_url', error: endpoint.error });
	}

	const client = new Client({ name, version: version.toString() }, { capabilities: {} });

	if (serverTransport === 'httpStreamable') {
		try {
			const transport = new StreamableHTTPClientTransport(endpoint.result, {
				requestInit: { headers },
				fetch: proxyFetch,
			});
			await client.connect(transport);
			return createResultOk(client);
		} catch (error) {
			if (onUnauthorized && isUnauthorizedError(error)) {
				const newHeaders = await onUnauthorized(headers);
				if (newHeaders) {
					// Don't pass `onUnauthorized` to avoid possible infinite recursion
					return await connectMcpClient({
						headers: newHeaders,
						serverTransport,
						endpointUrl,
						name,
						version,
					});
				}
			}

			if (isUnauthorizedError(error) || isForbiddenError(error)) {
				return createResultError({ type: 'auth', error: error as Error });
			} else {
				return createResultError({ type: 'connection', error: error as Error });
			}
		}
	}

	try {
		const sseTransport = new SSEClientTransport(endpoint.result, {
			eventSourceInit: {
				fetch: async (url, init) =>
					await proxyFetch(url, {
						...init,
						headers: {
							...headers,
							Accept: 'text/event-stream',
						},
					}),
			},
			fetch: proxyFetch,
			requestInit: { headers },
		});
		await client.connect(sseTransport);
		return createResultOk(client);
	} catch (error) {
		if (onUnauthorized && isUnauthorizedError(error)) {
			const newHeaders = await onUnauthorized(headers);
			if (newHeaders) {
				// Don't pass `onUnauthorized` to avoid possible infinite recursion
				return await connectMcpClient({
					headers: newHeaders,
					serverTransport,
					endpointUrl,
					name,
					version,
				});
			}
		}

		if (isUnauthorizedError(error) || isForbiddenError(error)) {
			return createResultError({ type: 'auth', error: error as Error });
		} else {
			return createResultError({ type: 'connection', error: error as Error });
		}
	}
}

export async function getAuthHeaders(
	ctx: Pick<IExecuteFunctions, 'getCredentials'>,
	authentication: McpAuthenticationOption,
): Promise<{ headers?: Record<string, string> }> {
	switch (authentication) {
		case 'headerAuth': {
			const header = await ctx
				.getCredentials<{ name: string; value: string }>('httpHeaderAuth')
				.catch(() => null);

			if (!header) return {};

			return { headers: { [header.name]: header.value } };
		}
		case 'bearerAuth': {
			const result = await ctx
				.getCredentials<{ token: string }>('httpBearerAuth')
				.catch(() => null);

			if (!result) return {};

			return { headers: { Authorization: `Bearer ${result.token}` } };
		}
		case 'mcpOAuth2Api': {
			const result = await ctx
				.getCredentials<{ oauthTokenData: { access_token: string } }>('mcpOAuth2Api')
				.catch(() => null);

			if (!result) return {};

			return { headers: { Authorization: `Bearer ${result.oauthTokenData.access_token}` } };
		}
		case 'multipleHeadersAuth': {
			const result = await ctx
				.getCredentials<{ headers: { values: Array<{ name: string; value: string }> } }>(
					'httpMultipleHeadersAuth',
				)
				.catch(() => null);

			if (!result) return {};

			return {
				headers: result.headers.values.reduce(
					(acc, cur) => {
						acc[cur.name] = cur.value;
						return acc;
					},
					{} as Record<string, string>,
				),
			};
		}
		case 'none':
		default: {
			return {};
		}
	}
}

/**
 * Tries to refresh the OAuth2 token, storing them in the database if successful
 * @param ctx - The execution context
 * @param authentication - The authentication method
 * @param headers - The headers to refresh
 * @returns The refreshed headers or null if the authentication method is not oAuth2Api or has failed
 */
export async function tryRefreshOAuth2Token(
	ctx: IExecuteFunctions | ISupplyDataFunctions | ILoadOptionsFunctions,
	authentication: McpAuthenticationOption,
	headers?: Record<string, string>,
) {
	if (authentication !== 'mcpOAuth2Api') {
		return null;
	}

	let access_token: string | null = null;
	try {
		const result = (await ctx.helpers.refreshOAuth2Token.call(
			ctx,
			'mcpOAuth2Api',
		)) as ClientOAuth2TokenData;
		access_token = result?.access_token;
	} catch (error) {
		return null;
	}

	if (!access_token) {
		return null;
	}

	if (!headers) {
		return {
			Authorization: `Bearer ${access_token}`,
		};
	}

	return {
		...headers,
		Authorization: `Bearer ${access_token}`,
	};
}
