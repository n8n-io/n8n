export type SkillWorkflowMention = {
	workflowId: string;
	name: string;
};

const SKILL_WORKFLOW_MENTION_PATTERN =
	/\[((?:\\.|[^\\[\]\n])*)\]\(n8n:\/\/workflow\/([A-Za-z0-9_-]+)(?:\?[^)\s]*)?\)/g;

const unescapeLinkText = (text: string) => text.replace(/\\([\\[\]])/g, '$1');

const escapeLinkText = (text: string) => text.replace(/[\\[\]]/g, '\\$&');

export function parseSkillWorkflowMentions(body: string): SkillWorkflowMention[] {
	const mentions = new Map<string, SkillWorkflowMention>();
	for (const [, text, workflowId] of body.matchAll(SKILL_WORKFLOW_MENTION_PATTERN)) {
		if (!mentions.has(workflowId)) {
			mentions.set(workflowId, { workflowId, name: unescapeLinkText(text) });
		}
	}
	return [...mentions.values()];
}

export function formatSkillWorkflowMention({ workflowId, name }: SkillWorkflowMention): string {
	return `[${escapeLinkText(name)}](n8n://workflow/${workflowId})`;
}
