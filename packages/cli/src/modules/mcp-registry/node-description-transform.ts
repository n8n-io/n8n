import { camelCase } from 'change-case';
import type {
	ICredentialType,
	INodeCredentialDescription,
	INodeProperties,
	INodeTypeDescription,
	Themed,
} from 'n8n-workflow';

import {
	mcpRegistryExtendsCredentialSchema,
	type McpRegistryIcon,
	type McpRegistryServer,
} from './registry/mcp-registry.types';

export const MCP_REGISTRY_PACKAGE_NAME = '@n8n/mcp-registry';
export const LANGCHAIN_PACKAGE_NAME = '@n8n/n8n-nodes-langchain';
export const MCP_REGISTRY_BASE_NODE_NAME = 'mcpRegistryClientTool';
export const MCP_BASE_OAUTH2_CREDENTIAL_NAME = 'mcpOAuth2Api';

/**
 * Get node type name based on server's slug
 */
function getMcpRegistryNodeTypeName(server: McpRegistryServer): string {
	return camelCase(server.slug);
}

/**
 * Get credentials type name based on server's slug and auth type
 */
function getMcpRegistryCredentialTypeName(server: McpRegistryServer): string {
	// for now we support only OAuth2, so the suffix is always `McpOAuth2Api`
	return `${camelCase(server.slug)}McpOAuth2Api`;
}

/**
 * Shared identity fields for every synthetic credential the registry produces.
 */
function getMcpRegistryCredentialHeader(server: McpRegistryServer): {
	name: string;
	icon: string;
	displayName: string;
} {
	return {
		name: getMcpRegistryCredentialTypeName(server),
		icon: `node:${MCP_REGISTRY_PACKAGE_NAME}.${getMcpRegistryNodeTypeName(server)}`,
		displayName: `${server.title} MCP OAuth2`,
	};
}

/**
 * Registry MCP server → service-specific credential type for OAuth2 auth type
 */
function serverToOAuth2CredentialDescription(server: McpRegistryServer): ICredentialType | null {
	const remote = pickRemote(server);
	if (!remote) return null;

	let hostname: string;
	try {
		const url = new URL(remote.endpointUrl);
		hostname = url.hostname;
	} catch {
		return null;
	}

	return {
		...getMcpRegistryCredentialHeader(server),
		extends: [MCP_BASE_OAUTH2_CREDENTIAL_NAME],
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
			},
			{
				displayName: 'Allowed HTTP Request Domains',
				name: 'allowedHttpRequestDomains',
				type: 'hidden',
				default: 'domains',
			},
			{
				displayName: 'Allowed Domains',
				name: 'allowedDomains',
				type: 'hidden',
				default: hostname,
			},
		],
	};
}

/**
 * Parses and validates `server.extendsCredential`, applies the
 * known-credential predicate, and strips null/undefined override values.
 * Returns null when the payload is missing, fails validation, or the parent
 * type is not registered.
 */
function classifyExtendsCredential(
	server: McpRegistryServer,
	isKnownCredentialType?: (name: string) => boolean,
): { parentType: string; overrides: Record<string, unknown>; hasOverrides: boolean } | null {
	if (!server.extendsCredential) return null;

	const parseResult = mcpRegistryExtendsCredentialSchema.safeParse(server.extendsCredential);
	if (!parseResult.success) return null;

	const { extends: parentType, ...rawOverrides } = parseResult.data;
	if (isKnownCredentialType && !isKnownCredentialType(parentType)) return null;

	const overrides: Record<string, unknown> = {};
	for (const [name, value] of Object.entries(rawOverrides)) {
		if (value !== null && value !== undefined) overrides[name] = value;
	}

	return { parentType, overrides, hasOverrides: Object.keys(overrides).length > 0 };
}

/**
 * Registry MCP server → credential extending a known n8n credential type with
 * the values supplied by `extendsCredential`. Returns `null` when the payload
 * is invalid, the parent isn't registered, or there are no overrides to apply
 * (in which case the parent credential is used as-is by the node description).
 */
function serverToExtendedCredentialDescription(
	server: McpRegistryServer,
	isKnownCredentialType?: (name: string) => boolean,
): ICredentialType | null {
	const classified = classifyExtendsCredential(server, isKnownCredentialType);
	if (!classified || !classified.hasOverrides) return null;

	const properties: INodeProperties[] = Object.entries(classified.overrides).map(
		([name, value]) => ({
			displayName: name,
			name,
			type: 'hidden',
			default: value,
		}),
	);

	return {
		...getMcpRegistryCredentialHeader(server),
		extends: [classified.parentType],
		properties,
	};
}

/**
 * Get the `credentials` property for node description based on the server's auth type
 */
function getNodeDescriptionCredentials(
	server: McpRegistryServer,
	isKnownCredentialType?: (name: string) => boolean,
): INodeCredentialDescription[] {
	switch (server.authType) {
		case 'oauth2':
			return [{ name: getMcpRegistryCredentialTypeName(server), required: true }];
		case 'extendsCredential': {
			const classified = classifyExtendsCredential(server, isKnownCredentialType);
			if (!classified) return [];
			const name = classified.hasOverrides
				? getMcpRegistryCredentialTypeName(server)
				: classified.parentType;
			return [{ name, required: true }];
		}
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

const ICON_MIME_PREFERENCE: Array<McpRegistryIcon['mimeType']> = [
	'image/svg+xml',
	'image/webp',
	'image/png',
	'image/jpeg',
	'image/jpg',
];

/**
 * Picks the icon with the most preferred mime type (SVG > WebP > PNG > JPG),
 * falling back to the first icon when no mime type is set.
 */
function preferredIcon(icons: McpRegistryIcon[]): McpRegistryIcon | undefined {
	for (const mimeType of ICON_MIME_PREFERENCE) {
		const match = icons.find((icon) => icon.mimeType === mimeType);
		if (match) return match;
	}
	return icons[0];
}

/**
 * Returns a themed icon URL when both light and dark variants exist,
 * otherwise the URL of the most preferred icon (or undefined when none are provided).
 */
function pickIconUrl(icons: McpRegistryIcon[]): Themed<string> | undefined {
	const light = preferredIcon(icons.filter((icon) => icon.theme === 'light'));
	const dark = preferredIcon(icons.filter((icon) => icon.theme === 'dark'));
	if (light && dark) return { light: light.src, dark: dark.src };
	return preferredIcon(icons)?.src;
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
export function serverToCredentialDescription(
	server: McpRegistryServer,
	isKnownCredentialType?: (name: string) => boolean,
): ICredentialType | null {
	switch (server.authType) {
		case 'oauth2':
			return serverToOAuth2CredentialDescription(server);
		case 'extendsCredential':
			return serverToExtendedCredentialDescription(server, isKnownCredentialType);
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
	isKnownCredentialType?: (name: string) => boolean,
): INodeTypeDescription | null {
	if (server.authType !== 'oauth2' && server.authType !== 'extendsCredential') return null;

	const remote = pickRemote(server);
	if (!remote) return null;

	const displayName = `${server.title} MCP`;
	const description = structuredClone(baseDescription);

	if (server.status === 'deprecated') {
		description.hidden = true;
	} else {
		delete description.hidden;
	}
	description.displayName = displayName;
	description.name = camelCase(server.slug);
	description.iconUrl = pickIconUrl(server.icons);
	description.description = server.tagline;
	description.defaults = { name: displayName };
	description.credentials = getNodeDescriptionCredentials(server, isKnownCredentialType);
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
