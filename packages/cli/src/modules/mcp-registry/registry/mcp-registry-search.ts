/**
 * Pure MCP-registry search: match servers against free-text queries and map them
 * to the config-ready shape both the agent-builder tool and the instance-ai
 * adapter consume. Kept here (not inlined per call site) so the matching + result
 * mapping live in one place.
 */
import { camelCase } from 'change-case';

import type { McpRegistryServer } from './mcp-registry.types';
import {
	getConfiguredEndpointUrl,
	resolveMcpRegistryConnection,
	toAgentMcpTransport,
} from '../mcp-registry-connection';

export interface McpRegistrySearchResult {
	slug: string;
	name: string;
	title: string;
	description: string;
	url: string;
	transport: 'streamableHttp' | 'sse';
	authentication: string;
	credentialType: string;
	tools: Array<{ name: string; title?: string }>;
	metadata: { nodeTypeName: string };
	/** `url` is an unresolved `$self`-expression, not a literal endpoint. Consumers
	 *  that cannot resolve it against a credential have to skip the row. */
	isTemplated: boolean;
}

function toSearchResult(server: McpRegistryServer): McpRegistrySearchResult | null {
	const connection = resolveMcpRegistryConnection(server);
	if (!connection) return null;
	return {
		slug: server.slug,
		name: camelCase(server.slug),
		title: server.title,
		description: server.tagline,
		url: getConfiguredEndpointUrl(connection),
		transport: toAgentMcpTransport(connection.transport),
		authentication: connection.credentialType,
		credentialType: connection.credentialType,
		tools: server.tools.map((tool) => ({
			name: tool.name,
			...(tool.title ? { title: tool.title } : {}),
		})),
		metadata: { nodeTypeName: connection.nodeTypeName },
		isTemplated: connection.isTemplated === true,
	};
}

/** Map registry servers to the config-ready shape, skipping entries without a usable remote. */
export function listMcpRegistryServers(servers: McpRegistryServer[]): McpRegistrySearchResult[] {
	return servers.flatMap((server) => {
		const result = toSearchResult(server);
		return result ? [result] : [];
	});
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

function relevance(server: McpRegistryServer, normalizedQueries: string[]): number {
	const names = [server.slug, camelCase(server.slug), server.title]
		.filter((name): name is string => typeof name === 'string')
		.map((name) => name.toLowerCase());
	if (normalizedQueries.some((query) => names.includes(query))) return 2;
	if (normalizedQueries.some((query) => names.some((name) => name.includes(query)))) return 1;
	return 0;
}

/** Filter `servers` to those matching any query, most relevant first, mapped to
 *  the config-ready shape. */
export function searchMcpRegistryServers(
	servers: McpRegistryServer[],
	queries: string[],
): McpRegistrySearchResult[] {
	const normalized = normalizeQueries(queries);
	if (normalized.length === 0) return [];
	return listMcpRegistryServers(
		servers
			.filter((server) => matchesQuery(server, normalized))
			.map((server) => ({ server, score: relevance(server, normalized) }))
			.sort((left, right) => right.score - left.score)
			.map(({ server }) => server),
	);
}
