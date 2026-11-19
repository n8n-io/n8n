import {
	AGENT_PUBLISH_SEND_TARGETS_LIMIT,
	N8N_CHAT_INTEGRATION_TYPE,
	isDraftIntegration,
	type AgentIntegrationConfig,
	type AgentPublishSendTarget,
	type StoredAgentConfig,
} from '@n8n/api-types';

export interface PublishSendTargets {
	sendTargets: AgentPublishSendTarget[];
	/** Targets left out by the limit. */
	moreSendTargets: number;
}

/**
 * What an agent might really send or do once it goes live, for the confirmation shown
 * before a publish:
 * - each connected channel it replies in (n8n Chat stays inside n8n, so it is left out),
 * - each enabled scheduled task,
 * - each MCP server whose tools it can call,
 * - its own tools, as a count.
 *
 * Unfinished entries are left out, as `countAgentCapabilities` does: a channel without a
 * credential and an MCP server without a URL do nothing live. The tool count is always
 * kept, and the other targets are cut at the limit.
 */
export function describePublishSendTargets(args: {
	config: Pick<StoredAgentConfig, 'tools' | 'mcpServers' | 'tasks'> | null;
	integrations: AgentIntegrationConfig[];
	/** Names of the agent's task definitions, by task ID. */
	taskNames: ReadonlyMap<string, string>;
	/** The display name of a channel type, such as `Slack` for `slack`. */
	channelLabel: (type: string) => string;
}): PublishSendTargets {
	const { config, integrations, taskNames, channelLabel } = args;

	const named: AgentPublishSendTarget[] = [
		...integrations
			.filter(
				(integration) =>
					integration.type !== N8N_CHAT_INTEGRATION_TYPE && !isDraftIntegration(integration),
			)
			.map((integration) => ({ kind: 'channel' as const, name: channelLabel(integration.type) })),
		...(config?.tasks ?? [])
			.filter((task) => task.enabled)
			.map((task) => ({ kind: 'task' as const, name: taskNames.get(task.id) ?? task.id })),
		...(config?.mcpServers ?? [])
			.filter((server) => server.url.trim() !== '')
			.map((server) => ({ kind: 'mcp-server' as const, name: server.name })),
	];

	const toolCount = config?.tools?.length ?? 0;
	const tools: AgentPublishSendTarget[] =
		toolCount > 0 ? [{ kind: 'tools', count: toolCount }] : [];
	const room = AGENT_PUBLISH_SEND_TARGETS_LIMIT - tools.length;

	return {
		sendTargets: [...named.slice(0, room), ...tools],
		moreSendTargets: Math.max(0, named.length - room),
	};
}
