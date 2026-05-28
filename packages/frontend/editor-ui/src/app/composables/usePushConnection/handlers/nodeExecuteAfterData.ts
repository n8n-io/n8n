import type { NodeExecuteAfterData } from '@n8n/api-types/push/execution';
import { useSchemaPreviewStore } from '@/features/ndv/runData/schemaPreview.store';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import { computed } from 'vue';
import {
	createWorkflowExecutionStateId,
	useWorkflowExecutionStateStore,
} from '@/app/stores/workflowExecutionState.store';
import { createExecutionDataId, useExecutionDataStore } from '@/app/stores/executionData.store';
import {
	createWorkflowDocumentId,
	useWorkflowDocumentStore,
} from '@/app/stores/workflowDocument.store';

/**
 * Handles the 'nodeExecuteAfterData' event, which is sent after a node has executed and contains the resulting data.
 */
export async function nodeExecuteAfterData({ data: pushData }: NodeExecuteAfterData) {
	const workflowsStore = useWorkflowsStore();
	const stateStore = useWorkflowExecutionStateStore(
		createWorkflowExecutionStateId(workflowsStore.workflowId),
	);
	const workflowDocumentStore = computed(() =>
		useWorkflowDocumentStore(createWorkflowDocumentId(workflowsStore.workflowId)),
	);
	const schemaPreviewStore = useSchemaPreviewStore();

	const activeExecutionId = stateStore.activeExecutionId;
	if (typeof activeExecutionId === 'string') {
		useExecutionDataStore(createExecutionDataId(activeExecutionId)).updateNodeExecutionRunData(
			pushData,
		);
	}

	const node = workflowDocumentStore.value.getNodeByName(pushData.nodeName);

	if (!node) {
		return;
	}

	void schemaPreviewStore.trackSchemaPreviewExecution(workflowsStore.workflowId, node, pushData);
}
