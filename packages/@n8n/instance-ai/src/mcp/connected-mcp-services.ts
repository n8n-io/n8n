import type { ConnectedMcpService, InstanceAiToolRegistry, McpServerConfig } from '../types';

/** The services the user connected themselves, each with the tools that reached the
 *  agent. Servers the instance's administrator configured carry no registry slug and
 *  are left out — the user cannot connect or disconnect them. */
export function listConnectedMcpServices(
	mcpServers: readonly McpServerConfig[],
	mcpTools: InstanceAiToolRegistry,
): ConnectedMcpService[] {
	const toolNamesByServerName = new Map<string, string[]>();
	for (const [name, tool] of mcpTools) {
		if (tool.mcpServerName === undefined) continue;
		const names = toolNamesByServerName.get(tool.mcpServerName);
		if (names) names.push(name);
		else toolNamesByServerName.set(tool.mcpServerName, [name]);
	}

	return mcpServers
		.map((server) => ({ slug: server.metadata?.serverSlug, name: server.name }))
		.filter((entry): entry is { slug: string; name: string } => entry.slug !== undefined)
		.map(({ slug, name }) => ({ slug, toolNames: toolNamesByServerName.get(name) ?? [] }));
}
