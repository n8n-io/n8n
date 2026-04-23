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

	// Track the last-seen executionId per workflow so we can detect when a new
	// execution replaces the previous one (useExecutionPushEvents assigns a fresh
	// eventLog on executionStarted) and reset the relay cursor accordingly.
	const lastExecutionId = new Map<string, string>();

	watch(
		() => workflowExecutions.value,
		(executions) => {
			const activeId = activeWorkflowId.value;

			for (const [wfId, entry] of executions) {
				// Detect a re-execution on the same workflow: the new eventLog starts
				// fresh, so our relay cursor from the previous execution is stale and
				// would cause us to skip the new execution's events.
				// We only reset when we've previously seen a different executionId —
				// an initial undefined prevExecId could be a handleIframeReady that
				// already set relayedCount to the buffered length, and resetting here
				// would cause double-relay.
				const prevExecId = lastExecutionId.get(wfId);
				if (prevExecId !== undefined && prevExecId !== entry.executionId) {
					relayedCount.delete(wfId);
				}
				lastExecutionId.set(wfId, entry.executionId);

				const isActive = wfId === activeId;
				const prev = prevStatus.get(wfId);
				prevStatus.set(wfId, entry.status);

				if (isActive) {
					const log = entry.eventLog;
					const alreadyRelayed = relayedCount.get(wfId) ?? 0;

					// Relay all events that haven't been relayed yet — covers the case
					// where Vue coalesced multiple ref updates into a single watcher fire.
					for (let i = alreadyRelayed; i < log.length; i++) {
						relay(log[i]);
					}
					relayedCount.set(wfId, log.length);
				}

				const isFinished = entry.status !== 'running';

				// When Vue coalesces multiple ref updates, the watcher may fire for the
				// first time with the execution already finished (prev is undefined).
				// Treat undefined the same as 'running' — the entry only exists because
				// an executionStarted was captured, so it was running at some point.
				const wasRunning = prev === 'running' || prev === undefined;

				if (isFinished && wasRunning && isActive) {
					// Active workflow transitioned running → finished.
					// All pending events were relayed above. Clear the log and send a
					// synthetic executionFinished so the iframe clears its executing
					// node queue.
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
				} else if (isFinished && !isActive && entry.eventLog.length > 0) {
					// Inactive workflow finished — drop its buffered events so that if
					// the user later switches to this tab and the iframe becomes ready,
					// we don't replay events from an execution that has already
					// completed.
					relayedCount.delete(wfId);
					clearEventLog(wfId);
				}
			}
		},
	);

	return { handleIframeReady };
}
