import {
	instanceAiResourceAttachmentSchema,
	type InstanceAiAgentAttachment,
	type InstanceAiResourceAttachment,
	type InstanceAiWorkflowAttachment,
} from '@n8n/api-types';
import { z } from 'zod';

import {
	EMPTY_ASSISTANT_MENTION_COUNTS,
	type AssistantMentionCounts,
	type AssistantMentionItem,
} from '@/features/ai/assistant-at-mentions/assistantAtMentions.types';
import {
	buildAgentMentionKey,
	buildMentionKey,
} from '@/features/ai/assistant-at-mentions/utils/buildMentionItems';
import type { AgentChatComposerAttachment } from '@/features/agents/utils/composer-attachments';

/**
 * Mentions in the Assistant agent composer. A workflow or agent mention gets
 * its own chip. A node or group mention joins the nodes chip of its workflow.
 */

const MENTION_CHIP_PREFIX = 'mention:';

/** A staged composer chip, also in the read-only form that the panel exposes. */
export interface StagedChip {
	readonly chip: { readonly id: string };
	readonly clientContextPatch?: Readonly<Record<string, unknown>>;
}

const resourceAttachmentsSchema = z.array(instanceAiResourceAttachmentSchema);

/** The resource attachments that a chip adds to the client context. */
export function readChipAttachments(staged: StagedChip): InstanceAiResourceAttachment[] {
	const parsed = resourceAttachmentsSchema.safeParse(staged.clientContextPatch?.attachments);
	return parsed.success ? parsed.data : [];
}

/** The resource attachments of a user message, from its `references`. */
export function readMessageReferences(references: unknown): InstanceAiResourceAttachment[] {
	if (!Array.isArray(references)) return [];
	return references.flatMap((reference) => {
		const parsed = instanceAiResourceAttachmentSchema.safeParse(reference);
		return parsed.success ? [parsed.data] : [];
	});
}

export function mentionChipId(
	attachment: InstanceAiWorkflowAttachment | InstanceAiAgentAttachment,
): string {
	return `${MENTION_CHIP_PREFIX}${attachment.type}:${attachment.id}`;
}

/** The composer chip for a mentioned workflow or agent. */
export function toMentionComposerAttachment(
	attachment: InstanceAiWorkflowAttachment | InstanceAiAgentAttachment,
): AgentChatComposerAttachment {
	return {
		chip: {
			id: mentionChipId(attachment),
			// The picker always sends the name. The id is a last resort.
			label: attachment.name ?? attachment.id,
			icon: attachment.type === 'agent' ? 'robot' : 'workflow',
		},
		clientContextPatch: { attachments: [attachment] },
	};
}

/** The mention keys that the staged chips already hold, so the picker hides them. */
export function stagedMentionKeys(staged: readonly StagedChip[]): string[] {
	return mentionKeysOf(staged.flatMap(readChipAttachments));
}

/** The mention keys that resource attachments hold. */
export function mentionKeysOf(attachments: readonly InstanceAiResourceAttachment[]): string[] {
	const keys = new Set<string>();
	for (const attachment of attachments) {
		if (attachment.type === 'workflow') {
			keys.add(buildMentionKey('workflow', attachment.id, attachment.id));
		} else if (attachment.type === 'agent') {
			keys.add(buildAgentMentionKey(attachment.id));
		} else if (attachment.type === 'nodes') {
			for (const set of attachment.sets) {
				if (set.canvasGroupId) {
					keys.add(buildMentionKey('group', attachment.workflowId, set.canvasGroupId));
					continue;
				}
				for (const node of set.nodes) {
					keys.add(buildMentionKey('node', attachment.workflowId, node.id));
				}
			}
		}
	}
	return [...keys];
}

/** The number of resource attachments that the staged chips send. */
export function countStagedAttachments(staged: readonly StagedChip[]): number {
	return staged.reduce((count, chip) => count + readChipAttachments(chip).length, 0);
}

/** Mentions by kind, plus a total. */
export function countMentions(items: readonly AssistantMentionItem[]): AssistantMentionCounts {
	const counts: AssistantMentionCounts = { ...EMPTY_ASSISTANT_MENTION_COUNTS };
	for (const item of items) {
		counts[item.kind]++;
		counts.total++;
	}
	return counts;
}
