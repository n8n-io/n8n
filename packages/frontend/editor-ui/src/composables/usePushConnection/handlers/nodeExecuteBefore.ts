import type { NodeExecuteBefore } from '@n8n/api-types/push/execution';
import { useWorkflowsStore } from '@/stores/workflows.store';

/**
 * Handles the 'nodeExecuteBefore' event, which happens before a node is executed.
 */
export async function nodeExecuteBefore({ data }: NodeExecuteBefore) {
	const workflowsStore = useWorkflowsStore();

	workflowsStore.addExecutingNode(data.nodeName);
	workflowsStore.addNodeExecutionStartedData(data);
}
