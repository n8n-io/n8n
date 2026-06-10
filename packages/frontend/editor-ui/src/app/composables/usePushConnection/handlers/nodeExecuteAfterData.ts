import type { NodeExecuteAfterData } from '@n8n/api-types/push/execution';
import { useSchemaPreviewStore } from '@/features/ndv/runData/schemaPreview.store';
import { useWorkflowExecutionStateStore } from '@/app/stores/workflowExecutionState.store';
import { createExecutionDataId, useExecutionDataStore } from '@/app/stores/executionData.store';
import { useWorkflowDocumentStore } from '@/app/stores/workflowDocument.store';
import type { PushHandlerOptions } from './types';

/**
 * Handles the 'nodeExecuteAfterData' event, which is sent after a node has executed and contains the resulting data.
 */
export async function nodeExecuteAfterData(
	{ data: pushData }: NodeExecuteAfterData,
	{ documentId }: PushHandlerOptions,
) {
	const workflowDocumentStore = useWorkflowDocumentStore(documentId);
	const workflowExecutionStateStore = useWorkflowExecutionStateStore(documentId);
	const schemaPreviewStore = useSchemaPreviewStore();

	// Ignore node events that don't belong to the execution this document is
	// tracking — a concurrent execution's data must not land on this document.
	const activeExecutionId = workflowExecutionStateStore.activeExecutionId;
	if (activeExecutionId !== pushData.executionId) {
		return;
	}

	useExecutionDataStore(createExecutionDataId(pushData.executionId)).updateNodeExecutionRunData(
		pushData,
	);

	const node = workflowDocumentStore.getNodeByName(pushData.nodeName);

	if (!node) {
		return;
	}

	void schemaPreviewStore.trackSchemaPreviewExecution(
		workflowDocumentStore.workflowId,
		node,
		pushData,
	);
}
