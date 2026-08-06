import type { Logger } from '../logger';
import type {
	ConnectedMcpService,
	InstanceAiMcpService,
	InstanceAiToolRegistry,
	McpServerConfig,
} from '../types';

/**
 * A connection is absent from `mcpServers` when it could not be resolved into a
 * loadable config (missing credential, unrefreshable token, registry entry gone),
 * and absent from `mcpTools` when the server was reachable but listed nothing.
 * Both mean the same thing to the agent, so both come back as `toolsLoaded: false`.
 */
export function reconcileConnectedMcpServices(
	connections: ReadonlyArray<{ slug: string; title: string }>,
	mcpServers: readonly McpServerConfig[],
	mcpTools: InstanceAiToolRegistry,
): ConnectedMcpService[] {
	const slugByServerName = new Map<string, string>();
	for (const server of mcpServers) {
		const slug = server.metadata?.serverSlug;
		if (slug !== undefined) slugByServerName.set(server.name, slug);
	}

	const slugsWithTools = new Set<string>();
	for (const tool of mcpTools.values()) {
		const slug =
			tool.mcpServerName === undefined ? undefined : slugByServerName.get(tool.mcpServerName);
		if (slug !== undefined) slugsWithTools.add(slug);
	}

	return connections.map(({ slug, title }) => ({
		slug,
		title,
		toolsLoaded: slugsWithTools.has(slug),
	}));
}

/** Yields `undefined` on a host failure rather than `[]`, which would read as
 *  "the user has connected nothing". */
export async function loadConnectedMcpServices(
	mcpService: InstanceAiMcpService | undefined,
	mcpServers: readonly McpServerConfig[],
	mcpTools: InstanceAiToolRegistry,
	logger: Logger,
): Promise<ConnectedMcpService[] | undefined> {
	if (!mcpService) return undefined;

	try {
		const connections = await mcpService.listConnections();
		return reconcileConnectedMcpServices(connections, mcpServers, mcpTools);
	} catch (error) {
		logger.warn('Failed to list connected MCP services for the agent', {
			error: error instanceof Error ? error.message : String(error),
		});
		return undefined;
	}
}
