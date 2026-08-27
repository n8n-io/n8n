import { camelCase } from 'change-case';
import { getMcpAuthHeaders } from 'n8n-workflow';
import type {
	McpOAuth2CredentialType,
	McpRegistryConnection,
	PrepareMcpRegistryConnectionInput,
	PrepareMcpRegistryConnectionResult,
} from 'n8n-workflow';

import { MCP_REGISTRY_PACKAGE_NAME } from './mcp-registry.constants';
import type { McpRegistryServer } from './registry/mcp-registry.types';

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
		if (
			endpoint.protocol !== 'https:' ||
			!endpoint.hostname ||
			endpoint.username ||
			endpoint.password
		) {
			return null;
		}

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
}: PrepareMcpRegistryConnectionInput): PrepareMcpRegistryConnectionResult {
	const headers = getMcpAuthHeaders(connection.credentialType, credentialData);
	if (!headers.authorization) {
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
