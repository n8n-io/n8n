import type { RuntimeSkill } from '@n8n/agents';

import { customToolsSkill } from './custom-tools.skill';
import { externalServicesSkill } from './external-services.skill';
import { memorySkill } from './memory.skill';
import { nodeToolsSkill } from './node-tools.skill';
import { resourceLocatorsSkill } from './resource-locators.skill';
import { subAgentsSkill } from './sub-agents.skill';
import { targetSkillsSkill } from './target-skills.skill';
import { targetTasksSkill } from './target-tasks.skill';
import { getModelRecommendationsSection } from '../agents-builder-model-recommendations';
import { buildAgentBuilderGuide } from '../agents-builder-prompts';

/** Instance AI's skill that routes Agent intents; every builder skill hangs off it. */
const INSTANCE_AI_AGENT_BUILDER_SKILL_ID = 'agent-builder';

export const AGENT_BUILDER_GUIDE_SKILL_ID = 'agent-builder-guide';

export function getBuilderRuntimeSkills(): RuntimeSkill[] {
	return [
		customToolsSkill(),
		externalServicesSkill(),
		memorySkill(),
		nodeToolsSkill(),
		resourceLocatorsSkill(),
		subAgentsSkill(),
		targetSkillsSkill(),
		targetTasksSkill(),
		// FIXME: Research is disabled until the builder has a supported research tool.
		// Re-enable this skill only when the builder can actually perform research
		// instead of merely loading instructions that tell it to research.
		// researchSkill(),
	];
}

/**
 * The builder guidance for the Instance AI orchestrator: the full build
 * procedure plus the specialized builder skills. Each one lists
 * `agent-builder` as its parent, so the catalog hides them and loading
 * `agent-builder` offers them as references.
 */
export async function getAgentBuilderRuntimeSkills(): Promise<RuntimeSkill[]> {
	const parents = [INSTANCE_AI_AGENT_BUILDER_SKILL_ID];
	const guide: RuntimeSkill = {
		id: AGENT_BUILDER_GUIDE_SKILL_ID,
		name: 'Agent Builder Guide',
		description:
			'Required before the first Agent Builder tool call: config rules, model selection, ' +
			'memory, tools, interactive setup, the initial build, testing, and publishing.',
		instructions: buildAgentBuilderGuide({
			modelRecommendationsSection: await getModelRecommendationsSection(),
		}),
	};
	return [guide, ...getBuilderRuntimeSkills()].map((skill) => ({ ...skill, parents }));
}
