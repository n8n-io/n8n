import type { RuntimeSkill } from '@n8n/agents';

import { integrationsSkill } from './integrations.skill';
import { targetSkillsSkill } from './target-skills.skill';

export function getBuilderRuntimeSkills(): RuntimeSkill[] {
	return [
		integrationsSkill(),
		targetSkillsSkill(),
		// FIXME: Research is disabled until the builder has a supported research tool.
		// Re-enable this skill only when the builder can actually perform research
		// instead of merely loading instructions that tell it to research.
		// researchSkill(),
	];
}
