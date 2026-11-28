import type {
	InstanceAiAttachment,
	InstanceAiNodesAttachment,
	InstanceAiResourceAttachment,
} from '@n8n/api-types';
import {
	formatChatResourceHref,
	listChatTokens,
	parseChatResourceHref,
	type ChatToken,
} from '@n8n/utils/chat-tokens';

import type { AssistantMentionItem } from '@/features/ai/assistant-at-mentions/assistantAtMentions.types';
import { mergeNodeSets } from '@/features/ai/instanceAi/utils/buildNodesAttachment';

/**
 * Inline mentions in the Assistant agent composer. A pick stays in the message
 * text as a token, `[@Orders](n8n-resource://workflow/abc)`. The token keeps the
 * position of the mention for the agent, and the sent message shows it in place.
 * The structured attachment of each mention still goes in the client context,
 * so the agent also gets the details that the token does not carry.
 */

/** A picked mention: what the picker showed and what the message sends. */
export interface PickedMention {
	item: AssistantMentionItem;
	attachment: InstanceAiResourceAttachment;
}

/** The token target of a picked item. */
export function mentionHref(item: AssistantMentionItem): string {
	if (item.kind === 'agent') return formatChatResourceHref('agent', item.entityId);
	if (item.kind === 'workflow') return formatChatResourceHref('workflow', item.workflowId);
	return formatChatResourceHref(item.kind, item.workflowId, item.entityId);
}

/** The token that a pick puts in the text. */
export function mentionToken(item: AssistantMentionItem): ChatToken {
	return { label: item.label, href: mentionHref(item) };
}

/** The distinct token targets of a text, in order. */
export function mentionHrefsOf(text: string): string[] {
	return [...new Set(listChatTokens(text).map(({ href }) => href))];
}

/**
 * The attachment of a token that the picker did not stage, for example after
 * the composer remounted. Only a workflow can be rebuilt from its target.
 */
function attachmentFromToken(token: ChatToken): InstanceAiResourceAttachment | undefined {
	const target = parseChatResourceHref(token.href);
	if (target?.kind !== 'workflow' || target.ids.length !== 1) return undefined;
	return { type: 'workflow', id: target.ids[0], name: token.label };
}

/**
 * The resource attachments for the tokens of a text, one for each resource.
 * Node and group mentions of one workflow join one nodes attachment.
 */
export function mentionAttachmentsOf(
	text: string,
	picked: ReadonlyMap<string, PickedMention>,
): InstanceAiResourceAttachment[] {
	const attachments: InstanceAiResourceAttachment[] = [];
	const nodesByWorkflow = new Map<string, InstanceAiNodesAttachment>();
	const seen = new Set<string>();
	for (const token of listChatTokens(text)) {
		if (seen.has(token.href)) continue;
		seen.add(token.href);
		const attachment = picked.get(token.href)?.attachment ?? attachmentFromToken(token);
		if (!attachment) continue;
		if (attachment.type !== 'nodes') {
			attachments.push(attachment);
			continue;
		}
		const existing = nodesByWorkflow.get(attachment.workflowId);
		if (existing) {
			existing.sets = mergeNodeSets(existing.sets, attachment.sets);
			continue;
		}
		const copy: InstanceAiNodesAttachment = { ...attachment, sets: [...attachment.sets] };
		nodesByWorkflow.set(attachment.workflowId, copy);
		attachments.push(copy);
	}
	return attachments;
}

function resourceKey(attachment: InstanceAiAttachment): string | undefined {
	if (attachment.type === 'workflow' || attachment.type === 'agent') {
		return `${attachment.type}:${attachment.id}`;
	}
	// Only the same nodes are the same resource: other nodes of the workflow still go.
	if (attachment.type === 'nodes') {
		const sets = attachment.sets.map(
			(set) => set.canvasGroupId ?? set.nodes.map((node) => node.id).join(','),
		);
		return `nodes:${attachment.workflowId}:${sets.sort().join('|')}`;
	}
	return undefined;
}

/**
 * The attachments whose resource is not in `existing`. The empty view sends the
 * attachments of its mentions with the message, so the thread view must not add them again.
 */
export function withoutAttachedResources(
	attachments: readonly InstanceAiResourceAttachment[],
	existing: readonly InstanceAiAttachment[],
): InstanceAiResourceAttachment[] {
	const keys = new Set(existing.map(resourceKey));
	return attachments.filter((attachment) => !keys.has(resourceKey(attachment)));
}

/**
 * True when the tokens in the text show all of the attachment. A nodes
 * attachment can also hold nodes that a composer chip added, so each of its
 * sets must have a token: its group, or each of its nodes.
 */
export function isMentionedInline(attachment: InstanceAiResourceAttachment, text: string): boolean {
	const targets = new Set<string>();
	for (const { href } of listChatTokens(text)) {
		const target = parseChatResourceHref(href);
		if (target) targets.add(`${target.kind}:${target.ids.join('/')}`);
	}
	if (attachment.type === 'workflow' || attachment.type === 'agent') {
		return targets.has(`${attachment.type}:${attachment.id}`);
	}
	if (attachment.type !== 'nodes') return false;
	const { workflowId } = attachment;
	return attachment.sets.every((set) =>
		set.canvasGroupId
			? targets.has(`group:${workflowId}/${set.canvasGroupId}`)
			: set.nodes.every((node) => targets.has(`node:${workflowId}/${node.id}`)),
	);
}
