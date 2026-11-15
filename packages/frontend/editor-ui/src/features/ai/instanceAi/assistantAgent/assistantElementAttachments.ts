import {
	instanceAiElementAttachmentSchema,
	type InstanceAiElementAttachment,
} from '@n8n/api-types';

import type { AgentChatComposerAttachment } from '@/features/agents/utils/composer-attachments';

import { elementAttachmentLabel } from '../utils/elementAttachment';

const ELEMENT_CHIP_ID = 'element';

interface StagedChip {
	readonly chip: { readonly id: string };
	readonly clientContextPatch?: Readonly<Record<string, unknown>>;
}

export function toElementComposerAttachment(
	attachment: InstanceAiElementAttachment,
): AgentChatComposerAttachment {
	return {
		chip: {
			id: ELEMENT_CHIP_ID,
			label: elementAttachmentLabel(attachment),
			icon: 'mouse-pointer',
		},
		clientContextPatch: { attachments: [attachment] },
	};
}

export function stagedElementAppId(staged: readonly StagedChip[]): string | null {
	const element = staged.find(({ chip }) => chip.id === ELEMENT_CHIP_ID);
	const attachments = element?.clientContextPatch?.attachments;
	const parsed = instanceAiElementAttachmentSchema.safeParse(
		Array.isArray(attachments) ? attachments[0] : undefined,
	);
	return parsed.success ? parsed.data.appId : null;
}
