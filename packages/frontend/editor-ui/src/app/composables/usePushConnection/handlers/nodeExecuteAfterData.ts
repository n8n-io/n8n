import type { NodeExecuteAfterData } from '@n8n/api-types/push/execution';
import { useSchemaPreviewStore } from '@/features/ndv/runData/schemaPreview.store';
import { getCurrentWorkflowId } from '@/app/composables/useWorkflowId';
import { computed } from 'vue';
import { useWorkflowExecutionStateStore } from '@/app/stores/workflowExecutionState.store';
import { createExecutionDataId, useExecutionDataStore } from '@/app/stores/executionData.store';
import {
	createWorkflowDocumentId,
	useWorkflowDocumentStore,
} from '@/app/stores/workflowDocument.store';

/**
 * Handles the 'nodeExecuteAfterData' event, which is sent after a node has executed and contains the resulting data.
 */
export async function nodeExecuteAfterData({ data: pushData }: NodeExecuteAfterData) {
	const workflowId = getCurrentWorkflowId();
	const workflowDocumentStore = computed(() =>
		useWorkflowDocumentStore(createWorkflowDocumentId(workflowId)),
	);
	const workflowExecutionStateStore = useWorkflowExecutionStateStore(
		workflowDocumentStore.value.documentId,
	);
	const schemaPreviewStore = useSchemaPreviewStore();

	const activeExecutionId = workflowExecutionStateStore.activeExecutionId;
	if (typeof activeExecutionId === 'string') {
		useExecutionDataStore(createExecutionDataId(activeExecutionId)).updateNodeExecutionRunData(
			pushData,
		);
	}

	const node = workflowDocumentStore.value.getNodeByName(pushData.nodeName);

	if (!node) {
		return;
	}

	void schemaPreviewStore.trackSchemaPreviewExecution(workflowId, node, pushData);
}
