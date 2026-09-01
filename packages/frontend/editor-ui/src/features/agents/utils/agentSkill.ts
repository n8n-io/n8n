import type { AgentSkill } from '../types';

export function normalizeAgentSkillForSave(
	skill: AgentSkill,
	availableToolNames?: Iterable<string>,
): AgentSkill {
	if (!availableToolNames || !skill.allowedTools?.length) return skill;

	const available = new Set(availableToolNames);
	const allowedTools = skill.allowedTools.filter((toolName) => available.has(toolName));
	const { allowedTools: _allowedTools, ...skillWithoutAllowedTools } = skill;
	return allowedTools.length > 0 ? { ...skill, allowedTools } : skillWithoutAllowedTools;
}
