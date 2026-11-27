import {
	getSkillWorkflowMentionUrl,
	parseAgentSkillWorkflowMentions,
	type AgentSkill,
} from '@n8n/api-types';

export const SKILL_WORKFLOW_MENTION_HINT = `Each ${getSkillWorkflowMentionUrl('<id>')} link is an n8n workflow. When this skill tells you to use one, find and run it by its ID with your workflow tools. If you cannot find or run the workflow, say so first and stop. Do not make up its result.`;

export function withSkillWorkflowMentionHint<
	T extends Pick<AgentSkill, 'instructions' | 'references'>,
>(skill: T): T {
	if (
		skill.instructions.includes(SKILL_WORKFLOW_MENTION_HINT) ||
		parseAgentSkillWorkflowMentions(skill).length === 0
	) {
		return skill;
	}
	return { ...skill, instructions: `${skill.instructions}\n\n${SKILL_WORKFLOW_MENTION_HINT}` };
}
