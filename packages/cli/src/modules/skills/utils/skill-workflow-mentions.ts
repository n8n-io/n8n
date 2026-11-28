import { parseAgentSkillWorkflowMentions, type AgentSkill } from '@n8n/api-types';

type SkillTexts = Pick<AgentSkill, 'instructions' | 'references'>;

function mentionedWorkflowIds(skill: SkillTexts): string[] {
	return parseAgentSkillWorkflowMentions(skill).map(({ workflowId }) => workflowId);
}

export function addedWorkflowMentionIds(next: SkillTexts, previous?: SkillTexts): string[] {
	const previousIds = new Set(previous ? mentionedWorkflowIds(previous) : []);
	return mentionedWorkflowIds(next).filter((id) => !previousIds.has(id));
}

export function unreadableWorkflowMentionsMessage(workflowIds: string[]): string {
	const quoted = workflowIds.map((id) => `"${id}"`).join(', ');
	return workflowIds.length === 1
		? `Can't save the skill. Workflow ${quoted} doesn't exist or you don't have access to it. Remove the mention, or ask the workflow owner to share it with you.`
		: `Can't save the skill. Workflows ${quoted} don't exist or you don't have access to them. Remove the mentions, or ask the workflow owners to share them with you.`;
}

export function hasWorkflowMentions(skill: SkillTexts): boolean {
	return mentionedWorkflowIds(skill).length > 0;
}

export const INSTANCE_SKILL_WORKFLOWS_MESSAGE =
	'Workflows can be added only to project scoped skills. Remove the workflows from this skill, or save it in a project.';

export function skillWithWorkflowsMoveMessage(toInstance: boolean): string {
	return toInstance
		? 'Remove the workflows from this skill to make it global.'
		: 'Remove the workflows from this skill to move it to another project.';
}
