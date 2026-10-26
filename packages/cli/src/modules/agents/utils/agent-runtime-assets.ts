import type { ToolDescriptor } from '@n8n/agents';
import type { AgentSkill } from '@n8n/api-types';

import type { AgentHistory } from '../entities/agent-history.entity';
import type { Agent } from '../entities/agent.entity';

export type AgentRuntimeAssets = ReturnType<typeof getAgentRuntimeAssets>;

/** `skills`: the skill bodies from the skills hub that the draft or version runs. */
export function getAgentRuntimeAssets(
	agent: Pick<Agent | AgentHistory, 'tools'>,
	skills: Record<string, AgentSkill>,
) {
	const toolDescriptors: Record<string, ToolDescriptor> = {};
	const toolCodeByName: Record<string, string> = {};

	for (const [toolId, toolEntry] of Object.entries(agent.tools ?? {})) {
		toolDescriptors[toolId] = toolEntry.descriptor;
		toolCodeByName[toolEntry.descriptor.name] = toolEntry.code;
	}

	return { toolDescriptors, toolCodeByName, skills };
}
