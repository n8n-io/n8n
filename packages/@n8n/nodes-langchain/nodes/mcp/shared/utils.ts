import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { createRefreshingAuthFetch, proxyFetch } from '@n8n/ai-utilities';
import type { ClientOAuth2TokenData } from '@n8n/client-oauth2';
import { createResultError, createResultOk, type Result } from '@n8n/utils/result';
import type {
	ICredentialDataDecryptedObject,
	IExecuteFunctions,
	ILoadOptionsFunctions,
	Logger,
	McpRegistryCredentialType,
	McpRegistryConnection,
	INode,
	ISupplyDataFunctions,
	NodeEgressFilter,
	PrepareMcpRegistryConnectionInput,
	PrepareMcpRegistryConnectionResult,
} from 'n8n-workflow';
import {
	assertCredentialAllowsUrl,
	assertUrlAllowed,
	getMcpAuthHeaders,
	isMcpAiGatewayAuthentication,
	NodeOperationError,
	shouldRefreshMcpOAuth2Token,
} from 'n8n-workflow';

import {
	isMcpOAuth2Authentication,
	type McpAuthenticationOption,
	type McpServerTransport,
	type McpTool,
} from './types';

import { ContentBlockSchema, type ContentBlock } from '@modelcontextprotocol/sdk/types.js';

export type { ContentBlock as McpContentBlock };

/**
 * Strict MCP content array detection. Returns false for empty arrays so callers
 * fall back to default formatting.
 */
export function isMcpContentArray(data: unknown): data is ContentBlock[] {
	if (!Array.isArray(data) || data.length === 0) return false;
	return Array.from(data).every((item) => ContentBlockSchema.safeParse(item).success);
}
const MCP_SESSION_TERMINATION_TIMEOUT_MS = 1_000;

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
	| { type: 'auth'; error: Error }
	| { type: 'cancelled'; error: Error };

/**
 * Convert a ConnectMcpClientError into a NodeOperationError associated with the provided node.
 *
 * @param node - The node instance where the error occurred
 * @param error - The MCP client error to map
 * @returns A NodeOperationError containing a user-facing message and, when available, the original error message as the description
 */
