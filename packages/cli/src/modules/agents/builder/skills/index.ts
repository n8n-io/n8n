import type { RuntimeSkill } from '@n8n/agents';

import { configMutationSkill } from './config-mutation.skill';
import { integrationsSkill } from './integrations.skill';
import { llmSelectionSkill } from './llm-selection.skill';
import { memorySkill } from './memory.skill';
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
		// FIXME: Research is disabled until the builder has a supported web-search tool.
		// The current builder model path can be backed by AI SDK v2 Anthropic models,
		// while provider tools from the runtime use the AI SDK v3 shape. Re-enable this
		// skill only when the builder can actually perform web research instead of
		// merely loading instructions that tell it to research.
		// researchSkill(),
	];
}
