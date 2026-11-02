import type { InstanceAiElementAttachment } from '@n8n/api-types';

import type { AgentChatComposerAttachment } from '@/features/agents/utils/composer-attachments';

import { elementAttachmentLabel } from '../utils/elementAttachment';

const ELEMENT_CHIP_PREFIX = 'element:';

export function toElementComposerAttachment(
	attachment: InstanceAiElementAttachment,
): AgentChatComposerAttachment {
	return {
		chip: {
			id: `${ELEMENT_CHIP_PREFIX}${attachment.appId}`,
			label: elementAttachmentLabel(attachment),
			icon: 'mouse-pointer',
		},
		clientContextPatch: { attachments: [attachment] },
	};
}

export function stagedElementAppId(
	staged: readonly { readonly chip: { readonly id: string } }[],
): string | null {
	const chip = staged.find(({ chip: { id } }) => id.startsWith(ELEMENT_CHIP_PREFIX));
	return chip ? chip.chip.id.slice(ELEMENT_CHIP_PREFIX.length) : null;
}
