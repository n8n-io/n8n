/**
 * Pure MCP-registry search: match servers against free-text queries and map them
 * to the config-ready shape both the agent-builder tool and the instance-ai
 * adapter consume. Kept here (not inlined per call site) so the matching + result
 * mapping live in one place.
 */
import { camelCase } from 'change-case';
import { AI_GATEWAY_MCP_CONNECTION_MODE } from '@n8n/api-types';

import type { McpRegistryServer } from './mcp-registry.types';
import { AI_GATEWAY_MANAGED_AUTH_TYPE, N8N_CONNECT_MCP_SLUG_PREFIX } from './mcp-registry.types';
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
	/** Use this connection with Gateway credits instead of a stored credential. */
	aiGateway?: {
		url: string;
		transport: 'streamableHttp' | 'sse';
		authentication: 'none';
		metadata: { nodeTypeName: string; connectionMode: typeof AI_GATEWAY_MCP_CONNECTION_MODE };
	};
	/** `url` is an unresolved `$self`-expression, not a literal endpoint. Consumers
	 *  that cannot resolve it against a credential have to skip the row. */
	isTemplated: boolean;
}

export interface McpRegistrySearchOptions {
	loadedSlugs?: ReadonlySet<string>;
	pairedSlugs?: ReadonlySet<string>;
}

function toSearchResult(server: McpRegistryServer): McpRegistrySearchResult | null {
	const connection = resolveMcpRegistryConnection(server);
	if (!connection) return null;
	const defaultCredential = connection.credentialBindings[0];
	if (!defaultCredential) return null;
	// An n8n Connect MCP server needs no user credential: the token is minted at
	// run time from `metadata.nodeTypeName`. Its `*McpGatewayApi` type is not a
	// valid config `authentication` value, so surface it as `none` and ask for nothing.
	const isAiGatewayManaged = server.authType === AI_GATEWAY_MANAGED_AUTH_TYPE;
	return {
		slug: server.slug,
		name: camelCase(server.slug),
		title: server.title,
		description: server.tagline,
		url: getConfiguredEndpointUrl(connection),
		transport: toAgentMcpTransport(connection.transport),
		authentication: isAiGatewayManaged ? 'none' : defaultCredential.credentialType,
		credentialType: isAiGatewayManaged ? '' : defaultCredential.credentialType,
		tools: server.tools.map((tool) => ({
			name: tool.name,
			...(tool.title ? { title: tool.title } : {}),
		})),
		metadata: { nodeTypeName: connection.nodeTypeName },
		isTemplated: connection.isTemplated === true,
	};
}

/** Map registry servers to the config-ready shape, skipping entries without a usable remote. */
export function listMcpRegistryServers(
	servers: McpRegistryServer[],
	options: McpRegistrySearchOptions = {},
): McpRegistrySearchResult[] {
	const activeServersBySlug = new Map(
		servers.filter(({ status }) => status === 'active').map((server) => [server.slug, server]),
	);
	return servers.flatMap((server) => {
		if (options.loadedSlugs && !options.loadedSlugs.has(server.slug)) return [];
		const primary = activeServersBySlug.get(server.slug.slice(N8N_CONNECT_MCP_SLUG_PREFIX.length));
		if (
			server.authType === AI_GATEWAY_MANAGED_AUTH_TYPE &&
			server.slug.startsWith(N8N_CONNECT_MCP_SLUG_PREFIX) &&
			primary &&
			(options.pairedSlugs?.has(primary.slug) ?? toSearchResult(primary) !== null)
		) {
			return [];
		}
		const result = toSearchResult(server);
		if (!result) return [];
		const aiGatewayServer = activeServersBySlug.get(`${N8N_CONNECT_MCP_SLUG_PREFIX}${server.slug}`);
		const aiGatewayResult =
			aiGatewayServer?.authType === AI_GATEWAY_MANAGED_AUTH_TYPE
				? toSearchResult(aiGatewayServer)
				: null;
		if (aiGatewayResult && (!options.pairedSlugs || options.pairedSlugs.has(server.slug))) {
			result.aiGateway = {
				url: aiGatewayResult.url,
				transport: aiGatewayResult.transport,
				authentication: 'none',
				metadata: {
					nodeTypeName: result.metadata.nodeTypeName,
					connectionMode: AI_GATEWAY_MCP_CONNECTION_MODE,
				},
			};
		}
		return [result];
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

/** Match both records while returning one result for the service. */
function scoreSearchResult(
	result: McpRegistrySearchResult,
	serversBySlug: Map<string, McpRegistryServer>,
	normalizedQueries: string[],
): number | undefined {
	const server = serversBySlug.get(result.slug);
	if (!server) return undefined;
	const aiGatewayServer = serversBySlug.get(`${N8N_CONNECT_MCP_SLUG_PREFIX}${result.slug}`);
	const searchableServers =
		aiGatewayServer?.authType === AI_GATEWAY_MANAGED_AUTH_TYPE &&
		aiGatewayServer.status === 'active'
			? [server, aiGatewayServer]
			: [server];
	const matches = searchableServers.filter((candidate) =>
		matchesQuery(candidate, normalizedQueries),
	);
	return matches.length > 0
		? Math.max(...matches.map((candidate) => relevance(candidate, normalizedQueries)))
		: undefined;
}

/** Filter `servers` to those matching any query, most relevant first, mapped to
 *  the config-ready shape. */
export function searchMcpRegistryServers(
	servers: McpRegistryServer[],
	queries: string[],
	options: McpRegistrySearchOptions = {},
): McpRegistrySearchResult[] {
	const normalized = normalizeQueries(queries);
	if (normalized.length === 0) return [];
	const serversBySlug = new Map(servers.map((server) => [server.slug, server]));
	return listMcpRegistryServers(servers, options)
		.flatMap((result) => {
			const score = scoreSearchResult(result, serversBySlug, normalized);
			return score === undefined ? [] : [{ result, score }];
		})
		.sort((left, right) => right.score - left.score)
		.map(({ result }) => result);
}
