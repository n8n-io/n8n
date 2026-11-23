import { parseSkillWorkflowMentions, type AgentSkill } from '@n8n/api-types';

type SkillTexts = Pick<AgentSkill, 'instructions' | 'references'>;

export function mentionedWorkflowIds({ instructions, references }: SkillTexts): string[] {
	const texts = [instructions, ...(references ?? []).map(({ content }) => content)];
	const ids = texts.flatMap((text) =>
		parseSkillWorkflowMentions(text).map(({ workflowId }) => workflowId),
	);
	return [...new Set(ids)];
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
