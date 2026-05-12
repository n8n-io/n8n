import type { NodeExecuteAfter } from '@n8n/api-types/push/execution';
import { useAssistantStore } from '@/features/ai/assistant/assistant.store';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import {
	createWorkflowExecutionStateId,
	useWorkflowExecutionStateStore,
} from '@/app/stores/workflowExecutionState.store';
import { createExecutionDataId, useExecutionDataStore } from '@/app/stores/executionData.store';
import type { INodeExecutionData, ITaskData } from 'n8n-workflow';
import { TRIMMED_TASK_DATA_CONNECTIONS_KEY } from 'n8n-workflow';
import type { PushPayload } from '@n8n/api-types';
import { isValidNodeConnectionType } from '@/app/utils/typeGuards';
import { openFormPopupWindow } from '@/features/execution/executions/executions.utils';
import { trackNodeExecution } from './trackNodeExecution';
import type { WorkflowState } from '@/app/composables/useWorkflowState';

/**
 * Handles the 'nodeExecuteAfter' event, which happens after a node is executed.
 */
export async function nodeExecuteAfter(
	{ data: pushData }: NodeExecuteAfter,
	{ workflowState }: { workflowState: WorkflowState },
) {
	const workflowsStore = useWorkflowsStore();
	const stateStore = useWorkflowExecutionStateStore(
		createWorkflowExecutionStateId(workflowsStore.workflowId),
	);
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

	const activeExecutionId = stateStore.activeExecutionId;
	if (typeof activeExecutionId === 'string') {
		useExecutionDataStore(createExecutionDataId(activeExecutionId)).updateNodeExecutionStatus(
			pushDataWithPlaceholderOutputData,
		);

		if (pushDataWithPlaceholderOutputData.data.executionStatus !== 'waiting') {
			void trackNodeExecution(pushDataWithPlaceholderOutputData, workflowsStore.workflowId);
		}
	}

	workflowState.executingNode.removeExecutingNode(pushData.nodeName);

	// Side effects
	if (pushData.data.executionStatus === 'waiting' && pushData.data.metadata?.resumeFormUrl) {
		openFormPopupWindow(pushData.data.metadata.resumeFormUrl);
	} else if (pushData.data.executionStatus !== 'waiting') {
		void trackNodeExecution(pushData, workflowsStore.workflowId);
	}

	void assistantStore.onNodeExecution(pushData);
}
