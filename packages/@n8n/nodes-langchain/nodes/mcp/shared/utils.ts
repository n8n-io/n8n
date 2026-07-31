import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import type { ClientOAuth2TokenData } from '@n8n/client-oauth2';
import type {
	ICredentialDataDecryptedObject,
	IExecuteFunctions,
	ILoadOptionsFunctions,
	INode,
	ISupplyDataFunctions,
	Result,
} from 'n8n-workflow';
import {
	ApplicationError,
	createResultError,
	createResultOk,
	isDomainAllowed,
	NodeOperationError,
} from 'n8n-workflow';

import { fetchFollowingRedirects } from '@utils/follow-redirects';
import { proxyFetch } from '@utils/httpProxyAgent';

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
			});
		case 'connection':
		default:
			return new NodeOperationError(node, error.error, {
				message: 'Could not connect to your MCP server',
			});
	}
}

/**
 * Wraps `proxyFetch` so each hop is validated against `allowedDomains` before
 * the request is sent. With no allowlist, behaves like `proxyFetch`.
 */
function createValidatingFetch(allowedDomains?: string): typeof fetch {
	return async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
		const startUrl = input instanceof Request ? input.url : input;
		return await fetchFollowingRedirects(proxyFetch, startUrl, init, {
			onBeforeHop: (hopUrl) => {
				if (allowedDomains && !isDomainAllowed(hopUrl, { allowedDomains })) {
					throw new ApplicationError(
						`Domain not allowed: This credential is restricted from accessing ${hopUrl}. Only the following domains are allowed: ${allowedDomains}`,
					);
				}
			},
		});
	};
}

export async function connectMcpClient({
	headers,
	serverTransport,
	endpointUrl,
	name,
	version,
	onUnauthorized,
	allowedDomains,
}: {
	serverTransport: McpServerTransport;
	endpointUrl: string;
	headers?: Record<string, string>;
	name: string;
	version: number;
	onUnauthorized?: OnUnauthorizedHandler;
	/**
	 * Comma-separated allowlist from the credential. When set, every request
	 * (including redirect hops) is validated against it.
	 */
	allowedDomains?: string;
}): Promise<Result<Client, ConnectMcpClientError>> {
	const endpoint = normalizeAndValidateUrl(endpointUrl);

	if (!endpoint.ok) {
		return createResultError({ type: 'invalid_url', error: endpoint.error });
	}

	const validatingFetch = createValidatingFetch(allowedDomains);
	const client = new Client({ name, version: version.toString() }, { capabilities: {} });

	if (serverTransport === 'httpStreamable') {
		try {
			const transport = new StreamableHTTPClientTransport(endpoint.result, {
				requestInit: { headers },
				fetch: validatingFetch,
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
						allowedDomains,
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
					await validatingFetch(url, {
						...init,
						headers: {
							...headers,
							Accept: 'text/event-stream',
						},
					}),
			},
			fetch: validatingFetch,
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
					allowedDomains,
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
): Promise<{
	headers?: Record<string, string>;
	credentials?: ICredentialDataDecryptedObject;
}> {
	switch (authentication) {
		case 'headerAuth': {
			const credentials = await ctx
				.getCredentials<{ name: string; value: string }>('httpHeaderAuth')
				.catch(() => null);

			if (!credentials) return {};

			return {
				headers: { [credentials.name]: credentials.value },
				credentials,
			};
		}
		case 'bearerAuth': {
			const credentials = await ctx
				.getCredentials<{ token: string }>('httpBearerAuth')
				.catch(() => null);

			if (!credentials) return {};

			return {
				headers: { Authorization: `Bearer ${credentials.token}` },
				credentials,
			};
		}
		case 'mcpOAuth2Api': {
			const credentials = await ctx
				.getCredentials<{ oauthTokenData: { access_token: string } }>('mcpOAuth2Api')
				.catch(() => null);

			if (!credentials) return {};

			return {
				headers: { Authorization: `Bearer ${credentials.oauthTokenData.access_token}` },
				credentials,
			};
		}
		case 'multipleHeadersAuth': {
			const credentials = await ctx
				.getCredentials<{ headers: { values: Array<{ name: string; value: string }> } }>(
					'httpMultipleHeadersAuth',
				)
				.catch(() => null);

			if (!credentials) return {};

			return {
				headers: credentials.headers.values.reduce(
					(acc: Record<string, string>, cur: { name: string; value: string }) => {
						acc[cur.name] = cur.value;
						return acc;
					},
					{} as Record<string, string>,
				),
				credentials,
			};
		}
		case 'none':
		default: {
			return {};
		}
	}
}

/**
 * Enforces the credential's "Allowed HTTP Request Domains" setting for the
 * MCP server URL. Mirrors the HTTP Request node's behaviour:
 *   - `'none'` blocks any use of the credential
 *   - `'domains'` restricts to a comma-separated allowlist (wildcards via `*.`)
 *   - anything else (or missing credential) allows the request
 *
 * Returns the allowlist string when one applies so callers can pass it down
 * to `connectMcpClient` for per-hop redirect validation; returns `undefined`
 * when the credential allows everything.
 */
export function assertCredentialAllowsUrl(
	node: INode,
	credentials: ICredentialDataDecryptedObject | undefined,
	url: string,
): string | undefined {
	if (!credentials) return undefined;

	if (credentials.allowedHttpRequestDomains === 'none') {
		throw new NodeOperationError(
			node,
			'This credential is configured to prevent use within an MCP Client node',
		);
	}

	if (credentials.allowedHttpRequestDomains !== 'domains') return undefined;

	const allowedDomains =
		typeof credentials.allowedDomains === 'string' ? credentials.allowedDomains : '';
	if (!allowedDomains || allowedDomains.trim() === '') {
		throw new NodeOperationError(
			node,
			'No allowed domains specified. Configure allowed domains or change restriction setting.',
		);
	}

	if (!isDomainAllowed(url, { allowedDomains })) {
		throw new NodeOperationError(
			node,
			`Domain not allowed: This credential is restricted from accessing ${url}. Only the following domains are allowed: ${allowedDomains}`,
		);
	}

	return allowedDomains;
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
