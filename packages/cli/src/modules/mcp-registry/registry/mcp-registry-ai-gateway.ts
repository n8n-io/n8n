import { resolveMcpRegistryConnection } from '../mcp-registry-connection';
import {
	AI_GATEWAY_MCP_SLUG_PREFIX,
	isAiGatewayMcpServer,
	type McpRegistryAiGatewayPair,
	type McpRegistryServer,
} from './mcp-registry.types';

/** The pair of an active AI Gateway row with a usable endpoint and its active, loadable twin. */
function findPair(
	server: McpRegistryServer,
	activeBySlug: Map<string, McpRegistryServer>,
	canLoad: (server: McpRegistryServer) => boolean,
): { twinSlug: string; pair: McpRegistryAiGatewayPair } | undefined {
	if (!isAiGatewayMcpServer(server) || !server.slug.startsWith(AI_GATEWAY_MCP_SLUG_PREFIX)) return;
	const twin = activeBySlug.get(server.slug.slice(AI_GATEWAY_MCP_SLUG_PREFIX.length));
	if (!twin || isAiGatewayMcpServer(twin) || !canLoad(twin)) return;
	const connection = resolveMcpRegistryConnection(server);
	if (!connection || connection.isTemplated) return;
	const endpoint = {
		url: connection.endpointUrl,
		hostname: connection.endpointHostname,
		transport: connection.transport,
	};
	return { twinSlug: twin.slug, pair: { slug: server.slug, endpoint } };
}

/**
 * Attaches each active AI Gateway row `n8n-connect-<slug>` to its active
 * registry twin `<slug>`, so the twin offers Gateway credits as one more
 * credential option. When the twin cannot load, neither row changes, so the
 * AI Gateway row stays visible on its own. Returns new objects.
 */
export function pairAiGatewayServers(
	servers: McpRegistryServer[],
	canLoad: (server: McpRegistryServer) => boolean,
): McpRegistryServer[] {
	const activeBySlug = new Map(
		servers.filter(({ status }) => status === 'active').map((server) => [server.slug, server]),
	);
	const pairByTwinSlug = new Map<string, McpRegistryAiGatewayPair>();
	const twinSlugByAiGatewaySlug = new Map<string, string>();
	for (const server of activeBySlug.values()) {
		const found = findPair(server, activeBySlug, canLoad);
		if (!found) continue;
		pairByTwinSlug.set(found.twinSlug, found.pair);
		twinSlugByAiGatewaySlug.set(server.slug, found.twinSlug);
	}

	return servers.map((server) => {
		const pair = server.status === 'active' ? pairByTwinSlug.get(server.slug) : undefined;
		if (pair) return { ...server, aiGateway: pair };
		const twinSlug =
			server.status === 'active' ? twinSlugByAiGatewaySlug.get(server.slug) : undefined;
		return twinSlug ? { ...server, pairedSlug: twinSlug } : server;
	});
}

/** The slugs to read so that the pair partner of each slug is present. */
export function withAiGatewayPartnerSlugs(slugs: string[]): string[] {
	return slugs.flatMap((slug) => [
		slug,
		slug.startsWith(AI_GATEWAY_MCP_SLUG_PREFIX)
			? slug.slice(AI_GATEWAY_MCP_SLUG_PREFIX.length)
			: `${AI_GATEWAY_MCP_SLUG_PREFIX}${slug}`,
	]);
}
