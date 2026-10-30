import { autoApprovalPayloadSchema } from '@n8n/api-types';
import { defineAsyncComponent } from 'vue';

import type { AgentsChatInteractionExtension } from '@/features/ai/shared/agentsChat/interactionRegistry';
import type { AgentsChatHostEvent } from '@/features/ai/shared/agentsChat/types';

import type { AutoApproval } from '../autoApproval';

/** The host event that the Assistant agent sends for an action that Auto mode ran without a card. */
export const ASSISTANT_AUTO_APPROVAL_EVENT = 'auto-approval';

export function parseAssistantAutoApproval(event: AgentsChatHostEvent): AutoApproval | undefined {
	if (event.name !== ASSISTANT_AUTO_APPROVAL_EVENT) return undefined;
	const parsed = autoApprovalPayloadSchema.safeParse(event.payload);
	return parsed.success ? parsed.data : undefined;
}

/** Shows each action that Auto mode ran without a card, above the steps of the turn. */
export const assistantAutoApprovalExtension: AgentsChatInteractionExtension = {
	key: 'assistant_auto_approval',
	matchHostEvent: (event) => parseAssistantAutoApproval(event) !== undefined,
	hostEventComponent: defineAsyncComponent(
		async () => await import('./AssistantAutoApprovalStep.vue'),
	),
	hostEventPlacement: 'start',
};
