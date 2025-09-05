import type { NodeExecuteAfter } from '@n8n/api-types/push/execution';
import { useAssistantStore } from '@/stores/assistant.store';
import { useWorkflowsStore } from '@/stores/workflows.store';
import type { ITaskData } from 'n8n-workflow';
import { TRIMMED_TASK_DATA_CONNECTIONS_KEY } from 'n8n-workflow';
import type { PushPayload } from '@n8n/api-types';

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
	const placeholderOutputData: ITaskData['data'] = {
		main: [],
	};

	if (typeof pushData.itemCount === 'number') {
		const fillObject = { json: { [TRIMMED_TASK_DATA_CONNECTIONS_KEY]: true } };
		const fillArray = new Array(pushData.itemCount).fill(fillObject);

		placeholderOutputData.main = [fillArray];
	}

	const pushDataWithPlaceholderOutputData: PushPayload<'nodeExecuteAfterData'> = {
		...pushData,
		data: {
			...pushData.data,
			data: placeholderOutputData,
		},
	};

	workflowsStore.updateNodeExecutionData(pushDataWithPlaceholderOutputData);
	workflowsStore.removeExecutingNode(pushData.nodeName);

	void assistantStore.onNodeExecution(pushData);
}
