import { camelCase } from 'change-case';
import {
	getConfiguredEndpointUrl,
	getMcpAuthHeaders,
	type ICredentialTypes,
	isMcpOAuth2Authentication,
	type McpOAuth2CredentialType,
	type McpRegistryConnection,
	type PrepareMcpRegistryConnectionInput,
	type PrepareMcpRegistryConnectionResult,
} from 'n8n-workflow';

import type { McpRegistryServer, McpRegistryUsesCredential } from './registry/mcp-registry.types';

export { getConfiguredEndpointUrl };

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
		server.remotes.find(
			({ type }) => type === 'streamable-http' || type === 'streamable-http-templated',
		) ?? server.remotes.find(({ type }) => type === 'sse');
	if (!remote) return null;

	const nodeTypeName = `${MCP_REGISTRY_PACKAGE_NAME}.${camelCase(server.slug)}`;
	const credentialBindings = getMcpRegistryCredentialOptions(server).flatMap(
		({ credentialType, value }) =>
			isMcpOAuth2Authentication(credentialType) ? [{ credentialType, selector: value }] : [],
	);

	// A templated remote's url is an unresolved `$self`-expression, not a
	// literal URL, resolves per-credential once `prepareMcpRegistryConnection`
	// has the decrypted credential data.
	if (remote.type === 'streamable-http-templated') {
		return {
			nodeTypeName,
			credentialBindings,
			urlTemplate: remote.url,
			transport: 'httpStreamable',
			isTemplated: true,
		};
	}

	try {
		const endpoint = new URL(remote.url);
		return {
			nodeTypeName,
			endpointUrl: endpoint.toString(),
			endpointHostname: endpoint.hostname,
			transport: remote.type === 'streamable-http' ? 'httpStreamable' : 'sse',
			credentialBindings,
			isTemplated: false,
		};
	} catch {
		return null;
	}
}

export function prepareMcpRegistryConnection({
	connection,
	credentialType,
	credentialData,
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

	const headers = preparedHeaders ?? getMcpAuthHeaders(credentialType, credentialData);
	const authorization = new Headers(headers).get('authorization')?.trim();
	const [scheme, accessToken] = authorization?.split(/\s+/, 2) ?? [];
	if (scheme?.toLowerCase() !== 'bearer' || !accessToken) {
		return {
			ok: false,
			error: {
				code: 'missing_access_token',
				message: `Credential type "${credentialType}" does not contain an OAuth2 access token`,
			},
		};
	}

	const { nodeTypeName, transport } = connection;

	if (connection.isTemplated) {
		const serverUrl = credentialData.serverUrl;
		// An unresolved expression is still a non-empty string, so the URL has to
		// be parsed here. Otherwise it travels on and fails far from its cause.
		const endpoint =
			typeof serverUrl === 'string' && serverUrl.length > 0 ? parseUrl(serverUrl) : undefined;
		if (!endpoint) {
			return {
				ok: false,
				error: {
					code: 'unresolved_server_url',
					message: `Credential type "${credentialType}" did not resolve a server URL`,
				},
			};
		}
		return {
			ok: true,
			value: {
				nodeTypeName,
				credentialType,
				transport,
				endpointUrl: endpoint.toString(),
				headers,
				// Pinned to the host actually being called, so the restriction can
				// never guard a different host than the request goes to.
				allowedDomains: endpoint.hostname,
			},
		};
	}

	return {
		ok: true,
		value: {
			nodeTypeName,
			credentialType,
			transport,
			endpointUrl: connection.endpointUrl,
			headers,
			allowedDomains: connection.endpointHostname,
		},
	};
}

function parseUrl(value: string): URL | undefined {
	try {
		const url = new URL(value);
		return /^https?:$/.test(url.protocol) ? url : undefined;
	} catch {
		return undefined;
	}
}

export function toAgentMcpTransport(
	transport: McpRegistryConnection['transport'],
): 'streamableHttp' | 'sse' {
	return transport === 'httpStreamable' ? 'streamableHttp' : 'sse';
}
