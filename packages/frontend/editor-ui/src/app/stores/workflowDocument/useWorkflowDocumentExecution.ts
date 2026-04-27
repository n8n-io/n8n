import { computed, ref, watch, type ComputedRef } from 'vue';
import { createEventHook } from '@vueuse/core';
import type { PushPayload } from '@n8n/api-types';
import type { NodeExecuteBefore } from '@n8n/api-types/push/execution';
import type { IExecutionResponse } from '@/features/execution/executions/executions.types';
import { findTriggerNodeToAutoSelect } from '@/features/execution/executions/executions.utils';
import { getPairedItemsMapping } from '@/app/utils/pairedItemUtils';
import { isChatNode } from '@/app/utils/aiUtils';
import type {
	ExecutionSummary,
	INodeTypeDescription,
	IRunData,
	IRunExecutionData,
	ITaskData,
	ITaskStartedData,
} from 'n8n-workflow';
import type { INodeUi } from '@/Interface';
import { CHANGE_ACTION } from './types';
import type { ChangeAction, ChangeEvent } from './types';

type WorkflowDocumentExecutionField =
	| 'execution'
	| 'activeExecutionId'
	| 'executionWaitingForWebhook'
	| 'isInDebugMode'
	| 'chatMessages'
	| 'chatPartialExecutionDestinationNode'
	| 'selectedTriggerNodeName'
	| 'lastSuccessfulExecution'
	| 'currentWorkflowExecutions'
	| 'executionStartedData'
	| 'executionState';

export type WorkflowDocumentExecutionPayload = {
	field: WorkflowDocumentExecutionField;
};

export type WorkflowDocumentExecutionChangeEvent = ChangeEvent<WorkflowDocumentExecutionPayload>;

export interface WorkflowDocumentExecutionDeps {
	workflowId: string;
	workflowTriggerNodes: Readonly<ComputedRef<INodeUi[]>>;
	getNodeById: (id: string) => INodeUi | undefined;
	getNodeType: (typeName: string, version?: number) => INodeTypeDescription | null;
}

function replaceExecutionTaskData(
	tasksData: ITaskData[],
	data: ITaskData,
): { updated: boolean; replacedIndex: number } {
	const existingRunIndex = tasksData.findIndex(
		(item) => item.executionIndex === data.executionIndex,
	);

	if (data.executionStatus === 'waiting') {
		tasksData.push(data);
		return { updated: true, replacedIndex: tasksData.length - 1 };
	}

	const hasWaitingItems = tasksData.some((item) => item.executionStatus === 'waiting');
	const index = existingRunIndex > -1 && !hasWaitingItems ? existingRunIndex : tasksData.length - 1;
	const status = tasksData[index]?.executionStatus ?? 'unknown';

	if (status === 'waiting' || status === 'running' || tasksData[existingRunIndex]) {
		tasksData.splice(index, 1, data);
		return { updated: true, replacedIndex: index };
	}

	tasksData.push(data);
	return { updated: true, replacedIndex: tasksData.length - 1 };
}

function hasRedactedItems(data: ITaskData['data']) {
	if (!data) {
		return undefined;
	}

	for (const connectionType of Object.keys(data)) {
		for (const items of data[connectionType]) {
			const redactedItem = items?.find((item) => item.redaction?.redacted);
			if (redactedItem) {
				return redactedItem.redaction?.reason ?? 'workflow_redaction_policy';
			}
		}
	}

	return undefined;
}

function renameWorkflowDataNode(
	workflowData: IExecutionResponse['workflowData'] | undefined,
	oldName: string,
	newName: string,
) {
	if (!workflowData) {
		return;
	}

	const workflowNode = workflowData.nodes.find((node) => node.name === oldName);
	if (workflowNode) {
		workflowNode.name = newName;
	}

	if (workflowData.pinData?.[oldName]) {
		workflowData.pinData[newName] = workflowData.pinData[oldName];
		delete workflowData.pinData[oldName];
	}

	if (!workflowData.connections) {
		return;
	}

	if (workflowData.connections[oldName]) {
		workflowData.connections[newName] = workflowData.connections[oldName];
		delete workflowData.connections[oldName];
	}

	Object.values(workflowData.connections)
		.flatMap((connectionsByType) => Object.values(connectionsByType))
		.flatMap((connectionGroups) => connectionGroups)
		.flat()
		.forEach((connection) => {
			if (!connection) {
				return;
			}

			if (connection.node === oldName) {
				connection.node = newName;
			}
		});
}

