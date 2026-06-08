import type { RuntimeSkill } from '@n8n/agents';

import { integrationsSkill } from './integrations.skill.js';
import { mcpSkill } from './mcp.skill.js';
import { targetSkillsSkill } from './target-skills.skill.js';
import { targetTasksSkill } from './target-tasks.skill.js';

export function getBuilderRuntimeSkills(): RuntimeSkill[] {
	const skills: RuntimeSkill[] = [
		integrationsSkill(),
		mcpSkill(),
		targetSkillsSkill(),
		targetTasksSkill(),
		// FIXME: Research is disabled until the builder has a supported research tool.
		// Re-enable this skill only when the builder can actually perform research
		// instead of merely loading instructions that tell it to research.
		// researchSkill(),
	];

	return skills;
}
