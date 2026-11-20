import { UserError } from '@n8n/errors';

import type { AgentSkillsService } from './agent-skills.service';
import type { AgentTaskService } from './agent-task.service';
import type { Agent } from './entities/agent.entity';
import { getAgentSkillHash } from './utils/agent-config-hash';

/**
 * The most reference content that one skill read returns, in characters. A skill can store
 * eight times as much, and one tool result must fit the context of the builder model.
 */
export const AGENT_SKILL_READ_MAX_LENGTH = 262_144;

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
	let remaining = AGENT_SKILL_READ_MAX_LENGTH;
	const omittedReferencePaths: string[] = [];
	const visibleReferences = references?.map((reference) => {
		const listed = { path: reference.path, characterCount: reference.content.length };
		if (reference.isBinary) return { ...listed, isBinary: true };
		if (!requestedPaths.has(reference.path)) return listed;
		if (reference.content.length <= remaining) {
			remaining -= reference.content.length;
			return { ...listed, content: reference.content };
		}
		// A file over the whole budget gives its start, so a read of that file alone makes progress.
		if (remaining === AGENT_SKILL_READ_MAX_LENGTH) {
			remaining = 0;
			return {
				...listed,
				content: reference.content.slice(0, AGENT_SKILL_READ_MAX_LENGTH),
				contentTruncated: true,
			};
		}
		omittedReferencePaths.push(reference.path);
		return listed;
	});

	return {
		id: skillId,
		skillHash: getAgentSkillHash(skill),
		skill: { ...body, ...(visibleReferences ? { references: visibleReferences } : {}) },
		...(omittedReferencePaths.length > 0 ? { truncated: true, omittedReferencePaths } : {}),
	};
}

export async function listAgentTasks(agentTaskService: AgentTaskService, agent: Agent) {
	const enabledById = new Map((agent.schema?.tasks ?? []).map((ref) => [ref.id, ref.enabled]));
	const tasks = await agentTaskService.list(agent.id);
	return tasks.map((task) => ({ ...task, enabled: enabledById.get(task.id) ?? false }));
}
