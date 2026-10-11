import { UserError } from 'n8n-workflow';

import type { AgentSkillsService } from './agent-skills.service';
import type { AgentTaskService } from './agent-task.service';
import type { Agent } from './entities/agent.entity';
import { composeJsonConfig } from './json-config/agent-config-composition';
import { getAgentSkillHash } from './utils/agent-config-hash';

export async function readAgentSkill(
	agentSkillsService: AgentSkillsService,
	agentId: string,
	projectId: string,
	skillId: string,
	referencePaths: string[] = [],
) {
	const skill = await agentSkillsService.getSkill(agentId, projectId, skillId);
	const requestedPaths = new Set(referencePaths);
	const knownPaths = new Set(skill.references?.map((reference) => reference.path) ?? []);
	const missingPaths = [...requestedPaths].filter((path) => !knownPaths.has(path));
	if (missingPaths.length > 0) {
		throw new UserError(`Skill reference not found: ${missingPaths.join(', ')}`);
	}
	const { references, ...body } = skill;
	const visibleReferences = references?.map((reference) => ({
		path: reference.path,
		characterCount: reference.content.length,
		...(requestedPaths.has(reference.path) ? { content: reference.content } : {}),
	}));

	return {
		id: skillId,
		skillHash: getAgentSkillHash(skill),
		skill: { ...body, ...(visibleReferences ? { references: visibleReferences } : {}) },
	};
}

export async function listAgentTasks(agentTaskService: AgentTaskService, agent: Agent) {
	const enabledById = new Map(
		(composeJsonConfig(agent)?.tasks ?? []).map((ref) => [ref.id, ref.enabled]),
	);
	const tasks = await agentTaskService.list(agent.id);
	return tasks.map((task) => ({ ...task, enabled: enabledById.get(task.id) ?? false }));
}
