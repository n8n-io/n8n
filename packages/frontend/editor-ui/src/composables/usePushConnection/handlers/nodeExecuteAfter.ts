import type { NodeExecuteAfter } from '@n8n/api-types/push/execution';
import { useSchemaPreviewStore } from '@/stores/schemaPreview.store';
import { useAssistantStore } from '@/stores/assistant.store';
import { useWorkflowsStore } from '@/stores/workflows.store';

/**
 * Handles the 'nodeExecuteAfter' event, which happens after a node is executed.
 */
export async function nodeExecuteAfter({ data: pushData }: NodeExecuteAfter) {
	const workflowsStore = useWorkflowsStore();
	const assistantStore = useAssistantStore();
	const schemaPreviewStore = useSchemaPreviewStore();

	// @TODO Remove once backend sends the data in the correct format
	const itemCount: Record<string, number> = {};
	if (pushData.data.data) {
		for (const connectionType of Object.keys(pushData.data.data)) {
			itemCount[connectionType as string] = pushData.data.data[connectionType].length;
		}
	}
	pushData.data.data = {};

	// Mock item count for each connection type
	pushData.itemCount = itemCount;

	/**
	 * Fill the data object with empty arrays for each connection type
	 * This is necessary to ensure that the data structure is consistent with the expected format
	 */
	for (const connectionType of Object.keys(pushData.itemCount)) {
		pushData.data.data[connectionType] = [new Array(itemCount[connectionType]).fill({})];
	}

	workflowsStore.updateNodeExecutionData(pushData);
	workflowsStore.removeExecutingNode(pushData.nodeName);

	void assistantStore.onNodeExecution(pushData);
	void schemaPreviewStore.trackSchemaPreviewExecution(pushData);
}
