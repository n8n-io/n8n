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
	// Watch only the active workflow's status and event log length to avoid
	// re-running on every Map reference replacement.
	let prevStatus: string | undefined;
	let prevLogLength = 0;

	watch(
		() => {
			const wfId = activeWorkflowId.value;
			if (!wfId) return undefined;
			const entry = workflowExecutions.value.get(wfId);
			if (!entry) return undefined;
			return { status: entry.status, logLength: entry.eventLog.length, wfId };
		},
		(current) => {
			if (!current) return;
			const entry = workflowExecutions.value.get(current.wfId);
			if (!entry) return;

			const prev = prevStatus;
			prevStatus = current.status;

			if (current.status === 'running' && current.logLength > prevLogLength) {
				prevLogLength = current.logLength;
				relay(entry.eventLog[entry.eventLog.length - 1]);
			} else if (prev === 'running' && current.status !== 'running') {
				prevLogLength = 0;
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
