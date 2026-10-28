import type {
	AgentHitlConfiguration,
	AgentJsonConfig,
	AgentJsonToolConfig,
	McpToolPermission,
	McpToolPermissions,
} from '@n8n/api-types';

export function hitlToolKey(tool: AgentJsonToolConfig): string {
	const id =
		tool.type === 'custom'
			? tool.id
			: tool.type === 'workflow'
				? (tool.name ?? tool.workflow)
				: tool.name;
	return `tool:${tool.type}:${id}`;
}

export function hitlMcpServerKey(name: string): string {
	return `mcp:${name}`;
}

export function hitlConfigurationToolKeys(config: AgentJsonConfig | null, id?: string): string[] {
	if (!id) return [];
	return [
		...(config?.tools ?? []).flatMap((tool) =>
			tool.approvalRoute?.type === 'configuration' && tool.approvalRoute.configurationId === id
				? [hitlToolKey(tool)]
				: [],
		),
		...(config?.mcpServers ?? []).flatMap((server) =>
			server.approvalRoute?.type === 'configuration' && server.approvalRoute.configurationId === id
				? [hitlMcpServerKey(server.name)]
				: [],
		),
	];
}

function enableMcpApproval(permissions?: McpToolPermissions): McpToolPermissions {
	if (
		permissions &&
		[...Object.values(permissions.categories), ...Object.values(permissions.tools ?? {})].includes(
			'require_approval',
		)
	)
		return permissions;
	return {
		categories: {
			read: permissions?.categories.read === 'blocked' ? 'blocked' : 'require_approval',
			write: permissions?.categories.write === 'blocked' ? 'blocked' : 'require_approval',
		},
		...(permissions?.tools && {
			tools: Object.fromEntries(
				Object.entries(permissions.tools).map(([name, permission]): [string, McpToolPermission] => [
					name,
					permission === 'blocked' ? 'blocked' : 'require_approval',
				]),
			),
		}),
	};
}

export function hitlConfigurationUpdates(
	config: AgentJsonConfig | null,
	configuration: AgentHitlConfiguration,
	toolKeys?: string[],
): Partial<AgentJsonConfig> {
	const updates: Partial<AgentJsonConfig> = {
		hitlConfigurations: [
			...(config?.hitlConfigurations ?? []).filter((entry) => entry.id !== configuration.id),
			configuration,
		],
	};
	if (!toolKeys) return updates;
	const selected = new Set(toolKeys);
	const approvalRoute = { type: 'configuration', configurationId: configuration.id } as const;
	updates.tools = config?.tools?.map((tool) => {
		if (selected.has(hitlToolKey(tool))) return { ...tool, requireApproval: true, approvalRoute };
		if (
			tool.approvalRoute?.type === 'configuration' &&
			tool.approvalRoute.configurationId === configuration.id
		)
			return { ...tool, approvalRoute: undefined };
		return tool;
	});
	updates.mcpServers = config?.mcpServers?.map((server) => {
		if (selected.has(hitlMcpServerKey(server.name)))
			return {
				...server,
				approvalRoute,
				toolPermissions: enableMcpApproval(server.toolPermissions),
			};
		if (
			server.approvalRoute?.type === 'configuration' &&
			server.approvalRoute.configurationId === configuration.id
		)
			return { ...server, approvalRoute: undefined };
		return server;
	});
	return updates;
}
