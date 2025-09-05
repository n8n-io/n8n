import type { NodeExecuteAfterData } from '@n8n/api-types/push/execution';
import { useSchemaPreviewStore } from '@/stores/schemaPreview.store';
import { useWorkflowsStore } from '@/stores/workflows.store';

/**
 * Handles the 'nodeExecuteAfterData' event, which is sent after a node has executed and contains the resulting data.
 */
export async function nodeExecuteAfterData({ data: pushData }: NodeExecuteAfterData) {
	const workflowsStore = useWorkflowsStore();
	const schemaPreviewStore = useSchemaPreviewStore();

	workflowsStore.updateNodeExecutionData(pushData);

	void schemaPreviewStore.trackSchemaPreviewExecution(pushData);
}
