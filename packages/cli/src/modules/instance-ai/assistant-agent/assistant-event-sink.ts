import type { InstanceAiEvent } from '@n8n/api-types';
import type { Logger } from '@n8n/backend-common';
import type { InstanceAiEventBus } from '@n8n/instance-ai';
import { getErrorMessage } from '@n8n/utils/errors/get-error-message';
import { toJsonValue } from '@n8n/utils/json/to-json-value';

import type { SystemAgentStartTurn } from '@/modules/agents/system-agents/system-agent.types';

type HostEventEmitter = SystemAgentStartTurn['emitHostEvent'];

/**
 * The events that the shared turn setup and the Assistant tools publish, and
 * the key of each one. An event with a key replaces the earlier event with the
 * same name and key.
 */
const HOST_EVENT_KEYS: Partial<
	Record<InstanceAiEvent['type'], (event: InstanceAiEvent) => string>
> = {
	'instance-context': () => 'turn',
	'preferences-applied': () => 'turn',
	'tasks-update': () => 'tasks',
	'setup-items': (event) =>
		event.type === 'setup-items' ? `workflow:${event.payload.workflowId}` : 'workflow',
	status: () => 'status',
};

/**
 * The event bus of an Assistant turn on the Agents runtime. It sends the
 * events that the chat shows as host events of the turn, so the history keeps
 * them. Other events have no reader on this runtime and are dropped.
 */
export class AssistantEventSink implements InstanceAiEventBus {
	constructor(
		private readonly emitHostEvent: HostEventEmitter,
		private readonly logger: Logger,
		/** Sees every published event, also the ones that the chat does not show. */
		private readonly onEvent?: (event: InstanceAiEvent) => void,
	) {}

	publish(_threadId: string, event: InstanceAiEvent): void {
		this.onEvent?.(event);
		const keyOf = HOST_EVENT_KEYS[event.type];
		if (!keyOf) return;
		const payload = 'payload' in event ? event.payload : undefined;
		try {
			this.emitHostEvent(event.type, toJsonValue(payload), { key: keyOf(event) });
		} catch (error) {
			// An event that is too large or comes after the turn settled is not shown.
			this.logger.warn('Failed to send an Assistant event to the chat', {
				type: event.type,
				error: getErrorMessage(error),
			});
		}
	}

	subscribe(): () => void {
		return () => {};
	}
}
