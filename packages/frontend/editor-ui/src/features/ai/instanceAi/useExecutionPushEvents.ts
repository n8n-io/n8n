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
	/** Monotonic counter bumped on every mutation so watchers detect changes. */
	const version = ref(0);
	const executionToWorkflow = new Map<string, string>();

	const pushStore = usePushConnectionStore();

	function handlePushEvent(event: PushMessage) {
		if (!EXECUTION_EVENT_TYPES.has(event.type)) return;

		const map = workflowExecutions.value;

		if (event.type === 'executionStarted') {
			const { executionId, workflowId } = event.data;
			executionToWorkflow.set(executionId, workflowId);
			map.set(workflowId, {
				executionId,
				workflowId,
				status: 'running',
				eventLog: [event],
			});
			version.value++;
			return;
		}

		if (event.type === 'executionFinished') {
			const { executionId, workflowId, status } = event.data;
			const entry = map.get(workflowId);
			if (!entry || entry.executionId !== executionId) return;

			entry.status = status === 'success' ? 'success' : 'error';
			entry.eventLog = [];
			version.value++;

			executionToWorkflow.delete(executionId);
			return;
		}

		// nodeExecuteBefore / nodeExecuteAfter / nodeExecuteAfterData
		const executionId = (event.data as { executionId: string }).executionId;
		const workflowId = executionToWorkflow.get(executionId);
		if (!workflowId) return;

		const entry = map.get(workflowId);
		if (!entry || entry.executionId !== executionId) return;

		entry.eventLog.push(event);
		version.value++;
	}

	const removeListener = pushStore.addEventListener(handlePushEvent);

	function getStatus(workflowId: string): ExecutionStatus | undefined {
		return workflowExecutions.value.get(workflowId)?.status;
	}

	function getBufferedEvents(workflowId: string): PushMessage[] {
		return workflowExecutions.value.get(workflowId)?.eventLog ?? [];
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
		/** Bumped on every mutation — watch this to detect changes. */
		version,
		getStatus,
		getBufferedEvents,
		clearAll,
		cleanup,
	};
}