export function mapToNodeOperationError(
	node: INode,
	error: ConnectMcpClientError,
): NodeOperationError {
	switch (error.type) {
		case 'cancelled':
			return new NodeOperationError(node, error.error, {
				message: 'Execution was cancelled',
			});
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

/**
 * Establishes and returns a connected MCP Client to the provided endpoint using the selected transport.
 *
 * @param serverTransport - Transport to use; `'httpStreamable'` uses the streamable HTTP transport, otherwise SSE is used.
 * @param endpointUrl - MCP server endpoint URL; missing scheme will be normalized (e.g., `https://` prefixed) and validated.
 * @param headers - Initial request headers to include with each transport request.
 * @param name - Client name sent to the MCP server.
 * @param version - Client version sent to the MCP server.
 * @param onUnauthorized - Optional handler invoked to refresh/replace headers when a `401` response is encountered.
 * @param signal - Optional AbortSignal to cooperatively cancel the connection attempt; if aborted, returns a `cancelled` error.
 * @returns A Result containing a connected `Client` on success. On failure returns a `ConnectMcpClientError` with `type` one of:
 * - `'invalid_url'` when the endpoint URL could not be parsed,
 * - `'cancelled'` when the operation was aborted,
 * - `'auth'` for authentication failures (HTTP 401/403),
 * - `'connection'` for other connection errors. The returned error includes the underlying `Error`.
 */
export async function connectMcpClient({
	headers,
	serverTransport,
	endpointUrl,
	name,
	version,
	onUnauthorized,
	signal,
	allowedDomains,
	secureEgressFilter,
	getTraceHeaders,
	logger,
}: {
	serverTransport: McpServerTransport;
	endpointUrl: string;
	headers?: Record<string, string>;
	name: string;
	version: number;
	onUnauthorized?: OnUnauthorizedHandler;
	signal?: AbortSignal;
	/**
	 * Comma-separated allowlist from the credential. When set, every request
	 * (including redirect hops) is validated against it via `assertUrlAllowed`.
	 */
	allowedDomains?: string;
	/**
	 * Instance egress filter. Every request (including redirect hops) is
	 * validated against the configured egress policy, and the connection is
	 * pinned to the validated address.
	 */
	secureEgressFilter: NodeEgressFilter;
	/**
	 * Returns the W3C trace context of the node that runs now. It is called for each
	 * request: one client serves many tool calls, each under a different span. Omit it
	 * when the caller has no node context to read it from.
	 */
	getTraceHeaders?: () => Record<string, string>;
	logger?: Logger;
}): Promise<Result<Client, ConnectMcpClientError>> {
	const endpoint = normalizeAndValidateUrl(endpointUrl);

	if (!endpoint.ok) {
		return createResultError({ type: 'invalid_url', error: endpoint.error });
	}

	const authFetch = createAuthFetch({
		initialHeaders: headers,
		secureEgressFilter,
		onUnauthorized,
		allowedDomains,
		getTraceHeaders,
		logger,
	});
	const client = new Client({ name, version: version.toString() }, { capabilities: {} });

	let onAbort: (() => void) | undefined;
	if (signal) {
		onAbort = () => {
			Promise.resolve(client.close()).catch(() => {});
		};
		signal.addEventListener('abort', onAbort, { once: true });

		// Clean up the listener when the client is closed normally,
		// preventing accumulation of dead client references for long-running agents.
		const originalClose = client.close.bind(client);
		client.close = async () => {
			if (onAbort && signal) {
				signal.removeEventListener('abort', onAbort);
				onAbort = undefined;
			}
			await originalClose();
		};
	}

	if (signal?.aborted) {
		if (onAbort && signal) {
			signal.removeEventListener('abort', onAbort);
			onAbort = undefined;
		}
		return createResultError({
			type: 'cancelled',
			error: new Error('Execution was cancelled'),
		});
	}

	if (serverTransport === 'httpStreamable') {
		try {
			const transport = new StreamableHTTPClientTransport(endpoint.result, {
				fetch: authFetch,
				// The auth fetch validates each hop and removes credentials across origins.
				redirectPolicy: 'follow',
				...(signal ? { requestInit: { signal } } : {}),
			});
			const originalClose = client.close.bind(client);
			let closePromise: Promise<void> | undefined;
			client.close = async () => {
				closePromise ??= (async () => {
					let timeout: ReturnType<typeof setTimeout> | undefined;
					try {
						await Promise.race([
							Promise.resolve(transport.terminateSession()).catch(() => {}),
							new Promise<void>((resolve) => {
								timeout = setTimeout(resolve, MCP_SESSION_TERMINATION_TIMEOUT_MS);
							}),
						]);
					} finally {
						if (timeout !== undefined) clearTimeout(timeout);
						await originalClose();
					}
				})();

				await closePromise;
			};
			await client.connect(transport);
			return createResultOk(client);
		} catch (error) {
			const connectionError = error instanceof Error ? error : new Error(String(error));
			if ((signal && connectionError.name === 'AbortError') || signal?.aborted) {
				if (onAbort && signal) {
					signal.removeEventListener('abort', onAbort);
					onAbort = undefined;
				}
				return createResultError({ type: 'cancelled', error: connectionError });
			}

			// Clean up the abort listener so a failed client doesn't stay pinned to the execution signal
			if (onAbort && signal) {
				signal.removeEventListener('abort', onAbort);
				onAbort = undefined;
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
			redirectPolicy: 'follow',
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
			...(signal ? { requestInit: { signal } } : {}),
		});
		await client.connect(sseTransport);
		return createResultOk(client);
	} catch (error) {
		const connectionError = error instanceof Error ? error : new Error(String(error));
		if ((signal && connectionError.name === 'AbortError') || signal?.aborted) {
			if (onAbort && signal) {
				signal.removeEventListener('abort', onAbort);
				onAbort = undefined;
			}
			return createResultError({ type: 'cancelled', error: connectionError });
		}

		// Clean up the abort listener so a failed client doesn't stay pinned to the execution signal
		if (onAbort && signal) {
			signal.removeEventListener('abort', onAbort);
			onAbort = undefined;
		}

		if (isUnauthorizedError(error) || isForbiddenError(error)) {
			return createResultError({ type: 'auth', error: error as Error });
		} else {
			return createResultError({ type: 'connection', error: error as Error });
		}
	}
}

function headersToRecord(headers: HeadersInit | undefined): Record<string, string> {
	return headers ? Object.fromEntries(new Headers(headers).entries()) : {};
}

/**
 * Wraps a fetch so that each request carries the W3C trace context of the node that
 * runs now. One MCP client serves many tool calls under different spans, so the
 * headers are read for each request and not once at connect.
 */
function withTraceHeaders(
	baseFetch: typeof fetch,
	getTraceHeaders: () => Record<string, string>,
	logger?: Logger,
): typeof fetch {
	return async (input, init) => {
		let tracedInit: RequestInit | undefined;
		try {
			const traceHeaders = getTraceHeaders();
			if (Object.keys(traceHeaders).length) {
				const headers = new Headers(init?.headers);
				for (const [name, value] of Object.entries(traceHeaders)) headers.set(name, value);
				tracedInit = { ...init, headers };
			}
		} catch (error) {
			logger?.warn('Failed to add the trace context to an MCP request', {
				error: error instanceof Error ? error.message : String(error),
			});
		}

		return await baseFetch(input, tracedInit ?? init);
	};
}

/**
 * Creates a fetch wrapper that:
 *   - injects auth headers into every request,
 *   - retries once on 401 after refreshing the token via onUnauthorized,
 *   - validates the initial URL and every redirect hop against `allowedDomains`
 *     so credentials are never sent to a host the credential doesn't allow,
 *   - validates the initial URL and every redirect hop against the instance
 *     `secureEgressFilter`, and pins the connection to the validated address,
 *   - withholds the auth headers once a redirect crosses origins, so
 *     credentials never reach a host other than the one the request started on,
 *   - adds the W3C trace context of the running node to every request.
 */
function createAuthFetch({
	initialHeaders,
	secureEgressFilter,
	onUnauthorized,
	allowedDomains,
	getTraceHeaders,
	logger,
}: {
	initialHeaders?: Record<string, string>;
	secureEgressFilter: NodeEgressFilter;
	onUnauthorized?: OnUnauthorizedHandler;
	allowedDomains?: string;
	getTraceHeaders?: () => Record<string, string>;
	logger?: Logger;
}): typeof fetch {
	const proxied: typeof fetch = async (input, init) =>
		await proxyFetch({ input, init, egressFilter: secureEgressFilter });

	return createRefreshingAuthFetch({
		baseFetch: getTraceHeaders ? withTraceHeaders(proxied, getTraceHeaders, logger) : proxied,
		initialHeaders,
		...(onUnauthorized
			? {
					refreshHeaders: async (current: Headers) =>
						await onUnauthorized(Object.fromEntries(current.entries())),
				}
			: {}),
		assertAllowedUrl: async (hopUrl) => {
			assertUrlAllowed({ url: hopUrl, allowedDomains });
			const result = await secureEgressFilter.validateUrl(hopUrl);
			if (!result.ok) throw result.error;
		},
	});
}

export async function getAuthHeaders(
	ctx: IExecuteFunctions | ISupplyDataFunctions | ILoadOptionsFunctions,
	authentication: McpAuthenticationOption,
): Promise<{
	headers?: Record<string, string>;
	credentials?: ICredentialDataDecryptedObject;
}> {
	if (authentication === 'none') return {};

	// Reading the credential mints a token. A failed mint is not caught: its error (Gateway
	// credits off, no credits left) is the real cause. An expired token is minted again on a 401.
	if (isMcpAiGatewayAuthentication(authentication)) {
		const credentials = await ctx.getCredentials<ICredentialDataDecryptedObject>(authentication);
		const headers = getMcpAuthHeaders(authentication, credentials);
		return Object.keys(headers).length > 0 ? { headers, credentials } : { credentials };
	}

	let credentialType: string;
	if (isMcpOAuth2Authentication(authentication)) {
		credentialType = authentication;
	} else {
		const credentialTypes: Record<string, string> = {
			headerAuth: 'httpHeaderAuth',
			bearerAuth: 'httpBearerAuth',
			multipleHeadersAuth: 'httpMultipleHeadersAuth',
		};
		credentialType = credentialTypes[authentication];
		if (!credentialType) return {};
	}

	const credentials = await ctx
		.getCredentials<ICredentialDataDecryptedObject>(credentialType)
		.catch(() => null);
	if (!credentials) return {};

	if (
		isMcpOAuth2Authentication(authentication) &&
		shouldRefreshMcpOAuth2Token(credentials.oauthTokenData, credentials.grantType)
	) {
		const refreshedHeaders = await tryRefreshOAuth2Token(ctx, authentication);
		if (refreshedHeaders) return { headers: refreshedHeaders, credentials };
	}

	const headers = getMcpAuthHeaders(authentication, credentials);
	return Object.keys(headers).length > 0 ? { headers, credentials } : { credentials };
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

	const headersWithoutAuthorization = Object.fromEntries(
		Object.entries(headers).filter(([name]) => name.toLowerCase() !== 'authorization'),
	);
	return {
		...headersWithoutAuthorization,
		Authorization: `Bearer ${access_token}`,
	};
}

/**
 * Reads the Gateway credits credential again, which mints a current token. The token can expire
 * while the MCP client is still in use: in a long execution, or after a wait.
 * @returns The headers with the new token, or null when the credential has no token
 */
export async function tryRefreshAiGatewayToken(
	ctx: IExecuteFunctions | ISupplyDataFunctions | ILoadOptionsFunctions,
	authentication: McpAuthenticationOption,
	headers: Record<string, string> = {},
) {
	const credentials = await ctx.getCredentials<ICredentialDataDecryptedObject>(authentication);
	const authHeaders = getMcpAuthHeaders(authentication, credentials);
	if (Object.keys(authHeaders).length === 0) return null;
	const otherHeaders = Object.fromEntries(
		Object.entries(headers).filter(([name]) => name.toLowerCase() !== 'authorization'),
	);
	return { ...otherHeaders, ...authHeaders };
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
		registryCredential?: {
			connection: McpRegistryConnection;
			credentialType: McpRegistryCredentialType;
			prepareConnection(
				input: PrepareMcpRegistryConnectionInput,
			): PrepareMcpRegistryConnectionResult;
		};
		surface: string;
		signal?: AbortSignal;
	},
): Promise<Result<Client, ConnectMcpClientError>> {
	const node = ctx.getNode();
	const { headers, credentials } = await getAuthHeaders(ctx, config.authentication);
	const isOAuth2 = isMcpOAuth2Authentication(config.authentication);
	let endpointUrl = config.endpointUrl;
	let serverTransport = config.serverTransport;
	let authHeaders = headers;
	let allowedDomains: string | undefined;

	if (config.registryCredential) {
		if (!credentials) {
			throw new NodeOperationError(node, 'No MCP OAuth2 credential type found');
		}
		const prepared = config.registryCredential.prepareConnection({
			connection: config.registryCredential.connection,
			credentialType: config.registryCredential.credentialType,
			credentialData: credentials,
			headers,
		});
		if (!prepared.ok) {
			throw new NodeOperationError(node, prepared.error.message);
		}
		endpointUrl = prepared.value.endpointUrl;
		serverTransport = prepared.value.transport;
		authHeaders = prepared.value.headers;
		allowedDomains = prepared.value.allowedDomains;
	} else if (credentials) {
		allowedDomains = assertCredentialAllowsUrl({
			node,
			credentialData: credentials,
			url: endpointUrl,
			surface: config.surface,
		});
	}

	return await connectMcpClient({
		serverTransport,
		endpointUrl,
		headers: authHeaders,
		allowedDomains,
		secureEgressFilter: ctx.helpers.getSecureEgressFilter(),
		getTraceHeaders: () => ctx.helpers.getTraceHeaders(),
		logger: ctx.logger,
		name: node.type,
		version: node.typeVersion,
		onUnauthorized: isOAuth2
			? async (h) => await tryRefreshOAuth2Token(ctx, config.authentication, h)
			: isMcpAiGatewayAuthentication(config.authentication)
				? async (h) => await tryRefreshAiGatewayToken(ctx, config.authentication, h)
				: undefined,
		signal: config.signal,
	});
}

export function isStructuredContent(value: unknown): value is Record<string, unknown> {
	return (
		value !== undefined && value !== null && typeof value === 'object' && !Array.isArray(value)
	);
}
