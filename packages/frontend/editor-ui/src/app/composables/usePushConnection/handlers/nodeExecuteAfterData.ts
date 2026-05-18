import type { NodeExecuteAfterData } from '@n8n/api-types/push/execution';
import { useSchemaPreviewStore } from '@/features/ndv/runData/schemaPreview.store';
import {
	createWorkflowExecutionStateId,
	useWorkflowExecutionStateStore,
} from '@/app/stores/workflowExecutionState.store';
import { createExecutionDataId, useExecutionDataStore } from '@/app/stores/executionData.store';
import { injectWorkflowDocumentStore } from '@/app/stores/workflowDocument.store';
import { computed } from 'vue';

/**
 * Handles the 'nodeExecuteAfterData' event, which is sent after a node has executed and contains the resulting data.
 */
export function useNodeExecuteAfterData() {
	const schemaPreviewStore = useSchemaPreviewStore();
	const workflowDocumentStore = injectWorkflowDocumentStore();
	const stateStore = computed(() =>
		useWorkflowExecutionStateStore(
			createWorkflowExecutionStateId(workflowDocumentStore.value.workflowId),
		),
	);

	async function nodeExecuteAfterData({ data: pushData }: NodeExecuteAfterData) {
		const activeExecutionId = stateStore.value.activeExecutionId;
		if (typeof activeExecutionId === 'string') {
			useExecutionDataStore(createExecutionDataId(activeExecutionId)).updateNodeExecutionRunData(
				pushData,
			);
		}

		const node = workflowDocumentStore.value.getNodeByName(pushData.nodeName);

		if (!node) {
			return;
		}

		void schemaPreviewStore.trackSchemaPreviewExecution(
			workflowDocumentStore.value.workflowId,
			node,
			pushData,
		);
	}

	return { nodeExecuteAfterData };
}
