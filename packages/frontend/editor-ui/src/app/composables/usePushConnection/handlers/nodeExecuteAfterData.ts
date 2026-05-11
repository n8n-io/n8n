import type { NodeExecuteAfterData } from '@n8n/api-types/push/execution';
import { useSchemaPreviewStore } from '@/features/ndv/runData/schemaPreview.store';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import { computed } from 'vue';
import {
	createWorkflowDocumentId,
	useWorkflowDocumentStore,
} from '@/app/stores/workflowDocument.store';

/**
 * Handles the 'nodeExecuteAfterData' event, which is sent after a node has executed and contains the resulting data.
 */
export async function nodeExecuteAfterData({ data: pushData }: NodeExecuteAfterData) {
	const workflowsStore = useWorkflowsStore();
	const workflowDocumentStore = computed(() =>
		useWorkflowDocumentStore(createWorkflowDocumentId(workflowsStore.workflowId)),
	);
	const schemaPreviewStore = useSchemaPreviewStore();

	workflowsStore.updateNodeExecutionRunData(pushData);

	const node = workflowDocumentStore.value.getNodeByName(pushData.nodeName);

	if (!node) {
		return;
	}

	void schemaPreviewStore.trackSchemaPreviewExecution(workflowsStore.workflowId, node, pushData);
}
