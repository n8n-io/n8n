import type { AgentSkill } from '../agents/types';

export type SkillWorkflowMention = {
	workflowId: string;
	name: string;
};

const SKILL_WORKFLOW_MENTION_PATTERN =
	/\[((?:\\.|[^\\[\]\n])*)\]\(n8n:\/\/workflow\/([A-Za-z0-9_-]+)(?:\?[^)\s]*)?\)/g;

const unescapeLinkText = (text: string) => text.replace(/\\([\\[\]])/g, '$1');

const escapeLinkText = (text: string) =>
	text.replace(/\s*[\r\n]+\s*/g, ' ').replace(/[\\[\]]/g, '\\$&');

export function parseSkillWorkflowMentions(body: string): SkillWorkflowMention[] {
	const mentions = new Map<string, SkillWorkflowMention>();
	for (const [, text, workflowId] of body.matchAll(SKILL_WORKFLOW_MENTION_PATTERN)) {
		if (!mentions.has(workflowId)) {
			mentions.set(workflowId, { workflowId, name: unescapeLinkText(text) });
		}
	}
	return [...mentions.values()];
}

export function parseAgentSkillWorkflowMentions(
	skill: Pick<AgentSkill, 'instructions' | 'references'>,
): SkillWorkflowMention[] {
	const files = [skill.instructions, ...(skill.references ?? []).map(({ content }) => content)];
	return parseSkillWorkflowMentions(files.join('\n'));
}

export function getSkillWorkflowMentionUrl(workflowId: string): string {
	return `n8n://workflow/${workflowId}`;
}

export const SKILL_WORKFLOW_MENTION_HINT = `To make a skill run an n8n workflow, link the workflow in the instructions as [Workflow name](${getSkillWorkflowMentionUrl('<workflow-id>')}).`;

export function formatSkillWorkflowMention({ workflowId, name }: SkillWorkflowMention): string {
	return `[${escapeLinkText(name)}](${getSkillWorkflowMentionUrl(workflowId)})`;
}

export function renameSkillWorkflowMentions(
	body: string,
	namesByWorkflowId: ReadonlyMap<string, string>,
): string {
	return body.replace(SKILL_WORKFLOW_MENTION_PATTERN, (link, text: string, workflowId: string) => {
		const name = namesByWorkflowId.get(workflowId);
		if (name === undefined) return link;
		return `[${escapeLinkText(name)}]${link.slice(text.length + 2)}`;
	});
}

export function replaceSkillWorkflowMentionUrls(
	body: string,
	urlForWorkflow: (workflowId: string) => string,
): string {
	return body.replace(
		SKILL_WORKFLOW_MENTION_PATTERN,
		(_link, text: string, workflowId: string) => `[${text}](${urlForWorkflow(workflowId)})`,
	);
}
