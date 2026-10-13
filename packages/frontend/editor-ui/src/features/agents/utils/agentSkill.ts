import type { AgentSkill } from '../types';

export function normalizeAgentSkillForSave(skill: AgentSkill): AgentSkill {
	const { allowedTools: _allowedTools, ...rest } = skill;
	return rest;
}
