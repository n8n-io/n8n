import { camelCase } from 'change-case';
import {
	getConfiguredEndpointUrl,
	getMcpAuthHeaders,
	type ICredentialTypes,
	isMcpAiGatewayAuthentication,
	isMcpOAuth2Authentication,
	isMcpRegistryAuthentication,
	type McpAiGatewayCredentialType,
	type McpOAuth2CredentialType,
	type McpRegistryConnection,
	type McpRegistryCredentialBinding,
	type PrepareMcpRegistryConnectionInput,
	type PrepareMcpRegistryConnectionResult,
} from 'n8n-workflow';

import type { McpRegistryServer, McpRegistryUsesCredential } from './registry/mcp-registry.types';
import { AI_GATEWAY_MANAGED_AUTH_TYPE } from './registry/mcp-registry.types';

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

/** Takes a slug, not a server, because a registry server can offer the type of another row. */
export function getMcpRegistryAiGatewayCredentialTypeName(
	slug: string,
): McpAiGatewayCredentialType {
	return `${camelCase(slug)}McpAiGatewayApi`;
}

/** The credential type of the connection's Gateway credits option, if it has one. */
export function findAiGatewayCredentialType(
	connection: McpRegistryConnection,
): McpAiGatewayCredentialType | undefined {
	return connection.credentialBindings
		.map((binding) => binding.credentialType)
		.find(isMcpAiGatewayAuthentication);
}

function getAiGatewayCredentialOption(slug: string): McpRegistryUsesCredential {
	return {
		credentialType: getMcpRegistryAiGatewayCredentialTypeName(slug),
		name: 'Gateway credits',
		value: 'aiGateway',
	};
}

export function getMcpRegistryCredentialOptions(
	server: McpRegistryServer,
): McpRegistryUsesCredential[] {
	if (server.authType === AI_GATEWAY_MANAGED_AUTH_TYPE) {
		return [getAiGatewayCredentialOption(server.slug)];
	}
	// Last, because the first option is the node default and saved workflows omit defaults.
	if (server.aiGateway) {
		const ownOptions = getMcpRegistryCredentialOptions({ ...server, aiGateway: undefined });
		return [...ownOptions, getAiGatewayCredentialOption(server.aiGateway.slug)];
	}
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

/** A paired server's AI Gateway option connects to the AI Gateway, not to the server's own remote. */
function getBindingEndpoint(
	server: McpRegistryServer,
	credentialType: string,
): Pick<McpRegistryCredentialBinding, 'endpoint'> {
	return server.aiGateway && isMcpAiGatewayAuthentication(credentialType)
		? { endpoint: server.aiGateway.endpoint }
		: {};
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
			isMcpRegistryAuthentication(credentialType)
				? [{ credentialType, selector: value, ...getBindingEndpoint(server, credentialType) }]
				: [],
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
			headers: remote.headers,
			attribution: server.attribution,
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
			headers: remote.headers,
			attribution: server.attribution,
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
	const binding = connection.credentialBindings.find(
		(candidate) => candidate.credentialType === credentialType,
	);
	if (!binding) {
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
				message: isMcpAiGatewayAuthentication(credentialType)
					? `Credential type "${credentialType}" does not contain a Gateway credits token`
					: `Credential type "${credentialType}" does not contain an OAuth2 access token`,
			},
		};
	}

	const { nodeTypeName, transport } = connection;

	if (binding.endpoint) {
		// The row's own headers are for the row's server, not for the AI Gateway.
		return {
			ok: true,
			value: {
				nodeTypeName,
				credentialType,
				transport: binding.endpoint.transport,
				endpointUrl: binding.endpoint.url,
				headers,
				allowedDomains: binding.endpoint.hostname,
			},
		};
	}

	// Credential headers win over registry-configured ones on a name clash
	const mergedHeaders = { ...connection.headers, ...headers };

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
				headers: mergedHeaders,
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
			headers: mergedHeaders,
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
