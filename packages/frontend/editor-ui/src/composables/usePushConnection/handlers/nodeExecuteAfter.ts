import type { NodeExecuteAfter } from '@n8n/api-types/push/execution';
import { useAssistantStore } from '@/stores/assistant.store';
import { useWorkflowsStore } from '@/stores/workflows.store';
import { useRunDataStore } from '@n8n/stores/useRunDataStore';

/**
 * Handles the 'nodeExecuteAfter' event, which happens after a node is executed.
 */
export function nodeExecuteAfter({ data: pushData }: NodeExecuteAfter) {
	const workflowsStore = useWorkflowsStore();
	const assistantStore = useAssistantStore();
	const runDataStore = useRunDataStore();

	workflowsStore.updateNodeExecutionData(pushData);
	workflowsStore.removeExecutingNode(pushData.nodeName);
	runDataStore.addRunDataItemCount(pushData);

	void assistantStore.onNodeExecution(pushData);
}
