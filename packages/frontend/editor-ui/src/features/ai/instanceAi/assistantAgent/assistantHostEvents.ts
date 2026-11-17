import {
	instanceContextPayloadSchema,
	statusPayloadSchema,
	type InstanceContextInjection,
} from '@n8n/api-types';
import { defineAsyncComponent } from 'vue';

import { HOST_EVENT_PLACEMENT } from '@/features/ai/shared/agentsChat/constants';
import type { AgentsChatInteractionExtension } from '@/features/ai/shared/agentsChat/interactionRegistry';
import type { AgentsChatHostEvent } from '@/features/ai/shared/agentsChat/types';

/**
 * The host event names of the Assistant turn events that the chat shows. The
 * backend sends each event under the type that it has in the Assistant runtime.
 */
export const ASSISTANT_HOST_EVENT = {
	INSTANCE_CONTEXT: 'instance-context',
	STATUS: 'status',
} as const;

/** The instance context summary of a turn, or `undefined` for another event. */
export function parseInstanceContextHostEvent(
	event: AgentsChatHostEvent,
): { injection: InstanceContextInjection } | undefined {
	if (event.name !== ASSISTANT_HOST_EVENT.INSTANCE_CONTEXT) return undefined;
	const parsed = instanceContextPayloadSchema.safeParse(event.payload);
	return parsed.success ? parsed.data : undefined;
}

/**
 * The status text of a turn, or `undefined` for another event. An empty text
 * clears the status, so it gives `undefined` too.
 */
export function parseStatusHostEvent(event: AgentsChatHostEvent): string | undefined {
	if (event.name !== ASSISTANT_HOST_EVENT.STATUS) return undefined;
	const parsed = statusPayloadSchema.safeParse(event.payload);
	return parsed.success && parsed.data.message ? parsed.data.message : undefined;
}

/** The step that tells which instance context the turn read, in the thinking block. */
export const assistantInstanceContextExtension: AgentsChatInteractionExtension = {
	key: 'assistant_instance_context',
	matchHostEvent: (event) => parseInstanceContextHostEvent(event) !== undefined,
	hostEventComponent: defineAsyncComponent(
		async () => await import('./AssistantInstanceContextHostEvent.vue'),
	),
	hostEventPlacement: HOST_EVENT_PLACEMENT.THINKING,
};

/**
 * A notice such as an MCP server that the turn could not reach. It stays above
 * the reply, so the user can still see why the turn had fewer tools.
 */
export const assistantStatusExtension: AgentsChatInteractionExtension = {
	key: 'assistant_status',
	matchHostEvent: (event) => parseStatusHostEvent(event) !== undefined,
	hostEventComponent: defineAsyncComponent(
		async () => await import('./AssistantStatusHostEvent.vue'),
	),
	hostEventPlacement: HOST_EVENT_PLACEMENT.START,
};

export const assistantHostEventExtensions: readonly AgentsChatInteractionExtension[] = [
	assistantInstanceContextExtension,
	assistantStatusExtension,
];
