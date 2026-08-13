import type { RuntimeSkill } from '@n8n/agents';

import { customToolsSkill } from './custom-tools.skill';
import { externalServicesSkill } from './external-services.skill';
import { goalGraphSkill } from './goal-graph.skill';
import { memorySkill } from './memory.skill';
import { resourceLocatorsSkill } from './resource-locators.skill';
import { subAgentsSkill } from './sub-agents.skill';
import { targetSkillsSkill } from './target-skills.skill';
import { targetTasksSkill } from './target-tasks.skill';

export interface BuilderRuntimeSkillsOptions {
	/** Offer the goal-graph guardrail skill (requires the `goal-graph` module). */
	goalGraphEnabled?: boolean;
}

export function getBuilderRuntimeSkills(options: BuilderRuntimeSkillsOptions = {}): RuntimeSkill[] {
	return [
		customToolsSkill(),
		externalServicesSkill(),
		memorySkill(),
		resourceLocatorsSkill(),
		subAgentsSkill(),
		targetSkillsSkill(),
		targetTasksSkill(),
		...(options.goalGraphEnabled ? [goalGraphSkill()] : []),
		// FIXME: Research is disabled until the builder has a supported research tool.
		// Re-enable this skill only when the builder can actually perform research
		// instead of merely loading instructions that tell it to research.
		// researchSkill(),
	];
}
