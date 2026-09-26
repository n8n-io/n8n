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

	// Ignore events for anything but the tracked execution or its sub-executions,
	// so a concurrent run can't write here or fire side effects.
	const activeExecutionId = workflowExecutionStateStore.activeExecutionId;
	const isSubExecution = workflowExecutionStateStore.isTrackedSubExecution(pushData.executionId);
	if (activeExecutionId !== pushData.executionId && !isSubExecution) {
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

	// Agent progress is only tracked for the execution on screen, and a sub-workflow
	// may reuse a parent node name, so clearing it stays scoped to the parent.
	if (isSubExecution) {
		workflowExecutionStateStore.subExecutingNode.removeExecutingNode(pushData.nodeName);
	} else {
		workflowExecutionStateStore.executingNode.removeExecutingNode(pushData.nodeName);
		workflowExecutionStateStore.clearAgentNodeProgress(pushData.nodeName);
	}

	// A form waiting inside a sub-workflow still needs its popup. Telemetry and
	// the assistant are scoped to the workflow on screen, so they skip it.
	if (pushData.data.executionStatus === 'waiting' && pushData.data.metadata?.resumeFormUrl) {
		openFormPopupWindow(pushData.data.metadata.resumeFormUrl);
	} else if (pushData.data.executionStatus !== 'waiting' && !isSubExecution) {
		void trackNodeExecution(pushData, workflowExecutionStateStore.workflowId);
	}

	if (!isSubExecution) {
		void assistantStore.onNodeExecution(pushData);
	}
}
