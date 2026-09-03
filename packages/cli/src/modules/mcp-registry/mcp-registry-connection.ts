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
		server.remotes.find(
			({ type }) => type === 'streamable-http' || type === 'streamable-http-templated',
		) ?? server.remotes.find(({ type }) => type === 'sse');
	if (!remote) return null;

	const nodeTypeName = `${MCP_REGISTRY_PACKAGE_NAME}.${camelCase(server.slug)}`;
	const credentialType = getMcpRegistryCredentialTypeName(server);

	// A templated remote's url is an unresolved `$self`-expression, not a
	// literal URL, resolves per-credential once `prepareMcpRegistryConnection`
	// has the decrypted credential data.
	if (remote.type === 'streamable-http-templated') {
		return {
			nodeTypeName,
			credentialType,
			endpointUrl: remote.url,
			endpointHostname: '',
			transport: 'httpStreamable',
			isTemplated: true,
		};
	}

	try {
		const endpoint = new URL(remote.url);
		return {
			nodeTypeName,
			credentialType,
			endpointUrl: endpoint.toString(),
			endpointHostname: endpoint.hostname,
			transport: remote.type === 'streamable-http' ? 'httpStreamable' : 'sse',
			isTemplated: false,
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

	if (connection.isTemplated) {
		const serverUrl = credentialData.serverUrl;
		if (typeof serverUrl !== 'string' || serverUrl.length === 0) {
			return {
				ok: false,
				error: {
					code: 'unresolved_server_url',
					message: `Credential type "${connection.credentialType}" did not resolve a server URL`,
				},
			};
		}
		const allowedDomains =
			typeof credentialData.allowedDomains === 'string' ? credentialData.allowedDomains : '';
		return {
			ok: true,
			value: { ...connection, endpointUrl: serverUrl, headers, allowedDomains },
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
