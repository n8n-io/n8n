import { camelCase } from 'change-case';
import {
	getMcpAuthHeaders,
	type ICredentialTypes,
	isMcpOAuth2Authentication,
	type McpOAuth2CredentialType,
	type McpRegistryConnection,
	type PrepareMcpRegistryConnectionInput,
	type PrepareMcpRegistryConnectionResult,
} from 'n8n-workflow';

import type { McpRegistryServer, McpRegistryUsesCredential } from './registry/mcp-registry.types';

export const MCP_REGISTRY_PACKAGE_NAME = '@n8n/mcp-registry';
export const LANGCHAIN_PACKAGE_NAME = '@n8n/n8n-nodes-langchain';
export const MCP_REGISTRY_BASE_NODE_NAME = 'mcpRegistryClientTool';
export const MCP_BASE_OAUTH2_CREDENTIAL_NAME = 'mcpOAuth2Api';

export function getMcpRegistryCredentialTypeName(
	server: McpRegistryServer,
): McpOAuth2CredentialType {
	return `${camelCase(server.slug)}McpOAuth2Api`;
}

export function getMcpRegistryCredentialOptions(
	server: McpRegistryServer,
): McpRegistryUsesCredential[] {
	if (server.authType === 'usesCredentials') return server.usesCredentials ?? [];
	return [
		{
			credentialType: getMcpRegistryCredentialTypeName(server),
			name: 'OAuth2',
			value: 'oAuth2',
		},
	];
}

export function isSupportedMcpRegistryCredentialType(
	credentialTypes: ICredentialTypes,
	name: string,
): name is McpOAuth2CredentialType {
	if (!credentialTypes.recognizes(name) || !isMcpOAuth2Authentication(name)) return false;
	try {
		const credentialType = credentialTypes.getByName(name);
		return (
			credentialType.authenticate === undefined &&
			credentialType.preAuthentication === undefined &&
			(name === 'oAuth2Api' || credentialTypes.getParentTypes(name).includes('oAuth2Api'))
		);
	} catch {
		return false;
	}
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
			endpointUrl: endpoint.toString(),
			endpointHostname: endpoint.hostname,
			transport: remote.type === 'streamable-http' ? 'httpStreamable' : 'sse',
			credentialBindings: getMcpRegistryCredentialOptions(server).flatMap(
				({ credentialType, value }) =>
					isMcpOAuth2Authentication(credentialType) ? [{ credentialType, selector: value }] : [],
			),
		};
	} catch {
		return null;
	}
}

export function prepareMcpRegistryConnection({
	connection,
	credentialType,
	credentialData,
	oauth2,
	headers: preparedHeaders,
}: PrepareMcpRegistryConnectionInput): PrepareMcpRegistryConnectionResult {
	if (!connection.credentialBindings.some((binding) => binding.credentialType === credentialType)) {
		return {
			ok: false,
			error: {
				code: 'unsupported_credential',
				message: `Credential type "${credentialType}" is not supported by this MCP registry server`,
			},
		};
	}

	const headers = preparedHeaders ?? getMcpAuthHeaders(credentialType, credentialData, oauth2);
	const normalizedHeaders = new Headers(headers);
	const authorization = normalizedHeaders.get('authorization')?.trim();
	const [scheme, accessToken] = authorization?.split(/\s+/, 2) ?? [];
	const expectedTokenType = oauth2?.tokenType ?? 'Bearer';
	if (scheme?.toLowerCase() !== expectedTokenType.toLowerCase() || !accessToken) {
		return {
			ok: false,
			error: {
				code: 'missing_access_token',
				message: `Credential type "${credentialType}" does not contain an OAuth2 access token`,
			},
		};
	}

	return {
		ok: true,
		value: {
			...connection,
			credentialType,
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
