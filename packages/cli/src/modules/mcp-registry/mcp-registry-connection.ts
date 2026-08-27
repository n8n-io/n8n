import { camelCase } from 'change-case';
import {
	getMcpAuthHeaders,
	type McpOAuth2CredentialType,
	type McpRegistryConnection,
	type PrepareMcpRegistryConnectionInput,
	type PrepareMcpRegistryConnectionResult,
} from 'n8n-workflow';

import type { McpRegistryServer } from './registry/mcp-registry.types';

export const MCP_REGISTRY_PACKAGE_NAME = '@n8n/mcp-registry';
export const LANGCHAIN_PACKAGE_NAME = '@n8n/n8n-nodes-langchain';
export const MCP_REGISTRY_BASE_NODE_NAME = 'mcpRegistryClientTool';
export const MCP_BASE_OAUTH2_CREDENTIAL_NAME = 'mcpOAuth2Api';

export function getMcpRegistryCredentialTypeName(
	server: McpRegistryServer,
): McpOAuth2CredentialType {
	return `${camelCase(server.slug)}McpOAuth2Api`;
}

export function resolveMcpRegistryConnection(
	server: McpRegistryServer,
): McpRegistryConnection | null {
	const remote =
		server.remotes.find(({ type }) => type === 'streamable-http') ??
		server.remotes.find(({ type }) => type === 'sse');
	if (!remote) return null;

	try {
		const endpoint = new URL(remote.url);
		return {
			nodeTypeName: `${MCP_REGISTRY_PACKAGE_NAME}.${camelCase(server.slug)}`,
			credentialType: getMcpRegistryCredentialTypeName(server),
			endpointUrl: endpoint.toString(),
			endpointHostname: endpoint.hostname,
			transport: remote.type === 'streamable-http' ? 'httpStreamable' : 'sse',
		};
	} catch {
		return null;
	}
}

export function prepareMcpRegistryConnection({
	connection,
	credentialData,
	headers: preparedHeaders,
}: PrepareMcpRegistryConnectionInput): PrepareMcpRegistryConnectionResult {
	const headers = preparedHeaders ?? getMcpAuthHeaders(connection.credentialType, credentialData);
	const authorization = new Headers(headers).get('authorization')?.trim();
	const [scheme, accessToken] = authorization?.split(/\s+/, 2) ?? [];
	if (scheme?.toLowerCase() !== 'bearer' || !accessToken) {
		return {
			ok: false,
			error: {
				code: 'missing_access_token',
				message: `Credential type "${connection.credentialType}" does not contain an OAuth2 access token`,
			},
		};
	}

	return {
		ok: true,
		value: {
			...connection,
			headers,
			allowedDomains: connection.endpointHostname,
		},
	};
}

export function toAgentMcpTransport(
	transport: McpRegistryConnection['transport'],
): 'streamableHttp' | 'sse' {
	return transport === 'httpStreamable' ? 'streamableHttp' : 'sse';
}
