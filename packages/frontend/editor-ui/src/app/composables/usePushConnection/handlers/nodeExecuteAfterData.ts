import type { NodeExecuteAfterData } from '@n8n/api-types/push/execution';
import { useSchemaPreviewStore } from '@/features/ndv/runData/schemaPreview.store';
import type { WorkflowState } from '@/app/composables/useWorkflowState';

/**
 * Handles the 'nodeExecuteAfterData' event, which is sent after a node has executed and contains the resulting data.
 */
export async function nodeExecuteAfterData(
	{ data: pushData }: NodeExecuteAfterData,
	{ workflowState }: { workflowState: WorkflowState },
) {
	const schemaPreviewStore = useSchemaPreviewStore();

	workflowState.getCurrentWorkflowDocumentStore()?.updateNodeExecutionRunData(pushData);

	void schemaPreviewStore.trackSchemaPreviewExecution(pushData);
}
