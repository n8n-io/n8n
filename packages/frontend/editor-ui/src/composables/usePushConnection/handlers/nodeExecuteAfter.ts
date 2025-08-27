import type { NodeExecuteAfter } from '@n8n/api-types/push/execution';
import { useAssistantStore } from '@/stores/assistant.store';
import { useWorkflowsStore } from '@/stores/workflows.store';
import { TRIMMED_TASK_DATA_CONNECTIONS_KEY } from 'n8n-workflow';

/**
 * Handles the 'nodeExecuteAfter' event, which happens after a node is executed.
 */
export async function nodeExecuteAfter({ data: pushData }: NodeExecuteAfter) {
	const workflowsStore = useWorkflowsStore();
	const assistantStore = useAssistantStore();

	/**
	 * We trim the actual data returned from the node execution to avoid performance issues
	 * when dealing with large datasets. Instead of storing the actual data, we initially store
	 * a placeholder object indicating that the data has been trimmed until the
	 * `nodeExecuteAfterData` event comes in.
	 */
	if ('itemCount' in pushData && typeof pushData.itemCount === 'number') {
		const fillObject = { json: { [TRIMMED_TASK_DATA_CONNECTIONS_KEY]: true } };
		const fillArray = new Array(pushData.itemCount);
		for (let i = 0; i < fillArray.length; i++) {
			fillArray[i] = fillObject;
		}

		pushData.data.data = {
			main: [fillArray],
		};
	}

	workflowsStore.updateNodeExecutionData(pushData);
	workflowsStore.removeExecutingNode(pushData.nodeName);

	void assistantStore.onNodeExecution(pushData);
}
