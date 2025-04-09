import type { ExecutionStarted } from '@n8n/api-types/push/execution';
import { useWorkflowsStore } from '@/stores/workflows.store';
import { useUIStore } from '@/stores/ui.store';
import { parse } from 'flatted';

/**
 * Handles the 'executionStarted' event, which happens when a workflow is executed.
 */
export async function executionStarted({ data }: ExecutionStarted) {
	const workflowsStore = useWorkflowsStore();
	const uiStore = useUIStore();

	// No workflow is running so ignore the message
	if (!uiStore.isActionActive.workflowRunning) {
		return;
	}

	if (!workflowsStore.activeExecutionId) {
		workflowsStore.setActiveExecutionId(data.executionId);
	}

	if (workflowsStore.workflowExecutionData?.data && data.flattedRunData) {
		workflowsStore.workflowExecutionData.data.resultData.runData = parse(data.flattedRunData);
	}
}