function renameExecutionResponseNodeData(
	executionResponse: IExecutionResponse | null | undefined,
	oldName: string,
	newName: string,
) {
	if (!executionResponse) {
		return;
	}

	if (executionResponse.executedNode === oldName) {
		executionResponse.executedNode = newName;
	}

	if (executionResponse.triggerNode === oldName) {
		executionResponse.triggerNode = newName;
	}

	renameWorkflowDataNode(executionResponse.workflowData, oldName, newName);

	const resultData = executionResponse.data?.resultData;
	if (!resultData) {
		return;
	}

	if (resultData.lastNodeExecuted === oldName) {
		resultData.lastNodeExecuted = newName;
	}

	if (resultData.runData[oldName]) {
		resultData.runData[newName] = resultData.runData[oldName];
		delete resultData.runData[oldName];
	}

	if (resultData.pinData?.[oldName]) {
		resultData.pinData[newName] = resultData.pinData[oldName];
		delete resultData.pinData[oldName];
	}

	Object.values(resultData.pinData ?? {})
		.flatMap((executionData) =>
			executionData.flatMap((nodeExecution) =>
				Array.isArray(nodeExecution.pairedItem)
					? nodeExecution.pairedItem
					: [nodeExecution.pairedItem],
			),
		)
		.forEach((pairedItem) => {
			if (typeof pairedItem === 'number' || pairedItem?.sourceOverwrite?.previousNode !== oldName) {
				return;
			}
			pairedItem.sourceOverwrite.previousNode = newName;
		});

	Object.values(resultData.runData)
		.flatMap((taskData) => taskData.flatMap((task) => task.source))
		.forEach((source) => {
			if (!source || source.previousNode !== oldName) {
				return;
			}
			source.previousNode = newName;
		});
}

