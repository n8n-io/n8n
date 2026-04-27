import type { NodeExecuteAfterData } from '@n8n/api-types/push/execution';
import { useSchemaPreviewStore } from '@/features/ndv/runData/schemaPreview.store';
import type { WorkflowState } from '@/app/composables/useWorkflowState';
import { useExecutionDataStore } from '@/app/stores/executionData.store';

/**
 * Handles the 'nodeExecuteAfterData' event, which is sent after a node has executed and contains the resulting data.
 */
export async function nodeExecuteAfterData(
	{ data: pushData }: NodeExecuteAfterData,
	_options: { workflowState: WorkflowState },
) {
	const schemaPreviewStore = useSchemaPreviewStore();

	useExecutionDataStore(pushData.executionId).updateNodeExecutionRunData(pushData);

	void schemaPreviewStore.trackSchemaPreviewExecution(pushData);
}
