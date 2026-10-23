import { isSafeObjectKey } from './instance-ai.schema';
import type { InstanceAiEvent } from './instance-ai.schema';

export interface InstanceAiEventLifecycle {
	closedRuns: Record<string, true>;
	closedAgents: Record<string, Record<string, true>>;
}

export function createInstanceAiEventLifecycle(): InstanceAiEventLifecycle {
	return { closedRuns: {}, closedAgents: {} };
}

/** Keep user actions and thread metadata available after a run ends. */
function isRunActivity(event: InstanceAiEvent): boolean {
	switch (event.type) {
		case 'thread-title-updated':
		case 'preference-card':
		case 'tasks-update':
			return false;
		default:
			return true;
	}
}

/** Check terminal facts without changing them. */
export function canAcceptInstanceAiEvent(
	state: InstanceAiEventLifecycle,
	event: InstanceAiEvent,
): boolean {
	if (!isSafeObjectKey(event.runId) || !isSafeObjectKey(event.agentId)) return false;
	if (!isRunActivity(event)) return true;
	if (state.closedRuns[event.runId]) return false;
	if (
		event.type === 'agent-spawned' &&
		(!isSafeObjectKey(event.payload.parentId) ||
			state.closedAgents[event.runId]?.[event.payload.parentId])
	)
		return false;
	return event.type === 'run-finish' || !state.closedAgents[event.runId]?.[event.agentId];
}

/** Admit an event and remember terminal facts. Normal completion permits background work. */
export function acceptInstanceAiEvent(
	state: InstanceAiEventLifecycle,
	event: InstanceAiEvent,
): boolean {
	if (!canAcceptInstanceAiEvent(state, event)) return false;
	if (event.type === 'run-finish' && event.payload.status !== 'completed') {
		state.closedRuns[event.runId] = true;
	}
	if (event.type === 'agent-completed') {
		const agents = (state.closedAgents[event.runId] ??= {});
		agents[event.agentId] = true;
	}
	return true;
}
