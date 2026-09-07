import type { CredentialProvider, McpClient, McpServerConfig } from '@n8n/agents';
import type { AgentJsonMcpServerConfig } from '@n8n/api-types';
import type { CustomFetch } from '@n8n/backend-network';
import { ensureError } from '@n8n/utils/errors/ensure-error';
import { isRecord } from '@n8n/utils/is-record';
import {
	getMcpAuthHeaders,
	isMcpOAuth2Authentication,
	OperationalError,
	shouldRefreshMcpOAuth2Token,
} from 'n8n-workflow';
import type { ICredentialDataDecryptedObject, McpRegistryConnection } from 'n8n-workflow';

import {
	prepareMcpRegistryConnection,
	toAgentMcpTransport,
} from '@/modules/mcp-registry/mcp-registry-connection';
import type { OauthService } from '@/oauth/oauth.service';
import {
	type AuthFetchDomainPolicy,
	createAuthFetch,
	getBearerTokenRevision,
	resolveAllowedDomains,
} from '@/utils/auth-fetch';

/**
 * Convert the JSON-config `approval` shape into the SDK's `requireApproval`
 * field. The two representations carry the same semantics:
 *
 * - `undefined`            -> `undefined`   (no per-server approval)
 * - `{ mode: 'global' }`   -> `true`        (every tool requires approval)
 * - `{ mode: 'selected' }` -> `string[]`    (only listed tools require approval)
 */
export function mapApprovalToSdk(
	approval: AgentJsonMcpServerConfig['approval'],
): McpServerConfig['requireApproval'] {
	if (!approval) return undefined;
	if (approval.mode === 'global') return true;
	return approval.tools;
}

type DerivedAuth = {
	headers: Record<string, string>;
	credentialData?: ICredentialDataDecryptedObject;
	credentialType?: string;
	/** Set when the credential could not be resolved (e.g. unreachable secret store). */
	credentialError?: Error;
};

/**
 * Derive static (non-OAuth2) auth headers from a credential resolved through
 * the agents `CredentialProvider`. Mirrors the shape of `getAuthHeaders` in
 * the langchain MCP node — kept inline here so the agents module does not
 * have to depend on `@n8n/nodes-langchain`.
 *
 * For any supported OAuth2 credential type, the Bearer header is computed from
 * the already-stored `oauthTokenData.access_token`. `createAuthFetch` refreshes
 * the token before expiry and after a 401 response.
 */
async function deriveAuthHeaders(
	server: AgentJsonMcpServerConfig,
	credentialProvider: CredentialProvider,
): Promise<DerivedAuth> {
	if (server.authentication === 'none' || !server.credential) return { headers: {} };

	try {
		const [resolved, credentials] = await Promise.all([
			credentialProvider.resolve(server.credential),
			credentialProvider.list(),
		]);
		const credential = credentials?.find((candidate) => candidate.id === server.credential);
		if (credentials !== undefined && !credential) {
			throw new OperationalError('Credential not found or not accessible');
		}
		const credentialData = resolved as ICredentialDataDecryptedObject;
		return {
			headers: getMcpAuthHeaders(server.authentication, credentialData),
			credentialData,
			credentialType: credential?.type ?? server.authentication,
		};
	} catch (error) {
		return { headers: {}, credentialError: ensureError(error) };
	}
}

function isNativeOAuth2Credential(authentication: string): boolean {
	return (
		isMcpOAuth2Authentication(authentication) &&
		authentication !== 'mcpOAuth2Api' &&
		!authentication.endsWith('McpOAuth2Api')
	);
}

function resolveMcpDomainPolicy(
	server: AgentJsonMcpServerConfig,
	credentialData: ICredentialDataDecryptedObject,
	mcpHostname: string | undefined,
): AuthFetchDomainPolicy | undefined {
	if (!isNativeOAuth2Credential(server.authentication) || !mcpHostname) {
		return resolveAllowedDomains(credentialData);
	}

	switch (credentialData.allowedHttpRequestDomains) {
		case 'domains':
			return resolveAllowedDomains(credentialData);
		case 'all':
			return undefined;
		default:
			return { mode: 'domains', domains: mcpHostname };
	}
}

export interface BuildMcpClientDeps {
	credentialProvider: CredentialProvider;
	resolveRegistryConnection?: (nodeTypeName: string) => Promise<McpRegistryConnection | undefined>;
	/**
	 * Used to refresh OAuth2 tokens before expiry or after a 401 response without an
	 * `IExecuteFunctions` workflow context. Only invoked when
	 * `server.authentication` is a supported OAuth2 credential type.
	 */
	oauthService: OauthService;
	projectId: string;
	proxyFetch: CustomFetch;
	/**
	 * Optional observer invoked when this server fails to connect. The
	 * server's tools are skipped for the run; the run continues with the
	 * remaining servers' tools. Used for logging/telemetry — the user-facing
	 * warning is emitted from the agent runtime as a `warning` stream chunk.
	 */
	onConnectionFailed?: (event: { server: string; error: string }) => void;
	onToolCallSettled?: McpServerConfig['onToolCallSettled'];
}

/** Stand-in for a URL that could not be built. `.invalid` never resolves (RFC 2606), and `authFetch` rejects before any request is sent. */
const UNRESOLVED_CREDENTIAL_URL = 'https://credential-unresolved.invalid/';

/**
 * Build a connected-but-lazy SDK `McpClient` for a single JSON-config MCP
 * server entry. The returned client opens its transport on first use
 * (`agent.mcp(client)` → `client.listTools()` during agent run).
 *
 * Callers are responsible for keeping the returned client referenced for the
 * lifetime of the runtime and calling `.close()` when the runtime is evicted.
 */
