import type { INodeProperties, INodeTypeDescription } from 'n8n-workflow';

import type { McpRegistryServer } from './registry/mcp-registry.types';

/** Package prefix for synthetic registry nodes. */
export const MCP_REGISTRY_PACKAGE_NAME = '@n8n/mcp-registry';

/** Package the backing runtime class lives in. */
export const LANGCHAIN_PACKAGE_NAME = '@n8n/n8n-nodes-langchain';

/** Bare class name for the runtime base node in the langchain package. */
export const MCP_REGISTRY_BASE_NODE_NAME = 'mcpRegistryClientTool';

/**
 * Bare (unprefixed) node-type name for a registry slug. The package prefix is
 * applied uniformly by `LoadNodesAndCredentials.postProcessLoaders`, so we
 * push the bare name and let it handle namespacing.
 */
export function bareNodeNameFromSlug(slug: string): string {
	return `${MCP_REGISTRY_BASE_NODE_NAME}_${slug}`;
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
 * Pure transform: registry server + runtime base description → synthetic node
 * type description. Returns `null` when the server has no usable remote.
 *
 * The runtime class owns the full property set; this transform only contributes
 * the per-server metadata (name, icon, codex, description) and overrides the
 * defaults of the hidden connection fields. URL, transport, and auth pickers
 * are absent from the UI because they're fixed by the registry.
 */
export function serverToNodeDescription(
	server: McpRegistryServer,
	baseDescription: INodeTypeDescription,
): INodeTypeDescription | null {
	const remote = pickRemote(server);
	if (!remote) return null;

	const description = structuredClone(baseDescription);

	delete description.hidden;
	description.displayName = server.title;
	description.name = bareNodeNameFromSlug(server.slug);
	description.iconUrl = server.icons[0]?.src;
	description.description = server.description;
	description.defaults = { name: server.title };
	description.codex?.alias?.push(server.title);
	if (server.websiteUrl && description.codex) {
		description.codex.resources = { primaryDocumentation: [{ url: server.websiteUrl }] };
	}
	description.properties = withRemoteDefaults(
		description.properties,
		remote.transport,
		remote.endpointUrl,
	);

	return description;
}
