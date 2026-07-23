import type { AgentJsonConfig } from '@n8n/api-types';

import type {
	AgentTelemetryMemoryType,
	IAgentConfigurationTelemetryProperties,
} from '@/interfaces';

import type { Agent } from './entities/agent.entity';

export function buildAgentConfigurationTelemetry(
	agent: Agent,
): IAgentConfigurationTelemetryProperties {
	return buildAgentConfigurationTelemetryFromConfig(agent.schema, agent.integrations);
}

export function buildAgentConfigurationTelemetryFromConfig(
	config: AgentJsonConfig | null,
	integrations: AgentJsonConfig['integrations'] = [],
): IAgentConfigurationTelemetryProperties {
	const channels = uniqueSorted([
		...(integrations ?? []).map((integration) => integration.type),
		...(config?.integrations ?? []).map((integration) => integration.type),
	]);
	const providerToolCount = Object.keys(config?.providerTools ?? {}).length;
	const hasWebSearch = config?.config?.webSearch?.enabled === true;
	const hasNodeTools = config?.config?.nodeTools?.enabled === true;
	const mcpServerCount = config?.mcpServers?.length ?? 0;
	const subAgentCount = config?.subAgents?.agents?.length ?? 0;

	const toolTypes = new Set<string>(config?.tools?.map((tool) => tool.type) ?? []);
	if (mcpServerCount > 0) toolTypes.add('mcp');
	if (providerToolCount > 0) toolTypes.add('provider');
	if (hasWebSearch) toolTypes.add('web_search');
	if (hasNodeTools) toolTypes.add('node_tools');
	if (subAgentCount > 0) toolTypes.add('subagent');

	return {
		model: config?.model || null,
		channels,
		tool_types: uniqueSorted([...toolTypes]),
		tool_count:
			(config?.tools?.length ?? 0) +
			mcpServerCount +
			providerToolCount +
			(hasWebSearch ? 1 : 0) +
			(hasNodeTools ? 1 : 0) +
			subAgentCount,
		num_skills: config?.skills?.length ?? 0,
		memory_type: getMemoryType(config),
	};
}

function getMemoryType(config: AgentJsonConfig | null): AgentTelemetryMemoryType {
	const memory = config?.memory;
	if (!memory?.enabled) return 'none';

	const hasObservationalMemory = memory.observationalMemory?.enabled !== false;
	const hasEpisodicMemory = memory.episodicMemory?.enabled === true;

	if (hasObservationalMemory && hasEpisodicMemory) return 'n8n_observational_episodic';
	if (hasObservationalMemory) return 'n8n_observational';
	if (hasEpisodicMemory) return 'n8n_episodic';
	return 'n8n';
}

function uniqueSorted(values: string[]): string[] {
	return [...new Set(values)].sort();
}
