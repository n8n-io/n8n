import { ref } from 'vue';
import type { PushMessage } from '@n8n/api-types';
import { usePushConnectionStore } from '@/app/stores/pushConnection.store';

export type ExecutionStatus = 'running' | 'success' | 'error';

export interface WorkflowExecutionState {
	executionId: string;
	workflowId: string;
	status: ExecutionStatus;
	eventLog: PushMessage[];
}

const EXECUTION_EVENT_TYPES = new Set([
	'executionStarted',
	'executionFinished',
	'nodeExecuteBefore',
	'nodeExecuteAfter',
	'nodeExecuteAfterData',
]);

export function useExecutionPushEvents() {
	const workflowExecutions = ref(new Map<string, WorkflowExecutionState>());
	const executionToWorkflow = new Map<string, string>();

	const pushStore = usePushConnectionStore();

	function handlePushEvent(event: PushMessage) {
		if (!EXECUTION_EVENT_TYPES.has(event.type)) return;

		if (event.type === 'executionStarted') {
			const { executionId, workflowId } = event.data;
			executionToWorkflow.set(executionId, workflowId);
			const next = new Map(workflowExecutions.value);
			const existing = workflowExecutions.value.get(workflowId);

			// When the same execution resumes (e.g. after a Wait node timer fires),
			// the server sends a second executionStarted with the same executionId.
			// Append to the existing eventLog so the relay cursor stays valid —
			// creating a fresh log would desync with the relay's relayedCount.
			if (existing?.executionId === executionId) {
				next.set(workflowId, {
					...existing,
					status: 'running',
					eventLog: [...existing.eventLog, event],
				});
			} else {
				next.set(workflowId, {
					executionId,
					workflowId,
					status: 'running',
					eventLog: [event],
				});
			}
			workflowExecutions.value = next;

			return;
		}

		if (event.type === 'executionFinished') {
			const { executionId, workflowId, status } = event.data;
			const entry = workflowExecutions.value.get(workflowId);
			if (!entry || entry.executionId !== executionId) return;

			const next = new Map(workflowExecutions.value);
			// Keep the eventLog intact so the relay watcher can forward any events
			// that arrived since its last fire before sending the synthetic
			// executionFinished.  The relay clears the log via clearEventLog()
			// after it has processed all pending events.
			next.set(workflowId, {
				...entry,
				status: status === 'success' ? 'success' : 'error',
			});
			workflowExecutions.value = next;

			executionToWorkflow.delete(executionId);
			return;
		}

		// nodeExecuteBefore / nodeExecuteAfter / nodeExecuteAfterData
		const executionId = (event.data as { executionId: string }).executionId;
		const workflowId = executionToWorkflow.get(executionId);
		if (!workflowId) return;

		const entry = workflowExecutions.value.get(workflowId);
		if (!entry || entry.executionId !== executionId) return;

		const next = new Map(workflowExecutions.value);
		next.set(workflowId, {
			...entry,
			eventLog: [...entry.eventLog, event],
		});
		workflowExecutions.value = next;
	}

	const removeListener = pushStore.addEventListener(handlePushEvent);

	function getStatus(workflowId: string): ExecutionStatus | undefined {
		return workflowExecutions.value.get(workflowId)?.status;
	}

	function getBufferedEvents(workflowId: string): PushMessage[] {
		return workflowExecutions.value.get(workflowId)?.eventLog ?? [];
	}

	function clearEventLog(workflowId: string) {
		const entry = workflowExecutions.value.get(workflowId);
		if (!entry || entry.eventLog.length === 0) return;
		const next = new Map(workflowExecutions.value);
		next.set(workflowId, { ...entry, eventLog: [] });
		workflowExecutions.value = next;
	}

	function clearAll() {
		workflowExecutions.value = new Map();
		executionToWorkflow.clear();
	}

	function cleanup() {
		removeListener();
	}

	return {
		workflowExecutions,
		getStatus,
		getBufferedEvents,
		clearEventLog,
		clearAll,
		cleanup,
	};
}
