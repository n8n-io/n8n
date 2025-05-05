import type { ExecutionStarted } from '@n8n/api-types/push/execution';
import { useWorkflowsStore } from '@/stores/workflows.store';
import { parse } from 'flatted';

/**
 * Handles the 'executionStarted' event, which happens when a workflow is executed.
 */
export async function executionStarted({ data }: ExecutionStarted) {
	const workflowsStore = useWorkflowsStore();

	// No workflow execution is ongoing, so we can ignore this event
	if (typeof workflowsStore.activeExecutionId === 'undefined') {
		return;
	} else if (workflowsStore.activeExecutionId === null) {
		workflowsStore.setActiveExecutionId(data.executionId);
	}

	if (workflowsStore.workflowExecutionData?.data && data.flattedRunData) {
		workflowsStore.workflowExecutionData.data.resultData.runData = parse(data.flattedRunData);
	}
}
