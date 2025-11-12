import type { NodeExecuteBefore } from '@n8n/api-types/push/execution';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import type { WorkflowState } from '@/app/composables/useWorkflowState';

/**
 * Handles the 'nodeExecuteBefore' event, which happens before a node is executed.
 */
export async function nodeExecuteBefore(
	{ data }: NodeExecuteBefore,
	{ workflowState }: { workflowState: WorkflowState },
) {
	const workflowsStore = useWorkflowsStore();

	console.log('[nodeExecuteBefore] Node starting execution:', {
		nodeName: data.nodeName,
		executionId: data.executionId,
		parentExecutionId: data.parentExecutionId,
	});

	// Track sub-execution relationship for same-canvas scenarios
	if (data.parentExecutionId) {
		workflowState.trackSubExecution(data.executionId, data.parentExecutionId);
	}

	workflowState.executingNode.addExecutingNode(data.nodeName);
	workflowsStore.addNodeExecutionStartedData(data);
}
