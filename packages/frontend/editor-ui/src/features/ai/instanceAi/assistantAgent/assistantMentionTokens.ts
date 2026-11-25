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
	if (attachment.type === 'nodes') return `nodes:${attachment.workflowId}`;
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

/** True when a token in the text points to the resource of the attachment. */
export function isMentionedInline(attachment: InstanceAiResourceAttachment, text: string): boolean {
	return listChatTokens(text).some(({ href }) => {
		const target = parseChatResourceHref(href);
		if (!target) return false;
		const [id] = target.ids;
		if (attachment.type === 'workflow' || attachment.type === 'agent') {
			return target.kind === attachment.type && id === attachment.id;
		}
		if (attachment.type === 'nodes') {
			return (target.kind === 'node' || target.kind === 'group') && id === attachment.workflowId;
		}
		return false;
	});
}
