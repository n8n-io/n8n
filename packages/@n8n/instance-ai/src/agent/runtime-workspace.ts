import type { Agent, RuntimeSkillSource, Workspace } from '@n8n/agents';

import { hasRuntimeSkills } from '../skills/runtime-skills';

export interface RuntimeWorkspaceCapabilities {
	workspace?: Workspace;
	runtimeSkills?: RuntimeSkillSource;
}

export function attachRuntimeWorkspaceCapabilities(
	agent: Agent,
	{ workspace, runtimeSkills }: RuntimeWorkspaceCapabilities,
): Agent {
	if (workspace) {
		agent.workspace(workspace);
	}

	if (hasRuntimeSkills(runtimeSkills)) {
		agent.skills(runtimeSkills);
	}

	return agent;
}
