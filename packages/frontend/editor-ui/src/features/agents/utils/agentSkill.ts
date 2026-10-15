import type { AgentSkill } from '../types';

/** Skills drop `allowedTools`: the editor does not show it and the runtime does not get it. */
export function normalizeAgentSkillForSave(skill: AgentSkill): AgentSkill {
	const { allowedTools: _allowedTools, ...rest } = skill;
	return rest;
}
