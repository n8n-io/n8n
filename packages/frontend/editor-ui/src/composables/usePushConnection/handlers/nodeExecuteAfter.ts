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

	/**
	 * When we receive a placeholder in `nodeExecuteAfter`, we fake the items
	 * to be the same count as the data the placeholder is standing in for.
	 * This prevents the items count from jumping up when the execution
	 * finishes and the full data replaces the placeholder.
	 */
	if (
		pushData.itemCount &&
		pushData.data?.data?.main &&
		Array.isArray(pushData.data.data.main[0]) &&
		pushData.data.data.main[0].length < pushData.itemCount
	) {
		pushData.data.data.main[0]?.push(...new Array(pushData.itemCount - 1).fill({ json: {} }));
	}

	workflowsStore.updateNodeExecutionData(pushData);
	workflowsStore.removeExecutingNode(pushData.nodeName);

	void assistantStore.onNodeExecution(pushData);
	void schemaPreviewStore.trackSchemaPreviewExecution(pushData);
}
