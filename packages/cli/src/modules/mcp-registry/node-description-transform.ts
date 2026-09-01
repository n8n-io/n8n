import { camelCase } from 'change-case';
import type {
	ICredentialType,
	INodeCredentialDescription,
	INodeProperties,
	INodeTypeDescription,
	Themed,
} from 'n8n-workflow';

import {
	getMcpRegistryCredentialTypeName,
	MCP_BASE_OAUTH2_CREDENTIAL_NAME,
	MCP_REGISTRY_PACKAGE_NAME,
	resolveMcpRegistryConnection,
} from './mcp-registry-connection';
import {
	mcpRegistryExtendsCredentialSchema,
	type McpRegistryExtendsCredential,
	type McpRegistryIcon,
	type McpRegistryServer,
} from './registry/mcp-registry.types';

export {
	LANGCHAIN_PACKAGE_NAME,
	MCP_BASE_OAUTH2_CREDENTIAL_NAME,
	MCP_REGISTRY_BASE_NODE_NAME,
	MCP_REGISTRY_PACKAGE_NAME,
} from './mcp-registry-connection';
export { getMcpRegistryCredentialTypeName } from './mcp-registry-connection';

/**
 * Predicate that tells whether a credential type name is registered in the runtime.
 */
export type IsKnownCredentialType = (name: string) => boolean;

/**
 * Get node type name based on server's slug
 */
function getMcpRegistryNodeTypeName(server: McpRegistryServer): string {
	return camelCase(server.slug);
}

/**
 * Shared identity fields for every synthetic credential the registry produces.
 */
function getMcpRegistryCredentialHeader(
	server: McpRegistryServer,
): Pick<ICredentialType, 'name' | 'icon' | 'displayName'> {
	return {
		name: getMcpRegistryCredentialTypeName(server),
		icon: `node:${MCP_REGISTRY_PACKAGE_NAME}.${getMcpRegistryNodeTypeName(server)}`,
		displayName: `${server.title} MCP OAuth2`,
	};
}

/**
 * Picks the server's remote endpoint and parses its hostname.
 */
function resolveCredentialRemote(
	server: McpRegistryServer,
): { endpointUrl: string; hostname: string } | null {
	const connection = resolveMcpRegistryConnection(server);
	return connection
		? { endpointUrl: connection.endpointUrl, hostname: connection.endpointHostname }
		: null;
}

/**
 * Locks the synthetic credential's HTTP requests to the MCP server's hostname.
 */
function buildDomainRestrictionProperties(hostname: string): INodeProperties[] {
	return [
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
	];
}

/**
 * Registry MCP server → service-specific credential type for OAuth2 auth type
 */
function serverToOAuth2CredentialDescription(server: McpRegistryServer): ICredentialType | null {
	const remote = resolveCredentialRemote(server);
	if (!remote) return null;

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
				displayName: 'Resource URL',
				name: 'resourceUrl',
				type: 'hidden',
				default: '',
			},
			...buildDomainRestrictionProperties(remote.hostname),
		],
	};
}

/**
 * Parses `extendsCredential`, applies the predicate, and drops null/undefined override values.
 */
function getValidatedExtendsCredential(
	server: McpRegistryServer,
	isKnownCredentialType: IsKnownCredentialType,
) {
	if (!server.extendsCredential) return null;

	const parseResult = mcpRegistryExtendsCredentialSchema.safeParse(server.extendsCredential);
	if (!parseResult.success) return null;

	const { extends: parentType, ...rawOverrides } = parseResult.data;
	if (!isKnownCredentialType(parentType)) return null;

	const overrides = Object.fromEntries(
		Object.entries(rawOverrides).filter(([, value]) => value !== null && value !== undefined),
	) as Record<
		keyof Omit<McpRegistryExtendsCredential, 'extends'>,
		NonNullable<McpRegistryExtendsCredential[keyof Omit<McpRegistryExtendsCredential, 'extends'>]>
	>;

	return { parentType, overrides };
}

/**
 * Builds a dedicated credential type extending a known n8n credential.
 */
function serverToExtendedCredentialDescription(
	server: McpRegistryServer,
	isKnownCredentialType: IsKnownCredentialType,
): ICredentialType | null {
	const validated = getValidatedExtendsCredential(server, isKnownCredentialType);
	if (!validated) return null;

	const remote = resolveCredentialRemote(server);
	if (!remote) return null;

	const overrideProperties: INodeProperties[] = Object.entries(validated.overrides).map(
		([name, value]) => ({
			displayName: name,
			name,
			type: 'hidden',
			default: value,
		}),
	);

	return {
		...getMcpRegistryCredentialHeader(server),
		extends: [validated.parentType],
		properties: [...overrideProperties, ...buildDomainRestrictionProperties(remote.hostname)],
	};
}

/**
 * Get the `credentials` property for node description based on the server's auth type
 */
function getNodeDescriptionCredentials(
	server: McpRegistryServer,
	isKnownCredentialType: IsKnownCredentialType,
): INodeCredentialDescription[] {
	switch (server.authType) {
		case 'oauth2':
			return [{ name: getMcpRegistryCredentialTypeName(server), required: true }];
		case 'extendsCredential': {
			const validated = getValidatedExtendsCredential(server, isKnownCredentialType);
			if (!validated) return [];
			return [{ name: getMcpRegistryCredentialTypeName(server), required: true }];
		}
		default:
			return [];
	}
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
	isKnownCredentialType: IsKnownCredentialType,
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
	isKnownCredentialType: IsKnownCredentialType,
): INodeTypeDescription | null {
	if (server.authType !== 'oauth2' && server.authType !== 'extendsCredential') return null;

	const connection = resolveMcpRegistryConnection(server);
	if (!connection) return null;

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
		connection.transport,
		connection.endpointUrl,
	);
	description.builderHint = {
		...description.builderHint,
		searchHint: `Agent-optimised ${server.title} integration. When wiring an ai_tool to an AI Agent for ${server.title}, use THIS node, not the native action node — this variant exposes ${server.title}'s tools in the shape AI Agents expect and ships pre-configured connection details.`,
	};

	return description;
}
