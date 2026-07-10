import type { AgentJsonConfig } from '@n8n/api-types';
import {
	AgentSourceCoreConfigSchema,
	generateAgentSource,
	type AgentSourceCoreConfig,
} from '@n8n/workflow-sdk/agent';

function normalizeSubAgents(config: AgentJsonConfig): AgentSourceCoreConfig['subAgents'] {
	const seen = new Set<string>();
	const agents = (config.subAgents?.agents ?? []).filter(({ agentId }) => {
		if (seen.has(agentId)) return false;
		seen.add(agentId);
		return true;
	});

	return { ...config.subAgents, agents };
}

function normalizeTools(config: AgentJsonConfig): AgentSourceCoreConfig['tools'] {
	return (config.tools ?? []).map((tool) => {
		if (tool.type !== 'workflow' || tool.name === undefined || tool.name.trim().length > 0) {
			return tool;
		}
		const { name: _emptyName, ...workflowTool } = tool;
		return workflowTool;
	});
}

export function agentConfigToSourceCore(config: AgentJsonConfig): AgentSourceCoreConfig {
	return AgentSourceCoreConfigSchema.parse({
		name: config.name,
		model: config.model,
		credential: config.credential ?? '',
		instructions: config.instructions,
		memory: config.memory ?? { enabled: false, storage: 'n8n' },
		subAgents: normalizeSubAgents(config),
		tools: normalizeTools(config),
		skills: config.skills ?? [],
		providerTools: config.providerTools ?? {},
		mcpServers: config.mcpServers ?? [],
		vectorStores: config.vectorStores ?? [],
		config: config.config ?? {},
	});
}

export function generateSourceFromAgentConfig(config: AgentJsonConfig): string {
	return generateAgentSource(agentConfigToSourceCore(config));
}
