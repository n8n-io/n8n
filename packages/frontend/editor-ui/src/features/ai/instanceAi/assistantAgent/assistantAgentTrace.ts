import type { AgentSseEvent } from '@n8n/api-types';

/** The same limit as the event buffer of the current Assistant debug panel. */
export const MAX_TRACE_EVENTS = 1000;

export interface AssistantAgentTraceEvent {
	receivedAt: string;
	event: AgentSseEvent;
}

type DeltaEvent = Extract<
	AgentSseEvent,
	{ type: 'text-delta' | 'reasoning-delta' | 'tool-input-delta' }
>;

function isDeltaEvent(event: AgentSseEvent): event is DeltaEvent {
	return (
		event.type === 'text-delta' ||
		event.type === 'reasoning-delta' ||
		event.type === 'tool-input-delta'
	);
}

function deltaKey(event: DeltaEvent): string {
	return `${event.type}:${event.type === 'tool-input-delta' ? event.toolCallId : event.id}`;
}

/**
 * Adds an event to the trace. A delta for the same part as the last event joins
 * it, so the limit counts whole parts and not each streamed fragment. Past the
 * limit, the oldest events go.
 */
export function appendTraceEvent(
	events: AssistantAgentTraceEvent[],
	event: AgentSseEvent,
	limit = MAX_TRACE_EVENTS,
): void {
	const last = events.at(-1);
	if (
		last &&
		isDeltaEvent(event) &&
		isDeltaEvent(last.event) &&
		deltaKey(last.event) === deltaKey(event)
	) {
		events[events.length - 1] = {
			receivedAt: last.receivedAt,
			event: { ...last.event, delta: last.event.delta + event.delta },
		};
		return;
	}
	events.push({ receivedAt: new Date().toISOString(), event });
	if (events.length > limit) events.splice(0, events.length - limit);
}
