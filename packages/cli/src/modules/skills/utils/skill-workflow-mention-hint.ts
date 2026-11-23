import type { AgentSkill } from '@n8n/api-types';

import { mentionedWorkflowIds } from './skill-workflow-mentions';

export const SKILL_WORKFLOW_MENTION_HINT =
	'Each n8n://workflow/<id> link is an n8n workflow. Find and run it by its ID with your workflow tools. If you cannot find or run the workflow, stop and tell the user.';

export function withSkillWorkflowMentionHint<
	T extends Pick<AgentSkill, 'instructions' | 'references'>,
>(skill: T): T {
	if (mentionedWorkflowIds(skill).length === 0) return skill;
	return { ...skill, instructions: `${skill.instructions}\n\n${SKILL_WORKFLOW_MENTION_HINT}` };
}
