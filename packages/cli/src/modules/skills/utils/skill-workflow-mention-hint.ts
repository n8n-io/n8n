import { parseSkillWorkflowMentions } from '@n8n/api-types';

export const SKILL_WORKFLOW_MENTION_HINT =
	'Each n8n://workflow/<id> link is an n8n workflow. Find and run it by its ID with your workflow tools. If you cannot find or run the workflow, stop and tell the user.';

export function withSkillWorkflowMentionHint(instructions: string): string {
	if (parseSkillWorkflowMentions(instructions).length === 0) return instructions;
	return `${instructions}\n\n${SKILL_WORKFLOW_MENTION_HINT}`;
}
