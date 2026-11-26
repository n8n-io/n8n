import type { InstanceAiEvent, InstanceAiSetupItem } from '@n8n/api-types';
import type { Logger } from '@n8n/backend-common';
import type { InstanceAiEventBus } from '@n8n/instance-ai';
import { getErrorMessage } from '@n8n/utils/errors/get-error-message';
import { toJsonValue } from '@n8n/utils/json/to-json-value';

import type { SystemAgentStartTurn } from '@/modules/agents/system-agents/system-agent.types';

type SetupItemsSnapshot = { workflowId: string; items: InstanceAiSetupItem[] };

type HostEventEmitters = Pick<SystemAgentStartTurn, 'emitHostEvent' | 'emitTransientHostEvent'>;

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
	'auto-approval': (event) =>
		event.type === 'auto-approval' ? `tool-call:${event.payload.toolCallId}` : 'tool-call',
	status: () => 'status',
};

/** Live previews. History does not keep them: a later draft or the saved workflow replaces each one. */
const TRANSIENT_EVENT_TYPES: ReadonlySet<InstanceAiEvent['type']> = new Set([
	'workflow-draft',
	'workflow-draft-issues',
]);

/**
 * The event bus of an Assistant turn on the Agents runtime. It sends the
 * events that the chat shows as host events of the turn, so the history keeps
 * them. Other events have no reader on this runtime and are dropped.
 */
export class AssistantEventSink implements InstanceAiEventBus {
	/** The setup checklists that this turn recorded, by workflow, oldest first. */
	private readonly setupItems = new Map<string, InstanceAiSetupItem[]>();

	constructor(
		private readonly emitters: HostEventEmitters,
		private readonly logger: Logger,
		/** Sees every published event, also the ones that the chat does not show. */
		private readonly onEvent?: (event: InstanceAiEvent) => void,
	) {}

	publish(_threadId: string, event: InstanceAiEvent): void {
		this.onEvent?.(event);
		const keyOf = HOST_EVENT_KEYS[event.type];
		const transient = TRANSIENT_EVENT_TYPES.has(event.type);
		if (!keyOf && !transient) return;
		try {
			// Inside the `try`: a payload that does not convert must not stop the turn.
			const payload = toJsonValue('payload' in event ? event.payload : undefined);
			if (keyOf) this.emitters.emitHostEvent(event.type, payload, { key: keyOf(event) });
			else this.emitters.emitTransientHostEvent(event.type, payload);
			if (event.type === 'setup-items') {
				this.setupItems.delete(event.payload.workflowId);
				this.setupItems.set(event.payload.workflowId, event.payload.items);
			}
		} catch (error) {
			// An event that is too large or comes after the turn settled is not shown.
			this.logger.warn('Failed to send an Assistant event to the chat', {
				type: event.type,
				error: getErrorMessage(error),
			});
		}
	}

	/**
	 * The latest checklist of each workflow, oldest workflow first. The checklists
	 * of this turn replace the `earlier` ones. The setup tools read these back to
	 * confirm that the chat accepted a checklist.
	 */
	setupItemsSnapshots(earlier: SetupItemsSnapshot[] = []): SetupItemsSnapshot[] {
		const latest = new Map<string, InstanceAiSetupItem[]>();
		const add = (workflowId: string, items: InstanceAiSetupItem[]) => {
			latest.delete(workflowId);
			latest.set(workflowId, items);
		};
		for (const { workflowId, items } of earlier) add(workflowId, items);
		for (const [workflowId, items] of this.setupItems) add(workflowId, items);
		return [...latest].map(([workflowId, items]) => ({ workflowId, items }));
	}

	subscribe(): () => void {
		return () => {};
	}
}
