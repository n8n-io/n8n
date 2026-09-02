import type { CredentialProvider, McpClient, McpServerConfig } from '@n8n/agents';
import type { AgentJsonMcpServerConfig } from '@n8n/api-types';
import type { CustomFetch } from '@n8n/backend-network';
import { ensureError } from '@n8n/utils/errors/ensure-error';
import { getMcpAuthHeaders, isMcpOAuth2Authentication, OperationalError } from 'n8n-workflow';
import type { ICredentialDataDecryptedObject, McpRegistryConnection } from 'n8n-workflow';

import {
	prepareMcpRegistryConnection,
	toAgentMcpTransport,
} from '@/modules/mcp-registry/mcp-registry-connection';
import type { OauthService } from '@/oauth/oauth.service';
import { createAuthFetch, resolveAllowedDomains } from '@/utils/auth-fetch';

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
	/** Set when the credential could not be resolved (e.g. unreachable secret store). */
	credentialError?: Error;
};

/**
 * Derive static (non-OAuth2) auth headers from a credential resolved through
 * the agents `CredentialProvider`. Mirrors the shape of `getAuthHeaders` in
 * the langchain MCP node — kept inline here so the agents module does not
 * have to depend on `@n8n/nodes-langchain`.
 *
 * For any `*McpOAuth2Api` credential type, the Bearer header is computed from
 * the already-stored `oauthTokenData.access_token`. Refresh-on-401 is handled
 * by `createAuthFetch` below; this function only computes the initial set.
 */
async function deriveAuthHeaders(
	server: AgentJsonMcpServerConfig,
	credentialProvider: CredentialProvider,
): Promise<DerivedAuth> {
	if (server.authentication === 'none' || !server.credential) return { headers: {} };

	try {
		const resolved = (await credentialProvider.resolve(
			server.credential,
		)) as ICredentialDataDecryptedObject;
		return {
			headers: getMcpAuthHeaders(server.authentication, resolved),
			credentialData: resolved,
		};
	} catch (error) {
		return { headers: {}, credentialError: ensureError(error) };
	}
}

export interface BuildMcpClientDeps {
	credentialProvider: CredentialProvider;
	resolveRegistryConnection?: (nodeTypeName: string) => Promise<McpRegistryConnection | undefined>;
	/**
	 * Used to refresh OAuth2 tokens on a 401 response without an
	 * `IExecuteFunctions` workflow context. Only invoked when
	 * `server.authentication` is any `*McpOAuth2Api` credential type.
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
	const { credentialData } = derivedAuth;
	let { headers: initialHeaders, credentialError } = derivedAuth;
	let runtimeUrl = server.url;
	let runtimeTransport = server.transport;
	let allowedDomains = credentialData ? resolveAllowedDomains(credentialData) : undefined;

	const registryNodeName = server.metadata?.nodeTypeName;
	if (!registryNodeName && server.authentication.endsWith('McpOAuth2Api')) {
		credentialError = new OperationalError(
			`Credential type "${server.authentication}" requires an MCP registry node`,
		);
	} else if (registryNodeName) {
		try {
			const connection = await deps.resolveRegistryConnection?.(registryNodeName);
			if (!connection || !credentialData || connection.credentialType !== server.authentication) {
				throw new OperationalError('MCP registry connection could not be resolved');
			}
			const prepared = prepareMcpRegistryConnection({
				connection,
				credentialData,
				headers: initialHeaders,
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

	const onUnauthorized =
		isMcpOAuth2Authentication(server.authentication) && server.credential
			? async () => {
					const credentialId = server.credential;
					if (!credentialId) return null;
					return await oauthService
						.refreshOAuth2CredentialById(credentialId, projectId)
						.catch(() => null);
				}
			: undefined;

	// An unresolved credential fails at connect time so the real reason travels
	// the SDK's connection-failure channel (surfaced as a `warning` chunk);
	// connecting unauthenticated returns an opaque 401/403 instead. Rejecting
	// rather than throwing keeps both `promise-function-async` and
	// `require-await` satisfied.
	const authFetch: typeof fetch = credentialError
		? async () =>
				await Promise.reject(
					new OperationalError(
						`Could not resolve the credential for MCP server "${server.name}": ${credentialError.message}`,
					),
				)
		: createAuthFetch({
				baseFetch: proxyFetch,
				initialHeaders,
				onUnauthorized,
				allowedDomains,
			});

	const sdkServerConfig: McpServerConfig = {
		name: server.name,
		url: runtimeUrl,
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