export async function buildMcpClientForServer(
	server: AgentJsonMcpServerConfig,
	deps: BuildMcpClientDeps,
): Promise<McpClient> {
	const {
		credentialProvider,
		oauthService,
		projectId,
		proxyFetch,
		onConnectionFailed,
		onToolCallSettled,
	} = deps;
	const { McpClient } = await import('@n8n/agents');

	const derivedAuth = await deriveAuthHeaders(server, credentialProvider);
	const { credentialData, credentialType } = derivedAuth;
	let { headers: initialHeaders, credentialError } = derivedAuth;
	let runtimeUrl = server.url;
	let runtimeTransport = server.transport;
	const nativeMcpHostname =
		isNativeOAuth2Credential(server.authentication) && URL.canParse(server.url)
			? new URL(server.url).hostname
			: undefined;
	let allowedDomains = credentialData
		? resolveMcpDomainPolicy(server, credentialData, nativeMcpHostname)
		: undefined;

	const registryNodeName = server.metadata?.nodeTypeName;
	if (!registryNodeName && credentialType?.endsWith('McpOAuth2Api')) {
		credentialError = new OperationalError(
			`Credential type "${credentialType}" requires an MCP registry node`,
		);
	} else if (registryNodeName) {
		try {
			const connection = await deps.resolveRegistryConnection?.(registryNodeName);
			if (
				!connection ||
				!credentialData ||
				!credentialType ||
				!isMcpOAuth2Authentication(credentialType)
			) {
				throw new OperationalError('MCP registry connection could not be resolved');
			}
			const prepared = prepareMcpRegistryConnection({
				connection,
				credentialType,
				credentialData,
			});
			if (!prepared.ok) throw new OperationalError(prepared.error.message);
			initialHeaders = prepared.value.headers;
			runtimeUrl = prepared.value.endpointUrl;
			runtimeTransport = toAgentMcpTransport(prepared.value.transport);
			allowedDomains = { mode: 'domains', domains: prepared.value.allowedDomains };
		} catch (error) {
			credentialError = ensureError(error);
		}
	}

	const oauthTokenData = isRecord(credentialData?.oauthTokenData)
		? { ...credentialData.oauthTokenData }
		: undefined;
	const grantType = credentialData?.grantType;
	const refreshAuthHeaders =
		isMcpOAuth2Authentication(server.authentication) && server.credential
			? async (currentHeaders: Record<string, string>) => {
					const credentialId = server.credential;
					if (!credentialId) return null;
					const result = await oauthService.refreshOAuth2CredentialById(
						credentialId,
						projectId,
						getBearerTokenRevision(currentHeaders, oauthTokenData?.n8n_expires_at),
					);
					if (!result) return null;

					if (oauthTokenData) {
						if (result.expiresAt === undefined) {
							delete oauthTokenData.n8n_expires_at;
						} else {
							oauthTokenData.n8n_expires_at = String(result.expiresAt);
						}
						if (result.expiresInSeconds === undefined) {
							delete oauthTokenData.expires_in;
						} else {
							oauthTokenData.expires_in = result.expiresInSeconds;
						}
					}

					return result.headers;
				}
			: undefined;

	// An unresolved credential fails at connect time so the real reason travels
	// the SDK's connection-failure channel (surfaced as a `warning` chunk);
	// connecting unauthenticated returns an opaque 401/403 instead.
	//
	// The url and the fetch are chosen together on purpose. A templated registry
	// URL is still an unresolved `$self`-expression when the credential fails,
	// and the SDK rejects that URL before it ever calls fetch, so the real cause
	// would be replaced by an opaque "Invalid URL". The placeholder keeps the
	// connect on the path where the rejecting fetch reports the real reason, and
	// is only ever paired with that fetch, which sends no request.
	const { url, fetch: authFetch } = credentialError
		? {
				url: UNRESOLVED_CREDENTIAL_URL,
				// Rejecting rather than throwing keeps both `promise-function-async`
				// and `require-await` satisfied.
				fetch: (async () =>
					await Promise.reject(
						new OperationalError(
							`Could not resolve the credential for MCP server "${server.name}": ${credentialError.message}`,
						),
					)) as typeof fetch,
			}
		: {
				url: runtimeUrl,
				fetch: createAuthFetch({
					baseFetch: proxyFetch,
					initialHeaders,
					onUnauthorized: refreshAuthHeaders,
					...(refreshAuthHeaders
						? { shouldRefresh: () => shouldRefreshMcpOAuth2Token(oauthTokenData, grantType) }
						: {}),
					allowedDomains,
				}),
			};

	const sdkServerConfig: McpServerConfig = {
		name: server.name,
		url,
		transport: runtimeTransport,
		fetch: authFetch,
		toolFilter: server.toolFilter,
		requireApproval: mapApprovalToSdk(server.approval),
		...(onToolCallSettled !== undefined && { onToolCallSettled }),
		...(server.connectionTimeoutMs !== undefined && {
			connectionTimeoutMs: server.connectionTimeoutMs,
		}),
		...(onConnectionFailed
			? {
					onConnectionFailed: (event: { server: string; error: string }) =>
						onConnectionFailed(event),
				}
			: {}),
	};

	return new McpClient([sdkServerConfig]);
}

/**
 * Connect to an MCP server, list its tools, and close the connection.
 * Verification handshake for the instance MCP's verify-server tool.
 */
export async function listMcpServerTools(
	server: AgentJsonMcpServerConfig,
	deps: BuildMcpClientDeps,
): Promise<Array<{ name: string; description: string }>> {
	let client: McpClient | undefined;
	try {
		client = await buildMcpClientForServer(server, deps);
		const tools = await client.listTools();
		return tools.map((tool) => ({ name: tool.name, description: tool.description ?? '' }));
	} finally {
		await client?.close().catch(() => {});
	}
}
