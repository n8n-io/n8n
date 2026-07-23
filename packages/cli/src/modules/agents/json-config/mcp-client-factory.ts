import type { CredentialProvider, McpClient, McpServerConfig } from '@n8n/agents';
import type { AgentJsonMcpServerConfig } from '@n8n/api-types';
import type { CustomFetch } from '@n8n/backend-network';
import { isMcpOAuth2Authentication } from 'n8n-workflow';
import type { ICredentialDataDecryptedObject } from 'n8n-workflow';

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

function isTokenData(tokenData: unknown): tokenData is { access_token: string } {
	return (
		typeof tokenData === 'object' &&
		tokenData !== null &&
		'access_token' in tokenData &&
		typeof tokenData.access_token === 'string'
	);
}

type DerivedAuth = {
	headers: Record<string, string>;
	credentialData?: ICredentialDataDecryptedObject;
};

function withCredentialData(
	headers: Record<string, string>,
	credentialData: ICredentialDataDecryptedObject,
): DerivedAuth {
	return { headers, credentialData };
}

function deriveOAuth2Headers(
	resolved: ICredentialDataDecryptedObject,
	credentialData: ICredentialDataDecryptedObject,
): DerivedAuth {
	const tokenData = resolved.oauthTokenData as { access_token: string } | null | undefined;
	return withCredentialData(
		isTokenData(tokenData) ? { Authorization: `Bearer ${tokenData.access_token}` } : {},
		credentialData,
	);
}

function deriveBearerHeaders(
	resolved: ICredentialDataDecryptedObject,
	credentialData: ICredentialDataDecryptedObject,
): DerivedAuth {
	const token = typeof resolved.token === 'string' ? resolved.token : '';
	return withCredentialData(token ? { Authorization: `Bearer ${token}` } : {}, credentialData);
}

function deriveHeaderAuthHeaders(
	resolved: ICredentialDataDecryptedObject,
	credentialData: ICredentialDataDecryptedObject,
): DerivedAuth {
	const name = typeof resolved.name === 'string' ? resolved.name : '';
	const value = typeof resolved.value === 'string' ? resolved.value : '';
	return withCredentialData(name && value ? { [name]: value } : {}, credentialData);
}

function readMultipleHeaderValues(
	headers: unknown,
): Array<{ name?: unknown; value?: unknown }> | undefined {
	if (
		!headers ||
		typeof headers !== 'object' ||
		!('values' in headers) ||
		!Array.isArray((headers as { values: unknown }).values)
	) {
		return undefined;
	}

	return (headers as { values: Array<{ name?: unknown; value?: unknown }> }).values;
}

function deriveMultipleHeadersAuthHeaders(
	resolved: ICredentialDataDecryptedObject,
	credentialData: ICredentialDataDecryptedObject,
): DerivedAuth {
	const values = readMultipleHeaderValues(resolved.headers);
	if (!values) return withCredentialData({}, credentialData);

	const headers: Record<string, string> = {};
	for (const entry of values) {
		if (typeof entry.name === 'string' && typeof entry.value === 'string') {
			headers[entry.name] = entry.value;
		}
	}
	return withCredentialData(headers, credentialData);
}

function deriveHeadersForAuthentication(
	server: AgentJsonMcpServerConfig,
	resolved: ICredentialDataDecryptedObject,
	credentialData: ICredentialDataDecryptedObject,
): DerivedAuth {
	if (isMcpOAuth2Authentication(server.authentication)) {
		return deriveOAuth2Headers(resolved, credentialData);
	}

	switch (server.authentication) {
		case 'bearerAuth':
			return deriveBearerHeaders(resolved, credentialData);
		case 'headerAuth':
			return deriveHeaderAuthHeaders(resolved, credentialData);
		case 'multipleHeadersAuth':
			return deriveMultipleHeadersAuthHeaders(resolved, credentialData);
		default:
			return withCredentialData({}, credentialData);
	}
}

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

	const resolved = await credentialProvider.resolve(server.credential).catch(() => null);
	if (!resolved) return { headers: {} };

	const credentialData = resolved as ICredentialDataDecryptedObject;
	return deriveHeadersForAuthentication(server, credentialData, credentialData);
}

export interface BuildMcpClientDeps {
	credentialProvider: CredentialProvider;
	/**
	 * Used to refresh OAuth2 tokens on a 401 response without an
	 * `IExecuteFunctions` workflow context. Only invoked when
	 * `server.authentication` is any `*McpOAuth2Api` credential type.
	 */
	oauthService: OauthService;
	projectId: string;
	proxyFetch: CustomFetch;
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
	const { credentialProvider, oauthService, projectId, proxyFetch } = deps;
	const { McpClient } = await import('@n8n/agents');

	const { headers: initialHeaders, credentialData } = await deriveAuthHeaders(
		server,
		credentialProvider,
	);
	const allowedDomains = credentialData ? resolveAllowedDomains(credentialData) : undefined;

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

	const authFetch = createAuthFetch({
		baseFetch: proxyFetch,
		initialHeaders,
		onUnauthorized,
		allowedDomains,
	});

	const sdkServerConfig: McpServerConfig = {
		name: server.name,
		url: server.url,
		transport: server.transport,
		fetch: authFetch,
		toolFilter: server.toolFilter,
		requireApproval: mapApprovalToSdk(server.approval),
		...(server.connectionTimeoutMs !== undefined && {
			connectionTimeoutMs: server.connectionTimeoutMs,
		}),
	};

	return new McpClient([sdkServerConfig]);
}
