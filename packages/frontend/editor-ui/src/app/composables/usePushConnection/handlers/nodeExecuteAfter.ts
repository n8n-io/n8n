import type { NodeExecuteAfter } from '@n8n/api-types/push/execution';
import { useAssistantStore } from '@/features/ai/assistant/assistant.store';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import type { INodeExecutionData, ITaskData } from 'n8n-workflow';
import { TRIMMED_TASK_DATA_CONNECTIONS_KEY } from 'n8n-workflow';
import type { PushPayload } from '@n8n/api-types';
import { isValidNodeConnectionType } from '@/app/utils/typeGuards';
import type { WorkflowState } from '@/app/composables/useWorkflowState';

/**
 * Handles the 'nodeExecuteAfter' event, which happens after a node is executed.
 */
export async function nodeExecuteAfter(
	{ data: pushData }: NodeExecuteAfter,
	{ workflowState }: { workflowState: WorkflowState },
) {
	const workflowsStore = useWorkflowsStore();
	const assistantStore = useAssistantStore();

	/**
	 * Store the item count data in workflowState for use in canvas rendering.
	 * This data will be used to display iterations and total item counts without
	 * generating placeholder items.
	 */
	if (
		pushData.itemCountByConnectionType &&
		typeof pushData.itemCountByConnectionType === 'object'
	) {
		workflowState.setNodeExecutionItemCount(pushData.nodeName, pushData.itemCountByConnectionType);
	}

	/**
	 * We trim the actual data returned from the node execution to avoid performance issues
	 * when dealing with large datasets. Instead of storing the actual data, we initially store
	 * a placeholder object indicating that the data has been trimmed until the
	 * `nodeExecuteAfterData` event comes in.
	 */
	const placeholderOutputData: ITaskData['data'] = {
		main: [],
	};

	if (
		pushData.itemCountByConnectionType &&
		typeof pushData.itemCountByConnectionType === 'object'
	) {
		const fillObject: INodeExecutionData = { json: { [TRIMMED_TASK_DATA_CONNECTIONS_KEY]: true } };
		for (const [connectionType, outputs] of Object.entries(pushData.itemCountByConnectionType)) {
			if (isValidNodeConnectionType(connectionType)) {
				placeholderOutputData[connectionType] = outputs.map((count) =>
					Array.from({ length: count }, () => fillObject),
				);
			}
		}
	}

	const pushDataWithPlaceholderOutputData: PushPayload<'nodeExecuteAfterData'> = {
		...pushData,
		data: {
			...pushData.data,
			data: placeholderOutputData,
		},
	};

	workflowsStore.updateNodeExecutionStatus(pushDataWithPlaceholderOutputData);
	workflowState.executingNode.removeExecutingNode(pushData.nodeName);

	void assistantStore.onNodeExecution(pushData);
}
