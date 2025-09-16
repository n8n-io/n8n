import type { ExecutionStarted } from '@n8n/api-types/push/execution';
import { useWorkflowsStore } from '@/stores/workflows.store';
import { useRunDataStore } from '@n8n/stores/useRunDataStore';
import { parse } from 'flatted';

/**
 * Handles the 'executionStarted' event, which happens when a workflow is executed.
 */
export async function executionStarted({ data }: ExecutionStarted) {
	const workflowsStore = useWorkflowsStore();
	const runDataStore = useRunDataStore();

	// No workflow execution is ongoing, so we can ignore this event
	if (typeof runDataStore.activeExecutionId === 'undefined') {
		return;
	} else if (runDataStore.activeExecutionId === null) {
		runDataStore.setActiveExecutionId(data.executionId);
	}

	if (workflowsStore.workflowExecutionData?.data && data.flattedRunData) {
		workflowsStore.workflowExecutionData.data.resultData.runData = parse(data.flattedRunData);
	}
}
