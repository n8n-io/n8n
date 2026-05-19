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

	// Per-execution flag: did we already relay a synthetic executionFinished
	// for this run? Keyed by executionId so a re-execution starts fresh.
	const finishedSynthSent = new Set<string>();

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
					if (prevExecId) finishedSynthSent.delete(prevExecId);
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
					finishedSynthSent.add(entry.executionId);
				}
				// Inactive + finished: keep the eventLog buffered. The watcher on
				// activeWorkflowId below replays these once the user opens the tab,
				// which lets build-phase verification runs (the agent runs the
				// workflow before its tab is active) be visible after the build.
				// The buffer is bounded: useExecutionPushEvents replaces the entry
				// when a new executionId arrives for the same workflow.
			}
		},
	);

	/**
	 * Called by InstanceAiWorkflowPreview after a workflow fetch resolves and
	 * the new workflow has been sent to the iframe via `openWorkflow`. Replays
	 * any buffered execution events for this workflow (typically: a build-phase
	 * verification run that finished before the user opened the tab) so the
	 * canvas paints them. The `relayedCount` cursor prevents double-relay if
	 * `workflow-loaded` fires multiple times for the same workflow ref.
	 */
	function handleWorkflowLoaded(wfId: string) {
		if (activeWorkflowId.value !== wfId) return; // user switched again
		const current = workflowExecutions.value.get(wfId);
		if (!current || current.eventLog.length === 0) return;

		const log = current.eventLog;
		const alreadyRelayed = relayedCount.get(wfId) ?? 0;
		for (let i = alreadyRelayed; i < log.length; i++) {
			relay(log[i]);
		}
		relayedCount.set(wfId, log.length);

		// If the run already finished while inactive, the eventLog has the
		// per-node events but useExecutionPushEvents doesn't store
		// `executionFinished` in the log — it just updates status. Send a
		// synthetic one so the iframe clears its executing-node queue.
		// Gated by `finishedSynthSent` so re-loading the same workflow
		// doesn't double-fire it.
		if (current.status !== 'running' && !finishedSynthSent.has(current.executionId)) {
			finishedSynthSent.add(current.executionId);
			relay({
				type: 'executionFinished',
				data: {
					executionId: current.executionId,
					workflowId: current.workflowId,
					status: current.status,
				},
			} as PushMessage);
		}
	}

	return { handleIframeReady, handleWorkflowLoaded };
}
