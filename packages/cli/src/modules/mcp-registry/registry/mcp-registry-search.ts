/**
 * Pure MCP-registry search: match servers against free-text queries and map them
 * to the config-ready shape both the agent-builder tool and the instance-ai
 * adapter consume. Kept here (not inlined per call site) so the matching + result
 * mapping live in one place.
 */
import { camelCase } from 'change-case';

import type { McpRegistryServer } from './mcp-registry.types';
import { MCP_REGISTRY_PACKAGE_NAME } from '../node-description-transform';

export interface McpRegistrySearchResult {
	name: string;
	title: string;
	description: string;
	url: string;
	transport: 'streamableHttp' | 'sse';
	authentication: string;
	credentialType: string;
	tools: Array<{ name: string; title?: string }>;
	metadata: { nodeTypeName: string };
}

/** Prefer a streamable-http remote, else SSE; null when the server has neither. */
function pickPreferredRemote(
	server: McpRegistryServer,
): { type: 'streamableHttp' | 'sse'; url: string } | null {
	const streamable = server.remotes.find((remote) => remote.type === 'streamable-http');
	if (streamable) return { type: 'streamableHttp', url: streamable.url };
	const sse = server.remotes.find((remote) => remote.type === 'sse');
	if (sse) return { type: 'sse', url: sse.url };
	return null;
}

function credentialTypeName(server: McpRegistryServer): string {
	return `${camelCase(server.slug)}McpOAuth2Api`;
}

function toSearchResult(server: McpRegistryServer): McpRegistrySearchResult | null {
	const remote = pickPreferredRemote(server);
	if (!remote) return null;
	const credentialType = credentialTypeName(server);
	return {
		name: camelCase(server.slug),
		title: server.title,
		description: server.tagline,
		url: remote.url,
		transport: remote.type,
		authentication: credentialType,
		credentialType,
		tools: server.tools.map((tool) => ({
			name: tool.name,
			...(tool.title ? { title: tool.title } : {}),
		})),
		metadata: { nodeTypeName: `${MCP_REGISTRY_PACKAGE_NAME}.${camelCase(server.slug)}` },
	};
}

function normalizeQueries(queries: string[]): string[] {
	return queries.map((query) => query.trim().toLowerCase()).filter((query) => query.length > 0);
}

function matchesQuery(server: McpRegistryServer, normalizedQueries: string[]): boolean {
	const fields = [
		server.slug,
		camelCase(server.slug),
		server.title,
		server.description,
		server.tagline,
	]
		.filter((field): field is string => typeof field === 'string')
		.map((field) => field.toLowerCase());
	return normalizedQueries.some((query) => fields.some((field) => field.includes(query)));
}

/** Filter `servers` to those matching any query, mapped to the config-ready shape. */
export function searchMcpRegistryServers(
	servers: McpRegistryServer[],
	queries: string[],
): McpRegistrySearchResult[] {
	const normalized = normalizeQueries(queries);
	if (normalized.length === 0) return [];
	return servers.flatMap((server) => {
		if (!matchesQuery(server, normalized)) return [];
		const result = toSearchResult(server);
		return result ? [result] : [];
	});
}
