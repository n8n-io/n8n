import type { NodeExecuteAfterData } from '@n8n/api-types/push/execution';
import { useSchemaPreviewStore } from '@/features/ndv/runData/schemaPreview.store';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import {
	createWorkflowExecutionStateId,
	useWorkflowExecutionStateStore,
} from '@/app/stores/workflowExecutionState.store';
import { createExecutionDataId, useExecutionDataStore } from '@/app/stores/executionData.store';

/**
 * Handles the 'nodeExecuteAfterData' event, which is sent after a node has executed and contains the resulting data.
 */
export async function nodeExecuteAfterData({ data: pushData }: NodeExecuteAfterData) {
	const workflowsStore = useWorkflowsStore();
	const stateStore = useWorkflowExecutionStateStore(
		createWorkflowExecutionStateId(workflowsStore.workflowId),
	);
	const schemaPreviewStore = useSchemaPreviewStore();

	const aid = stateStore.activeExecutionId;
	if (typeof aid === 'string') {
		useExecutionDataStore(createExecutionDataId(aid)).updateNodeExecutionRunData(pushData);
	}

	void schemaPreviewStore.trackSchemaPreviewExecution(pushData);
}
