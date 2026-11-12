import type {
	AgentApprovalRoute,
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
			tool.approvalRoute?.type === 'configuration' &&
			tool.approvalRoute.configurationIds.includes(id)
				? [hitlToolKey(tool)]
				: [],
		),
		...(config?.mcpServers ?? []).flatMap((server) =>
			server.approvalRoute?.type === 'configuration' &&
			server.approvalRoute.configurationIds.includes(id)
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
	updates.tools = config?.tools?.map((tool) => {
		const attached = selected.has(hitlToolKey(tool));
		const approvalRoute = updateReviewRoute(tool.approvalRoute, configuration.id, attached);
		return approvalRoute === tool.approvalRoute && (!attached || tool.requireApproval)
			? tool
			: { ...tool, ...(attached ? { requireApproval: true } : {}), approvalRoute };
	});
	updates.mcpServers = config?.mcpServers?.map((server) => {
		const attached = selected.has(hitlMcpServerKey(server.name));
		const approvalRoute = updateReviewRoute(server.approvalRoute, configuration.id, attached);
		return approvalRoute === server.approvalRoute && !attached
			? server
			: {
					...server,
					approvalRoute,
					...(attached ? { toolPermissions: enableMcpApproval(server.toolPermissions) } : {}),
				};
	});
	return updates;
}

/** Attach at the end, or remove only this review. Other reviews keep their order. */
export function updateReviewRoute(
	route: AgentApprovalRoute | undefined,
	id: string,
	attached: boolean,
): AgentApprovalRoute | undefined {
	const ids = route?.type === 'configuration' ? route.configurationIds : [];
	if (ids.includes(id) === attached) return route;
	const configurationIds = attached ? [...ids, id] : ids.filter((value) => value !== id);
	return configurationIds.length ? { type: 'configuration', configurationIds } : undefined;
}
