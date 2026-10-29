import {
	instanceAiAttachmentSchema,
	instanceAiNodesAttachmentSchema,
	type InstanceAiNodesAttachment,
} from '@n8n/api-types';
import { i18n } from '@n8n/i18n';
import { z } from 'zod';

import type { AgentChatComposerAttachment } from '@/features/agents/utils/composer-attachments';

import { countAttachedNodes, mergeNodeSets } from '../utils/buildNodesAttachment';

/**
 * Canvas nodes that the user adds to the Assistant agent chat. The composer
 * shows one chip for each workflow, and the chip sends the nodes as an
 * attachment in the client context of the next message.
 */

const NODES_CHIP_PREFIX = 'nodes:';

/** A staged composer chip, also in the read-only form that the panel exposes. */
interface StagedChip {
	readonly chip: { readonly id: string };
	readonly clientContextPatch?: Readonly<Record<string, unknown>>;
}

/** The nodes attachment that a composer chip stages, if the chip is one. */
export function readNodesAttachment(
	attachment: StagedChip | undefined,
): InstanceAiNodesAttachment | undefined {
	if (!attachment?.chip.id.startsWith(NODES_CHIP_PREFIX)) return undefined;
	const staged = attachment.clientContextPatch?.attachments;
	const parsed = instanceAiNodesAttachmentSchema.safeParse(
		Array.isArray(staged) ? staged[0] : undefined,
	);
	return parsed.success ? parsed.data : undefined;
}

/**
 * The composer chip for the nodes of one workflow. Nodes that the chip of the
 * workflow already stages stay, so adding more nodes joins them.
 */
export function toNodesComposerAttachment(
	attachment: InstanceAiNodesAttachment,
	staged: readonly StagedChip[],
): AgentChatComposerAttachment {
	const id = `${NODES_CHIP_PREFIX}${attachment.workflowId}`;
	const existing = readNodesAttachment(staged.find(({ chip }) => chip.id === id));
	const merged: InstanceAiNodesAttachment = existing
		? { ...existing, sets: mergeNodeSets(existing.sets, attachment.sets) }
		: attachment;
	return {
		chip: {
			id,
			label: i18n.baseText('instanceAi.nodeContext.nodesBundle', {
				interpolate: { count: countAttachedNodes([merged]) },
			}),
			icon: 'layers',
		},
		clientContextPatch: { attachments: [merged] },
	};
}

/** The number of canvas nodes that a sent message attached. */
export function countSentNodes(clientContext: Record<string, unknown> | undefined): number {
	const parsed = z.array(instanceAiAttachmentSchema).safeParse(clientContext?.attachments);
	return parsed.success ? countAttachedNodes(parsed.data) : 0;
}
