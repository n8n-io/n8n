import { SKILL_NAME_TAKEN_MESSAGE, type SkillUsage } from '@n8n/api-types';
import { ResponseError } from '@n8n/rest-api-client';

import type { AgentSkill } from '../types';

/** Whether a save failed because the skill's scope already has a name like it. */
export function isSkillNameTakenError(error: unknown): boolean {
	return (
		error instanceof ResponseError &&
		error.httpStatusCode === 409 &&
		error.message === SKILL_NAME_TAKEN_MESSAGE
	);
}

/** Skills drop `allowedTools`: the editor does not show it and the runtime does not get it. */
export function normalizeAgentSkillForSave(skill: AgentSkill): AgentSkill {
	const { allowedTools: _allowedTools, ...rest } = skill;
	return rest;
}

/** Where a move puts a skill. With no project, the skill goes to the instance. */
export type SkillMoveTarget = { projectId: string | null };

/**
 * The agents that lose a skill when it moves to `target`, by the rule the backend applies:
 * an agent can add an instance skill and a skill of its own project.
 * The caller does not know the projects of hidden agents, so they lose it unless the
 * target is the instance. Every built-in role that can create skills in a project can
 * also read its agents, so a hidden agent is never in a project the user can pick.
 * `keepAgentId` is the agent that asks for the move.
 */
export function agentsLosingSkill(
	usage: SkillUsage,
	target: SkillMoveTarget,
	keepAgentId?: string,
): { names: string[]; hidden: number } {
	if (target.projectId === null) return { names: [], hidden: 0 };
	const names = new Map<string, string>();
	for (const agent of [...usage.drafts, ...usage.pins]) {
		if (agent.agentId === keepAgentId) continue;
		if (agent.projectId !== target.projectId) names.set(agent.agentId, agent.agentName);
	}
	return { names: [...names.values()], hidden: usage.hiddenAgents };
}
