import type { NodeExecuteAfter } from '@n8n/api-types/push/execution';
import { useAssistantStore } from '@/features/ai/assistant/assistant.store';
import type { INodeExecutionData, ITaskData, IWorkflowBase } from 'n8n-workflow';
import { TelemetryHelpers, TRIMMED_TASK_DATA_CONNECTIONS_KEY } from 'n8n-workflow';
import type { PushPayload } from '@n8n/api-types';
import { isValidNodeConnectionType } from '@/app/utils/typeGuards';
import type { WorkflowState } from '@/app/composables/useWorkflowState';
import { openFormPopupWindow } from '@/features/execution/executions/executions.utils';
import { useTelemetry } from '@/app/composables/useTelemetry';
import { useWorkflowHelpers } from '@/app/composables/useWorkflowHelpers';
import { useSettingsStore } from '@/app/stores/settings.store';
import type { useWorkflowDocumentStore } from '@/app/stores/workflowDocument.store';
import type { INodeUi } from '@/Interface';

type WorkflowDocumentStore = ReturnType<typeof useWorkflowDocumentStore>;

async function trackNodeExecution(
	pushData: PushPayload<'nodeExecuteAfter'>,
	workflowDocumentStore: WorkflowDocumentStore,
	node: INodeUi | null | undefined,
) {
	if (!pushData.data.error) {
		return;
	}

	const workflowHelpers = useWorkflowHelpers();
	const settingsStore = useSettingsStore();
	const telemetry = useTelemetry();

	telemetry.track('Manual exec errored', {
		error_title: pushData.data.error.message,
		node_type: node?.type,
		node_type_version: node?.typeVersion,
		node_id: node?.id,
		node_graph_string: JSON.stringify(
			TelemetryHelpers.generateNodesGraph(
				workflowDocumentStore.serialize() as IWorkflowBase,
				workflowHelpers.getNodeTypes(),
				{
					isCloudDeployment: settingsStore.isCloudDeployment,
				},
			).nodeGraph,
		),
		workflow_id: workflowDocumentStore.workflowId,
	});
}

/**
 * Handles the 'nodeExecuteAfter' event, which happens after a node is executed.
 */
export async function nodeExecuteAfter(
	{ data: pushData }: NodeExecuteAfter,
	{ workflowState }: { workflowState: WorkflowState },
) {
	const assistantStore = useAssistantStore();
	const workflowDocumentStore = workflowState.getCurrentWorkflowDocumentStore();

	if (!workflowDocumentStore) {
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

	workflowDocumentStore.updateNodeExecutionStatus(pushDataWithPlaceholderOutputData);

	if (pushData.data.executionStatus === 'waiting' && pushData.data.metadata?.resumeFormUrl) {
		openFormPopupWindow(pushData.data.metadata.resumeFormUrl);
	}

	await trackNodeExecution(
		pushData,
		workflowDocumentStore,
		workflowDocumentStore.getNodeByName(pushData.nodeName),
	);
	workflowState.executingNode.removeExecutingNode(pushData.nodeName);

	void assistantStore.onNodeExecution(pushData);
}
