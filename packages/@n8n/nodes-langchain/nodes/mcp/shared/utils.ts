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
	assertCredentialAllowsUrl,
	assertUrlAllowed,
	createResultError,
	createResultOk,
	NodeOperationError,
} from 'n8n-workflow';

import { fetchFollowingRedirects, proxyFetch } from '@n8n/ai-utilities';

import {
	isMcpOAuth2Authentication,
	type McpAuthenticationOption,
	type McpServerTransport,
	type McpTool,
} from './types';

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
	 * (including redirect hops) is validated against it via `assertUrlAllowed`.
	 */
	allowedDomains?: string;
}): Promise<Result<Client, ConnectMcpClientError>> {
	const endpoint = normalizeAndValidateUrl(endpointUrl);

	if (!endpoint.ok) {
		return createResultError({ type: 'invalid_url', error: endpoint.error });
	}

	const authFetch = createAuthFetch(headers, onUnauthorized, allowedDomains);
	const client = new Client({ name, version: version.toString() }, { capabilities: {} });

	if (serverTransport === 'httpStreamable') {
		try {
			const transport = new StreamableHTTPClientTransport(endpoint.result, {
				fetch: authFetch,
			});
			await client.connect(transport);
			return createResultOk(client);
		} catch (error) {
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
					await authFetch(url, {
						...init,
						headers: {
							...headersToRecord(init?.headers),
							Accept: 'text/event-stream',
						},
					}),
			},
			fetch: authFetch,
		});
		await client.connect(sseTransport);
		return createResultOk(client);
	} catch (error) {
		if (isUnauthorizedError(error) || isForbiddenError(error)) {
			return createResultError({ type: 'auth', error: error as Error });
		} else {
			return createResultError({ type: 'connection', error: error as Error });
		}
	}
}

/** Safely converts any HeadersInit value to a plain Record<string, string>. */
function headersToRecord(headers: HeadersInit | undefined): Record<string, string> {
	if (!headers) return {};
	if (headers instanceof Headers) return Object.fromEntries(headers.entries());
	if (Array.isArray(headers)) return Object.fromEntries(headers);
	return headers;
}

/**
 * Creates a fetch wrapper that:
 *   - injects auth headers into every request,
 *   - retries once on 401 after refreshing the token via onUnauthorized,
 *   - validates the initial URL and every redirect hop against `allowedDomains`
 *     so credentials are never sent to a host the credential doesn't allow.
 */
function createAuthFetch(
	initialHeaders: Record<string, string> | undefined,
	onUnauthorized?: OnUnauthorizedHandler,
	allowedDomains?: string,
): typeof fetch {
	let headers = initialHeaders;

	const authedFetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
		const response = await proxyFetch(input, {
			...init,
			headers: {
				...headersToRecord(init?.headers),
				...headers,
			},
		});

		if (response.status !== 401 || !onUnauthorized) {
			return response;
		}

		const refreshedHeaders = await onUnauthorized(headers);
		if (!refreshedHeaders) {
			return response;
		}

		headers = refreshedHeaders;
		return await proxyFetch(input, {
			...init,
			headers: {
				...headersToRecord(init?.headers),
				...headers,
			},
		});
	};

	return async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
		// `fetchFollowingRedirects` accepts `string | URL`. `Request` objects are
		// unwrapped to their URL so the redirect loop can carry a stable input.
		const startUrl = input instanceof Request ? input.url : input;
		return await fetchFollowingRedirects(authedFetch, startUrl, init, {
			onBeforeHop: (hopUrl) => assertUrlAllowed({ url: hopUrl, allowedDomains }),
		});
	};
}

export async function getAuthHeaders(
	ctx: Pick<IExecuteFunctions, 'getCredentials'>,
	authentication: McpAuthenticationOption,
): Promise<{
	headers?: Record<string, string>;
	credentials?: ICredentialDataDecryptedObject;
}> {
	if (isMcpOAuth2Authentication(authentication)) {
		const credentials = await ctx
			.getCredentials<{ oauthTokenData: { access_token: string } }>(authentication)
			.catch(() => null);

		if (!credentials) return {};

		return {
			headers: { Authorization: `Bearer ${credentials.oauthTokenData.access_token}` },
			credentials,
		};
	}

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
		case 'multipleHeadersAuth': {
			const credentials = await ctx
				.getCredentials<{ headers: { values: Array<{ name: string; value: string }> } }>(
					'httpMultipleHeadersAuth',
				)
				.catch(() => null);

			if (!credentials) return {};

			return {
				headers: credentials.headers.values.reduce(
					(acc, cur) => {
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
 * Tries to refresh the OAuth2 token, storing them in the database if successful
 * @param ctx - The execution context
 * @param authentication - The authentication method
 * @param headers - The headers to refresh
 * @returns The refreshed headers or null if authentication is not an MCP OAuth2 credential type or has failed
 */
export async function tryRefreshOAuth2Token(
	ctx: IExecuteFunctions | ISupplyDataFunctions | ILoadOptionsFunctions,
	authentication: McpAuthenticationOption,
	headers?: Record<string, string>,
) {
	if (!isMcpOAuth2Authentication(authentication)) {
		return null;
	}

	let access_token: string | null = null;
	try {
		const result = (await ctx.helpers.refreshOAuth2Token.call(
			ctx,
			authentication,
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

/**
 * Connect to an MCP server on behalf of a user credential
 * enforcing the credential's "Allowed Domains"
 */
export async function connectMcpClientForCredential(
	ctx: IExecuteFunctions | ILoadOptionsFunctions | ISupplyDataFunctions,
	config: {
		authentication: McpAuthenticationOption;
		serverTransport: McpServerTransport;
		endpointUrl: string;
		surface: string;
	},
): Promise<Result<Client, ConnectMcpClientError>> {
	const node = ctx.getNode();
	const { headers, credentials } = await getAuthHeaders(ctx, config.authentication);

	const allowedDomains = credentials
		? assertCredentialAllowsUrl({
				node,
				credentialData: credentials,
				url: config.endpointUrl,
				surface: config.surface,
			})
		: undefined;

	return await connectMcpClient({
		serverTransport: config.serverTransport,
		endpointUrl: config.endpointUrl,
		headers,
		allowedDomains,
		name: node.type,
		version: node.typeVersion,
		onUnauthorized: async (h) => await tryRefreshOAuth2Token(ctx, config.authentication, h),
	});
}

export function isStructuredContent(value: unknown): value is Record<string, unknown> {
	return (
		value !== undefined && value !== null && typeof value === 'object' && !Array.isArray(value)
	);
}
