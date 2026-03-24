import type { ExecutionStarted } from '@n8n/api-types/push/execution';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import { parse } from 'flatted';
import type { WorkflowState } from '@/app/composables/useWorkflowState';

/**
 * Handles the 'executionStarted' event, which happens when a workflow is executed.
 */
export async function executionStarted(
	{ data }: ExecutionStarted,
	options: { workflowState: WorkflowState },
) {
	const workflowsStore = useWorkflowsStore();

	// No workflow execution is ongoing, so we can ignore this event
	if (typeof workflowsStore.activeExecutionId === 'undefined') {
		return;
	} else if (workflowsStore.activeExecutionId === null) {
		options.workflowState.setActiveExecutionId(data.executionId);
	}

	// Initialize workflowExecutionData if not set (e.g. DemoLayout iframe receiving
	// push events for an execution it didn't trigger).
	if (!workflowsStore.workflowExecutionData?.data) {
		options.workflowState.setWorkflowExecutionData({
			id: data.executionId,
			finished: false,
			mode: 'manual',
			status: 'running',
			startedAt: new Date(),
			workflowData: {
				id: '',
				name: '',
				nodes: [],
				connections: {},
				createdAt: '',
				updatedAt: '',
				versionId: '',
			},
			data: { resultData: { runData: {}, lastNodeExecuted: '' } },
		} as never);
	}

	if (workflowsStore.workflowExecutionData?.data && data.flattedRunData) {
		workflowsStore.workflowExecutionData.data.resultData.runData = parse(data.flattedRunData);
	}
}
