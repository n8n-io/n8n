import { camelCase } from 'change-case';
import {
	getMcpAuthHeaders,
	type ICredentialsHelper,
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
): boolean {
	if (!credentialTypes.recognizes(name)) return false;
	try {
		const credentialType = credentialTypes.getByName(name);
		if (
			isMcpOAuth2Authentication(name) &&
			credentialType.authenticate === undefined &&
			credentialType.preAuthentication === undefined &&
			(name === 'oAuth2Api' || credentialTypes.getParentTypes(name).includes('oAuth2Api'))
		) {
			return true;
		}

		// support only generic credentials for now, without pre-authentication
		// type: 'generic',
		// properties: {
		// 	headers: {
		// 		Authorization: '=Bearer ...',
		// 	},
		// },
		if (
			credentialType.preAuthentication !== undefined ||
			typeof credentialType.authenticate !== 'object' ||
			credentialType.authenticate.type !== 'generic'
		) {
			return false;
		}

		const sections = Object.keys(credentialType.authenticate.properties);
		return sections.length > 0 && sections.every((section) => section === 'headers' || section === 'qs');
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
			credentialBindings: getMcpRegistryCredentialOptions(server).map(
				({ credentialType, value }) => ({ credentialType, selector: value }),
			),
		};
	} catch {
		return null;
	}
}

function toStringRecord(value: unknown): Record<string, string> | null {
	if (value === undefined) return {};
	if (value === null || typeof value !== 'object' || Array.isArray(value)) return null;

	const result: Record<string, string> = {};
	for (const [key, entry] of Object.entries(value)) {
		if (typeof entry !== 'string') return null;
		result[key] = entry;
	}
	return result;
}

export async function prepareMcpRegistryConnection(
	{
		connection,
		credentialType,
		credentialData,
		headers: preparedHeaders,
	}: PrepareMcpRegistryConnectionInput,
	credentialsHelper: Pick<ICredentialsHelper, 'authenticate'>,
): Promise<PrepareMcpRegistryConnectionResult> {
	if (!connection.credentialBindings.some((binding) => binding.credentialType === credentialType)) {
		return {
			ok: false,
			error: {
				code: 'unsupported_credential',
				message: `Credential type "${credentialType}" is not supported by this MCP registry server`,
			},
		};
	}

	if (isMcpOAuth2Authentication(credentialType)) {
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

	// prepare credential data of generic credentials
	const authenticated = await credentialsHelper.authenticate(credentialData, credentialType, {
		url: connection.endpointUrl,
		headers: {},
		qs: {},
	});
	const headers = toStringRecord(authenticated.headers);
	const query = toStringRecord(authenticated.qs);
	if (!headers || !query || (Object.keys(headers).length === 0 && Object.keys(query).length === 0)) {
		return {
			ok: false,
			error: {
				code: 'invalid_authentication',
				message: `Credential type "${credentialType}" did not produce supported MCP authentication`,
			},
		};
	}
	return {
		ok: true,
		value: {
			...connection,
			credentialType,
			headers,
			...(Object.keys(query).length > 0 ? { query } : {}),
			allowedDomains: connection.endpointHostname,
		},
	};
}

export function toAgentMcpTransport(
	transport: McpRegistryConnection['transport'],
): 'streamableHttp' | 'sse' {
	return transport === 'httpStreamable' ? 'streamableHttp' : 'sse';
}
