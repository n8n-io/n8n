import { SKILL_LOAD_TOOL_NAME } from '@n8n/agents';
import type { AgentIntegrationConfig, AgentJsonConfig } from '@n8n/api-types';
import { isRecord } from '@n8n/utils/is-record';

import type {
	AgentTelemetryMemoryType,
	IAgentConfigurationTelemetryProperties,
} from '@/interfaces';

import type { MessageRecord, TimelineEvent } from './execution-recorder';
import { toAgentDocument } from './json-config/agent-document';
import type { AgentRunSource } from './utils/agent-published-snapshot';
import {
	capabilityCountTelemetryProperties,
	countAgentCapabilities,
} from './utils/agent-capabilities';

export function buildAgentTurnMetrics(record: MessageRecord) {
	const skillLoads = record.timeline.flatMap(skillLoad);
	return {
		latency_ms: record.duration,
		cost: record.totalCost ?? 0,
		token_count: record.usage?.totalTokens ?? 0,
		tool_call_count: record.timeline.filter((event) => event.type === 'tool-call').length,
		skill_load_count: skillLoads.length,
		loaded_skill_ids: uniqueSorted(skillLoads.flatMap(({ skillId }) => skillId ?? [])),
	};
}

/**
 * The skill a `load_skill` call activated. A call that failed, or that read a
 * linked file instead of the main instructions, loaded no skill. The result of
 * a linked file read is the only one that carries `filePath`.
 */
function skillLoad(event: TimelineEvent): Array<{ skillId?: string }> {
	if (event.type !== 'tool-call' || event.name !== SKILL_LOAD_TOOL_NAME || !event.success) {
		return [];
	}
	const { input, output } = event;
	if (!isRecord(output) || output.success === false || output.ok === false) return [];
	if (output.filePath !== undefined) return [];
	if (typeof output.skillId === 'string') return [{ skillId: output.skillId }];
	// A source without activation returns the skill text, which carries no id. A load
	// by name still counts, without an id.
	return [isRecord(input) && typeof input.skillId === 'string' ? { skillId: input.skillId } : {}];
}

export function buildAgentCapabilityTelemetryProperties(
	config: AgentJsonConfig | null,
	integrations: AgentIntegrationConfig[],
) {
	const counts = countAgentCapabilities(config, integrations);
	// Keep capability counts separate from the runtime tool count, which includes provider tools.
	const { model, tool_types } = buildAgentConfigurationTelemetryFromConfig(config, integrations);
	return {
		...capabilityCountTelemetryProperties(counts),
		skill_ids: uniqueSorted((config?.skills ?? []).map((skill) => skill.id)),
		model,
		tool_types,
	};
}

export function buildAgentConfigurationTelemetry({
	agent,
	skillRefs,
}: AgentRunSource): IAgentConfigurationTelemetryProperties {
	return buildAgentConfigurationTelemetryFromConfig(
		agent.schema ? toAgentDocument(agent.schema, skillRefs) : null,
		agent.integrations,
	);
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
	const mcpServerCount = config?.mcpServers?.length ?? 0;
	const subAgentCount = config?.subAgents?.agents?.length ?? 0;

	const toolTypes = new Set<string>(config?.tools?.map((tool) => tool.type) ?? []);
	if (mcpServerCount > 0) toolTypes.add('mcp');
	if (providerToolCount > 0) toolTypes.add('provider');
	if (hasWebSearch) toolTypes.add('web_search');
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
