import { camelCase } from 'change-case';
import type { ICredentialType, INodeProperties, INodeTypeDescription } from 'n8n-workflow';

import type { McpRegistryServer } from './registry/mcp-registry.types';

export const MCP_REGISTRY_PACKAGE_NAME = '@n8n/mcp-registry';
export const LANGCHAIN_PACKAGE_NAME = '@n8n/n8n-nodes-langchain';
export const MCP_REGISTRY_BASE_NODE_NAME = 'mcpRegistryClientTool';
export const MCP_BASE_OAUTH2_CREDENTIAL_NAME = 'mcpOAuth2Api';

function getMcpRegistryNodeTypeName(server: Pick<McpRegistryServer, 'slug'>): string {
	return camelCase(server.slug);
}

function getMcpRegistryCredentialTypeName(server: Pick<McpRegistryServer, 'slug'>): string {
	return `${camelCase(server.slug)}McpOAuth2Api`;
}

function serverToOAuth2CredentialDescription(server: McpRegistryServer): ICredentialType | null {
	const remote = pickRemote(server);
	if (!remote) return null;

	return {
		name: getMcpRegistryCredentialTypeName(server),
		extends: [MCP_BASE_OAUTH2_CREDENTIAL_NAME],
		icon: `node:${MCP_REGISTRY_PACKAGE_NAME}.${getMcpRegistryNodeTypeName(server)}`,
		displayName: `${server.title} MCP OAuth2`,
		properties: [
			{
				displayName: 'Use Dynamic Client Registration',
				name: 'useDynamicClientRegistration',
				type: 'hidden',
				default: true,
			},
			{
				displayName: 'Server URL',
				name: 'serverUrl',
				type: 'hidden',
				default: remote.endpointUrl,
				required: true,
			},
		],
	};
}

function getNodeDescriptionCredentials(
	server: Pick<McpRegistryServer, 'authType' | 'slug'>,
): INodeTypeDescription['credentials'] {
	switch (server.authType) {
		case 'oauth2':
			return [{ name: getMcpRegistryCredentialTypeName(server), required: true }];
		default:
			return [];
	}
}

/**
 * Pick the connection details from a registry server. Only `streamable-http`
 * and `sse` are supported; `streamable-http` is preferred.
 */
function pickRemote(
	server: McpRegistryServer,
): { transport: 'httpStreamable' | 'sse'; endpointUrl: string } | null {
	const streamable = server.remotes.find((r) => r.type === 'streamable-http');
	if (streamable) return { transport: 'httpStreamable', endpointUrl: streamable.url };

	const sse = server.remotes.find((r) => r.type === 'sse');
	if (sse) return { transport: 'sse', endpointUrl: sse.url };

	return null;
}

/**
 * Patches the `endpointUrl` and `serverTransport` defaults on a cloned property
 * list with the entry's resolved remote, leaving the rest of the runtime's UI
 * surface untouched.
 */
function withRemoteDefaults(
	properties: INodeProperties[],
	transport: 'httpStreamable' | 'sse',
	endpointUrl: string,
): INodeProperties[] {
	return properties.map((prop) => {
		if (prop.name === 'endpointUrl') return { ...prop, default: endpointUrl };
		if (prop.name === 'serverTransport') return { ...prop, default: transport };
		return prop;
	});
}

/**
 * Registry MCP server → service-specific credential type depending on auth type for the server
 */
export function serverToCredentialDescription(server: McpRegistryServer): ICredentialType | null {
	switch (server.authType) {
		case 'oauth2':
			return serverToOAuth2CredentialDescription(server);
		default:
			return null;
	}
}

/**
 * Registry MCP server + runtime base description → synthetic node type
 */
export function serverToNodeDescription(
	server: McpRegistryServer,
	baseDescription: INodeTypeDescription,
): INodeTypeDescription | null {
	if (server.authType !== 'oauth2') return null;

	const remote = pickRemote(server);
	if (!remote) return null;

	const displayName = `${server.title} MCP`;
	const description = structuredClone(baseDescription);

	delete description.hidden;
	description.displayName = displayName;
	description.name = getMcpRegistryNodeTypeName(server);
	description.iconUrl = server.icons[0]?.src;
	description.description = server.description;
	description.defaults = { name: displayName };
	description.credentials = getNodeDescriptionCredentials(server);
	if (description.codex) {
		description.codex.alias?.push(server.title, displayName);
		if (server.websiteUrl) {
			description.codex.resources = { primaryDocumentation: [{ url: server.websiteUrl }] };
		}
	}
	description.properties = withRemoteDefaults(
		description.properties,
		remote.transport,
		remote.endpointUrl,
	);

	return description;
}
