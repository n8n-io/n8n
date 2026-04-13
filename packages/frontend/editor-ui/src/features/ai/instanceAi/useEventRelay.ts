import { nextTick, watch, type ComputedRef, type Ref } from 'vue';
import type { PushMessage } from '@n8n/api-types';
import type { WorkflowExecutionState } from './useExecutionPushEvents';

interface UseEventRelayOptions {
	workflowExecutions: Ref<Map<string, WorkflowExecutionState>>;
	activeWorkflowId: ComputedRef<string | null>;
	getBufferedEvents: (wfId: string) => PushMessage[];
	relay: (event: PushMessage) => void;
}

export function useEventRelay({
	workflowExecutions,
	activeWorkflowId,
	getBufferedEvents,
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
			for (const event of buffered) {
				relay(event);
			}
		});
	}

	// Forward live execution events to the iframe in real-time.
	// Track previous status per workflow to detect running → finished transitions
	// and relay the executionFinished event (which clears the iframe's executing node queue).
	const prevStatus = new Map<string, string>();

	watch(
		() => workflowExecutions.value,
		(executions) => {
			const wfId = activeWorkflowId.value;
			if (!wfId) return;
			const entry = executions.get(wfId);
			if (!entry) return;

			const prev = prevStatus.get(wfId);
			prevStatus.set(wfId, entry.status);

			if (entry.status === 'running') {
				const log = entry.eventLog;
				if (log.length > 0) {
					relay(log[log.length - 1]);
				}
			} else if (prev === 'running') {
				// Transition from running → success/error: relay a synthetic executionFinished
				// so the iframe clears its executing node queue.
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
