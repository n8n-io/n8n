import type { RuntimeSkill } from '@n8n/agents';

import { configMutationSkill } from './config-mutation.skill';
import { integrationsSkill } from './integrations.skill';
import { llmSelectionSkill } from './llm-selection.skill';
import { memorySkill } from './memory.skill';
import { researchSkill } from './research.skill';
import { targetSkillsSkill } from './target-skills.skill';
import { toolsSkill } from './tools.skill';
import type { BuilderRuntimeSkillsOptions } from './types';

export function getBuilderRuntimeSkills({
	modelRecommendationsSection,
}: BuilderRuntimeSkillsOptions): RuntimeSkill[] {
	return [
		configMutationSkill(),
		llmSelectionSkill(modelRecommendationsSection),
		toolsSkill(),
		memorySkill(),
		integrationsSkill(),
		targetSkillsSkill(),
		researchSkill(),
	];
}
