import { nextTick, watch, type ComputedRef, type Ref } from 'vue';
import type { PushMessage } from '@n8n/api-types';
import type { WorkflowExecutionState } from './useExecutionPushEvents';

interface UseEventRelayOptions {
	workflowExecutions: Ref<Map<string, WorkflowExecutionState>>;
	activeWorkflowId: ComputedRef<string | null>;
	getBufferedEvents: (wfId: string) => PushMessage[];
	clearEventLog: (wfId: string) => void;
	relay: (event: PushMessage) => void;
}

export function useEventRelay({
	workflowExecutions,
	activeWorkflowId,
	getBufferedEvents,
	clearEventLog,
	relay,
}: UseEventRelayOptions) {
	function handleIframeReady() {
		// Replay buffered events to the iframe so it catches up.
		// Use nextTick so WorkflowPreview's loadWorkflow (triggered by the same n8nReady
		// signal) runs first — the iframe needs the workflow loaded before it can process
		// execution events.
		void nextTick(() => {
			const wfId = activeWorkflowId.value;
			if (!wfId) return;
			const buffered = getBufferedEvents(wfId);
			// Reset relay cursor so we don't double-relay events already in the buffer
			relayedCount.set(wfId, buffered.length);
			for (const event of buffered) {
				relay(event);
			}
		});
	}

	// Forward live execution events to the iframe in real-time.
	// Track previous status per workflow to detect running → finished transitions
	// and relay the executionFinished event (which clears the iframe's executing node queue).
	const prevStatus = new Map<string, string>();

	// Track how many events from the eventLog have already been relayed, so that
	// if the Vue watcher coalesces multiple ref updates into a single callback we
	// still relay every event (not just the last one).
	const relayedCount = new Map<string, number>();

	watch(
		() => workflowExecutions.value,
		(executions) => {
			const wfId = activeWorkflowId.value;
			if (!wfId) return;
			const entry = executions.get(wfId);
			if (!entry) return;

			const prev = prevStatus.get(wfId);
			prevStatus.set(wfId, entry.status);

			const log = entry.eventLog;
			const alreadyRelayed = relayedCount.get(wfId) ?? 0;

			// Relay all events that haven't been relayed yet — covers the case
			// where Vue coalesced multiple ref updates into a single watcher fire.
			for (let i = alreadyRelayed; i < log.length; i++) {
				relay(log[i]);
			}
			relayedCount.set(wfId, log.length);

			if (entry.status !== 'running' && prev === 'running') {
				// Transition from running → success/error.
				// All pending events from the log have been relayed above.
				// Now clear the log and send a synthetic executionFinished so the
				// iframe clears its executing node queue.
				relayedCount.delete(wfId);
				clearEventLog(wfId);

				relay({
					type: 'executionFinished',
					data: {
						executionId: entry.executionId,
						workflowId: entry.workflowId,
						status: entry.status,
					},
				} as PushMessage);
			}
		},
	);

	return { handleIframeReady };
}
