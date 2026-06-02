import type { NodeExecuteAfter } from '@n8n/api-types/push/execution';
import { useAssistantStore } from '@/features/ai/assistant/assistant.store';
import { useWorkflowExecutionStateStore } from '@/app/stores/workflowExecutionState.store';
import { createExecutionDataId, useExecutionDataStore } from '@/app/stores/executionData.store';
import type { INodeExecutionData, ITaskData } from 'n8n-workflow';
import { TRIMMED_TASK_DATA_CONNECTIONS_KEY } from 'n8n-workflow';
import type { PushPayload } from '@n8n/api-types';
import { isValidNodeConnectionType } from '@/app/utils/typeGuards';
import { openFormPopupWindow } from '@/features/execution/executions/executions.utils';
import { trackNodeExecution } from './trackNodeExecution';
import type { PushHandlerOptions } from './types';

/**
 * Handles the 'nodeExecuteAfter' event, which happens after a node is executed.
 */
export async function nodeExecuteAfter(
	{ data: pushData }: NodeExecuteAfter,
	{ documentId }: PushHandlerOptions,
) {
	const workflowExecutionStateStore = useWorkflowExecutionStateStore(documentId);
	const assistantStore = useAssistantStore();

	// Ignore node events that don't belong to the execution this document is
	// tracking — a concurrent execution's node must not write into this
	// document's data or fire its side effects (form popups, tracking, assistant).
	const activeExecutionId = workflowExecutionStateStore.activeExecutionId;
	if (activeExecutionId !== pushData.executionId) {
		return;
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

	useExecutionDataStore(createExecutionDataId(pushData.executionId)).updateNodeExecutionStatus(
		pushDataWithPlaceholderOutputData,
	);

	if (pushDataWithPlaceholderOutputData.data.executionStatus !== 'waiting') {
		void trackNodeExecution(
			pushDataWithPlaceholderOutputData,
			workflowExecutionStateStore.workflowId,
		);
	}

	workflowExecutionStateStore.executingNode.removeExecutingNode(pushData.nodeName);

	// Side effects
	if (pushData.data.executionStatus === 'waiting' && pushData.data.metadata?.resumeFormUrl) {
		openFormPopupWindow(pushData.data.metadata.resumeFormUrl);
	} else if (pushData.data.executionStatus !== 'waiting') {
		void trackNodeExecution(pushData, workflowExecutionStateStore.workflowId);
	}

	void assistantStore.onNodeExecution(pushData);
}
