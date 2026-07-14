import type { RuntimeSkill } from '@n8n/agents';
import { CONFIGURE_CHANNEL_TOOL_NAME } from '@n8n/api-types';

import { integrationsSkill } from './integrations.skill';
import { mcpSkill } from './mcp.skill';
import { resourceLocatorsSkill } from './resource-locators.skill';
import { subAgentsSkill } from './sub-agents.skill';
import { targetSkillsSkill } from './target-skills.skill';
import { targetTasksSkill } from './target-tasks.skill';

/**
 * `excludeTools` mirrors `BuilderSessionOptions.excludeTools` (e.g. the
 * instance-AI sub-agent session, which has no chat-card UI and excludes
 * `configure_channel`). The integrations skill's whole instructions revolve
 * around calling `configure_channel`, so it's dropped rather than left in to
 * instruct a tool call that would fail in that session (see AGENT-353).
 */
export function getBuilderRuntimeSkills(excludeTools: string[] = []): RuntimeSkill[] {
	const skills: RuntimeSkill[] = [
		integrationsSkill(),
		mcpSkill(),
		resourceLocatorsSkill(),
		subAgentsSkill(),
		targetSkillsSkill(),
		targetTasksSkill(),
		// FIXME: Research is disabled until the builder has a supported research tool.
		// Re-enable this skill only when the builder can actually perform research
		// instead of merely loading instructions that tell it to research.
		// researchSkill(),
	];

	if (excludeTools.includes(CONFIGURE_CHANNEL_TOOL_NAME)) {
		return skills.filter((skill) => skill.id !== 'agent-builder-integrations');
	}

	return skills;
}