export function useWorkflowDocumentExecution(deps: WorkflowDocumentExecutionDeps) {
	const currentWorkflowExecutions = ref<ExecutionSummary[]>([]);
	const currentExecution = ref<IExecutionResponse | null>(null);
	const lastSuccessfulExecution = ref<IExecutionResponse | null>(null);
	const executionStartedData =
		ref<[executionId: string, data: { [nodeName: string]: ITaskStartedData[] }]>();
	const executionResultDataLastUpdate = ref<number>();
	const executionPairedItemMappings = ref<Record<string, Set<string>>>({});
	const executionWaitingForWebhook = ref(false);
	const isInDebugMode = ref(false);
	const chatMessages = ref<string[]>([]);
	const chatPartialExecutionDestinationNode = ref<string | null>(null);
	const selectedTriggerNodeName = ref<string>();
	const activeExecutionId = ref<string | null | undefined>();
	const previousExecutionId = ref<string | null | undefined>();

	const onExecutionChange = createEventHook<WorkflowDocumentExecutionChangeEvent>();

	function triggerChange(
		field: WorkflowDocumentExecutionField,
		action: ChangeAction = CHANGE_ACTION.UPDATE,
	) {
		void onExecutionChange.trigger({ action, payload: { field } });
	}

	function applyExecutionData(
		executionData: IExecutionResponse | null,
		action: ChangeAction = CHANGE_ACTION.UPDATE,
	) {
		currentExecution.value = executionData;
		executionPairedItemMappings.value = getPairedItemsMapping(executionData);
		executionResultDataLastUpdate.value = Date.now();
		executionStartedData.value = undefined;
		triggerChange('execution', action);
	}

	function applyExecutionRunData(
		executionData: IRunExecutionData,
		action: ChangeAction = CHANGE_ACTION.UPDATE,
	) {
		if (!currentExecution.value) {
			return;
		}

		currentExecution.value = {
			...currentExecution.value,
			data: executionData,
		};
		executionPairedItemMappings.value = getPairedItemsMapping(currentExecution.value);
		executionResultDataLastUpdate.value = Date.now();
		executionStartedData.value = undefined;
		triggerChange('execution', action);
	}

	function applyActiveExecutionId(
		id: string | null | undefined,
		action: ChangeAction = CHANGE_ACTION.UPDATE,
	) {
		if (id) {
			previousExecutionId.value = activeExecutionId.value;
		}

		activeExecutionId.value = id;
		triggerChange('activeExecutionId', action);
	}

	function applyExecutionWaitingForWebhook(
		value: boolean,
		action: ChangeAction = CHANGE_ACTION.UPDATE,
	) {
		executionWaitingForWebhook.value = value;
		triggerChange('executionWaitingForWebhook', action);
	}

	function applyDebugMode(value: boolean, action: ChangeAction = CHANGE_ACTION.UPDATE) {
		isInDebugMode.value = value;
		triggerChange('isInDebugMode', action);
	}

	function applyChatMessages(messages: string[], action: ChangeAction = CHANGE_ACTION.UPDATE) {
		chatMessages.value = messages;
		triggerChange('chatMessages', action);
	}

	function applyChatPartialExecutionDestinationNode(
		value: string | null,
		action: ChangeAction = CHANGE_ACTION.UPDATE,
	) {
		chatPartialExecutionDestinationNode.value = value;
		triggerChange('chatPartialExecutionDestinationNode', action);
	}

	function applySelectedTriggerNodeName(
		value: string | undefined,
		action: ChangeAction = CHANGE_ACTION.UPDATE,
	) {
		selectedTriggerNodeName.value = value;
		triggerChange('selectedTriggerNodeName', action);
	}

	function applyLastSuccessfulExecution(
		execution: IExecutionResponse | null,
		action: ChangeAction = CHANGE_ACTION.UPDATE,
	) {
		lastSuccessfulExecution.value = execution;
		triggerChange('lastSuccessfulExecution', action);
	}

	function applyCurrentWorkflowExecutions(
		executions: ExecutionSummary[],
		action: ChangeAction = CHANGE_ACTION.UPDATE,
	) {
		currentWorkflowExecutions.value = executions;
		triggerChange('currentWorkflowExecutions', action);
	}

	function applyExecutionStartedData(
		data: [executionId: string, data: { [nodeName: string]: ITaskStartedData[] }] | undefined,
		action: ChangeAction = CHANGE_ACTION.UPDATE,
	) {
		executionStartedData.value = data;
		triggerChange('executionStartedData', action);
	}

	function applyExecutionStateReset(action: ChangeAction = CHANGE_ACTION.DELETE) {
		currentWorkflowExecutions.value = [];
		currentExecution.value = null;
		lastSuccessfulExecution.value = null;
		executionStartedData.value = undefined;
		executionResultDataLastUpdate.value = undefined;
		executionPairedItemMappings.value = {};
		executionWaitingForWebhook.value = false;
		isInDebugMode.value = false;
		chatMessages.value = [];
		chatPartialExecutionDestinationNode.value = null;
		selectedTriggerNodeName.value = undefined;
		activeExecutionId.value = undefined;
		previousExecutionId.value = undefined;
		triggerChange('executionState', action);
	}

	const executionRunData = computed<IRunData | null>(() => {
		if (!currentExecution.value?.data?.resultData) {
			return null;
		}

		return currentExecution.value.data.resultData.runData;
	});

	const execution = computed(() => currentExecution.value);

	const executedNode = computed(() => currentExecution.value?.executedNode);

	const isWorkflowRunning = computed(() => {
		if (activeExecutionId.value === null) {
			return true;
		}

		if (activeExecutionId.value && currentExecution.value) {
			if (
				['waiting', 'running'].includes(currentExecution.value.status) &&
				!currentExecution.value.finished
			) {
				return true;
			}
		}

		return false;
	});

	const getAllLoadedFinishedExecutions = computed(() =>
		currentWorkflowExecutions.value.filter(
			(execution) => execution.finished === true || execution.stoppedAt !== undefined,
		),
	);

	const getPastChatMessages = computed(() => chatMessages.value);

	const executionTriggerNodeName = computed(() => {
		if (!isWorkflowRunning.value) {
			return undefined;
		}

		if (currentExecution.value?.triggerNode) {
			return currentExecution.value.triggerNode;
		}

		return Object.keys(currentExecution.value?.data?.resultData.runData ?? {}).find((name) =>
			deps.workflowTriggerNodes.value.some((node) => node.name === name),
		);
	});

	const selectableTriggerNodes = computed(() =>
		deps.workflowTriggerNodes.value.filter((node) => !node.disabled && !isChatNode(node)),
	);

	function setExecution(executionData: IExecutionResponse | null) {
		applyExecutionData(executionData);
	}

	function setExecutionRunData(executionData: IRunExecutionData) {
		applyExecutionRunData(executionData);
	}

	function setActiveExecutionId(id: string | null | undefined) {
		applyActiveExecutionId(id);
	}

	function setExecutionWaitingForWebhook(value: boolean) {
		applyExecutionWaitingForWebhook(value);
	}

	function setDebugMode(value: boolean) {
		applyDebugMode(value);
	}

	function setChatPartialExecutionDestinationNode(value: string | null) {
		applyChatPartialExecutionDestinationNode(value);
	}

	function setLastSuccessfulExecution(execution: IExecutionResponse | null) {
		applyLastSuccessfulExecution(execution);
	}

	function setCurrentWorkflowExecutions(executions: ExecutionSummary[]) {
		applyCurrentWorkflowExecutions(executions);
	}

	function clearCurrentWorkflowExecutions() {
		applyCurrentWorkflowExecutions([], CHANGE_ACTION.DELETE);
	}

	function addNodeExecutionStartedData(data: NodeExecuteBefore['data']) {
		const existingStartedData = executionStartedData.value;
		const currentData = existingStartedData?.[0] === data.executionId ? existingStartedData[1] : {};

		applyExecutionStartedData([
			data.executionId,
			{
				...currentData,
				[data.nodeName]: [...(currentData[data.nodeName] ?? []), data.data],
			},
		]);
	}

	function getExecutionRunDataByNodeName(nodeName: string): ITaskData[] | null {
		if (executionRunData.value === null) {
			return null;
		}

		if (!Object.prototype.hasOwnProperty.call(executionRunData.value, nodeName)) {
			return null;
		}

		return executionRunData.value[nodeName];
	}

	function updateNodeExecutionStatus(pushData: PushPayload<'nodeExecuteAfterData'>): void {
		if (!currentExecution.value?.data) {
			console.warn(
				'[workflowDocument.execution] updateNodeExecutionStatus called without execution data; ignoring.',
			);
			return;
		}

		const { nodeName, data } = pushData;
		currentExecution.value.data.resultData.lastNodeExecuted = nodeName;

		if (currentExecution.value.data.resultData.runData[nodeName] === undefined) {
			currentExecution.value.data.resultData.runData[nodeName] = [];
		}

		const tasksData = currentExecution.value.data.resultData.runData[nodeName];
		replaceExecutionTaskData(tasksData, data);

		const redactionReason = hasRedactedItems(data.data);
		if (redactionReason !== undefined && !currentExecution.value.data.redactionInfo?.isRedacted) {
			currentExecution.value.data.redactionInfo = {
				isRedacted: true,
				reason: redactionReason,
				canReveal: false,
			};
		}

		executionPairedItemMappings.value = getPairedItemsMapping(currentExecution.value);
		executionResultDataLastUpdate.value = Date.now();
		triggerChange('execution');
	}

	function updateNodeExecutionRunData(pushData: PushPayload<'nodeExecuteAfterData'>): void {
		const tasksData = currentExecution.value?.data?.resultData.runData[pushData.nodeName];
		const existingRunIndex =
			tasksData?.findIndex((item) => item.executionIndex === pushData.data.executionIndex) ?? -1;

		if (!tasksData?.[existingRunIndex]) {
			return;
		}

		tasksData.splice(existingRunIndex, 1, pushData.data);
		executionPairedItemMappings.value = getPairedItemsMapping(currentExecution.value);
		executionResultDataLastUpdate.value = Date.now();
		triggerChange('execution');
	}

	function clearNodeExecutionData(nodeName: string): void {
		if (!currentExecution.value?.data) {
			return;
		}

		const { [nodeName]: _, ...remainingRunData } = currentExecution.value.data.resultData.runData;
		currentExecution.value.data.resultData.runData = remainingRunData;
		executionPairedItemMappings.value = getPairedItemsMapping(currentExecution.value);
		executionResultDataLastUpdate.value = Date.now();
		triggerChange('execution');
	}

	function removeNodeExecutionDataById(nodeId: string): void {
		const node = deps.getNodeById(nodeId);
		if (!node) {
			return;
		}

		clearNodeExecutionData(node.name);
	}

	function renameExecutionDataNode(oldName: string, newName: string): void {
		renameExecutionResponseNodeData(currentExecution.value, oldName, newName);
		renameExecutionResponseNodeData(lastSuccessfulExecution.value, oldName, newName);

		if (executionStartedData.value?.[1][oldName]) {
			const { [oldName]: startedDataForNode, ...remainingStartedData } =
				executionStartedData.value[1];
			executionStartedData.value = [
				executionStartedData.value[0],
				{
					...remainingStartedData,
					[newName]: startedDataForNode,
				},
			];
		}

		if (chatPartialExecutionDestinationNode.value === oldName) {
			chatPartialExecutionDestinationNode.value = newName;
		}

		if (selectedTriggerNodeName.value === oldName) {
			selectedTriggerNodeName.value = newName;
		}

		executionPairedItemMappings.value = getPairedItemsMapping(currentExecution.value);
		executionResultDataLastUpdate.value = Date.now();
		triggerChange('execution');
	}

	function deleteExecution(execution: ExecutionSummary): void {
		applyCurrentWorkflowExecutions(
			currentWorkflowExecutions.value.filter((currentExecution) => currentExecution !== execution),
		);
	}

	function addToCurrentExecutions(executions: ExecutionSummary[]): void {
		const nextExecutions = [...currentWorkflowExecutions.value];

		executions.forEach((execution) => {
			const exists = nextExecutions.find(
				(currentExecution) => currentExecution.id === execution.id,
			);
			if (!exists && execution.workflowId === deps.workflowId) {
				nextExecutions.push(execution);
			}
		});

		applyCurrentWorkflowExecutions(nextExecutions);
	}

	function resetChatMessages(): void {
		applyChatMessages([], CHANGE_ACTION.DELETE);
	}

	function appendChatMessage(message: string): void {
		applyChatMessages([...chatMessages.value, message], CHANGE_ACTION.ADD);
	}

	function setSelectedTriggerNodeName(value: string | undefined) {
		applySelectedTriggerNodeName(value);
	}

	function clearExecutionStartedData() {
		applyExecutionStartedData(undefined, CHANGE_ACTION.DELETE);
	}

	function resetExecutionState() {
		applyExecutionStateReset();
	}

	watch(
		[selectableTriggerNodes, executionTriggerNodeName],
		([newSelectable, currentTrigger], [oldSelectable]) => {
			if (currentTrigger !== undefined) {
				applySelectedTriggerNodeName(currentTrigger);
				return;
			}

			if (
				selectedTriggerNodeName.value === undefined ||
				newSelectable.every((node) => node.name !== selectedTriggerNodeName.value)
			) {
				applySelectedTriggerNodeName(
					findTriggerNodeToAutoSelect(selectableTriggerNodes.value, deps.getNodeType)?.name,
				);
				return;
			}

			const newTrigger = newSelectable.find((node) =>
				oldSelectable?.every((oldNode) => oldNode.name !== node.name),
			);

			if (newTrigger !== undefined) {
				applySelectedTriggerNodeName(newTrigger.name);
			}
		},
		{ immediate: true },
	);

	return {
		currentWorkflowExecutions,
		execution,
		executionPairedItemMappings,
		executionResultDataLastUpdate,
		executionStartedData,
		activeExecutionId,
		previousExecutionId,
		executionWaitingForWebhook,
		isInDebugMode,
		chatMessages,
		chatPartialExecutionDestinationNode,
		selectedTriggerNodeName,
		lastSuccessfulExecution,
		executionRunData,
		getExecutionRunDataByNodeName,
		executedNode,
		getAllLoadedFinishedExecutions,
		getPastChatMessages,
		isWorkflowRunning,
		executionTriggerNodeName,
		setExecution,
		setExecutionRunData,
		setActiveExecutionId,
		setExecutionWaitingForWebhook,
		setDebugMode,
		setChatPartialExecutionDestinationNode,
		setLastSuccessfulExecution,
		setCurrentWorkflowExecutions,
		clearCurrentWorkflowExecutions,
		addNodeExecutionStartedData,
		updateNodeExecutionStatus,
		updateNodeExecutionRunData,
		clearNodeExecutionData,
		removeNodeExecutionDataById,
		renameExecutionDataNode,
		deleteExecution,
		addToCurrentExecutions,
		resetChatMessages,
		appendChatMessage,
		setSelectedTriggerNodeName,
		clearExecutionStartedData,
		resetExecutionState,
		onExecutionChange: onExecutionChange.on,
	};
}
