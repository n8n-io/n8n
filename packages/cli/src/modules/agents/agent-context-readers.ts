import { projectSkillForModel, SKILL_READ_MAX_BYTES } from '@n8n/api-types';
import { UserError } from '@n8n/errors';

import type { AgentSkillsService } from './agent-skills.service';
import type { AgentTaskService } from './agent-task.service';
import type { Agent } from './entities/agent.entity';
import { getAgentSkillHash } from './utils/agent-config-hash';

export async function readAgentSkill(
	agentSkillsService: AgentSkillsService,
	agentId: string,
	projectId: string,
	skillId: string,
	referencePaths: string[] = [],
	referenceOffset?: number,
) {
	if (referenceOffset !== undefined && referencePaths.length !== 1) {
		throw new UserError('Pass one reference path with referenceOffset.');
	}
	const skill = await agentSkillsService.getSkill(agentId, projectId, skillId);
	const { missingReferencePaths, ...projection } = projectSkillForModel(skill, {
		paths: referencePaths,
		offset: referenceOffset,
		maxBytes: SKILL_READ_MAX_BYTES,
	});
	if (missingReferencePaths) {
		throw new UserError(`Skill reference not found: ${missingReferencePaths.join(', ')}`);
	}

	return {
		id: skillId,
		skillHash: getAgentSkillHash(skill),
		...projection,
	};
}

export async function listAgentTasks(agentTaskService: AgentTaskService, agent: Agent) {
	const enabledById = new Map((agent.schema?.tasks ?? []).map((ref) => [ref.id, ref.enabled]));
	const tasks = await agentTaskService.list(agent.id);
	return tasks.map((task) => ({ ...task, enabled: enabledById.get(task.id) ?? false }));
}
