import type { ToolDescriptor } from '@n8n/agents';

import type { AgentHistory } from '../entities/agent-history.entity';
import type { Agent } from '../entities/agent.entity';

export type AgentRuntimeAssets = ReturnType<typeof getAgentRuntimeAssets>;

export function getAgentRuntimeAssets(agent: Pick<Agent | AgentHistory, 'tools' | 'skills'>) {
	const toolDescriptors: Record<string, ToolDescriptor> = {};
	const toolCodeByName: Record<string, string> = {};

	for (const [toolId, toolEntry] of Object.entries(agent.tools ?? {})) {
		toolDescriptors[toolId] = toolEntry.descriptor;
		toolCodeByName[toolEntry.descriptor.name] = toolEntry.code;
	}

	return { toolDescriptors, toolCodeByName, skills: agent.skills ?? {} };
}
