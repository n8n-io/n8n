import { defineStore, getActivePinia, type StoreGeneric } from 'pinia';
import { computed, ref } from 'vue';
import { createEventHook } from '@vueuse/core';
import { STORES } from '@n8n/stores';
import type { PushPayload } from '@n8n/api-types';
import type { NodeExecuteBefore } from '@n8n/api-types/push/execution';
import type { IExecutionResponse } from '@/features/execution/executions/executions.types';
import { getPairedItemsMapping } from '@/app/utils/pairedItemUtils';
import type { IRunData, IRunExecutionData, ITaskData, ITaskStartedData } from 'n8n-workflow';
import { CHANGE_ACTION } from './workflowDocument/types';
import type { ChangeAction, ChangeEvent } from './workflowDocument/types';
import { IN_PROGRESS_EXECUTION_ID } from '@/app/constants';

export type ExecutionDataId = string;

type ExecutionDataField = 'execution' | 'executionStartedData' | 'executionDataState';

export type ExecutionDataPayload = {
	field: ExecutionDataField;
};

export type ExecutionDataChangeEvent = ChangeEvent<ExecutionDataPayload>;

type PiniaInternal = ReturnType<typeof getActivePinia> & {
	_s: Map<string, StoreGeneric>;
};

const EXECUTION_DATA_STORE_PREFIX =
	'EXECUTION_DATA' in STORES ? STORES.EXECUTION_DATA : 'executionData';

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

export function createExecutionDataId(executionId: string): ExecutionDataId {
	return executionId;
}

export function getExecutionDataStoreId(executionId: ExecutionDataId) {
	return `${EXECUTION_DATA_STORE_PREFIX}/${executionId}`;
}

export function getActiveExecutionDataStore(session: {
	activeExecutionId: string | null | undefined;
}) {
	const executionId =
		session.activeExecutionId === null ? IN_PROGRESS_EXECUTION_ID : session.activeExecutionId;

	return executionId ? useExecutionDataStore(executionId) : null;
}

export function useExecutionDataStore(executionId: ExecutionDataId) {
	return defineStore(getExecutionDataStoreId(executionId), () => {
		const currentExecution = ref<IExecutionResponse | null>(null);
		const executionStartedData =
			ref<[executionId: string, data: { [nodeName: string]: ITaskStartedData[] }]>();
		const executionResultDataLastUpdate = ref<number>();
		const executionPairedItemMappings = ref<Record<string, Set<string>>>({});

		const onExecutionDataChange = createEventHook<ExecutionDataChangeEvent>();

		function triggerChange(field: ExecutionDataField, action: ChangeAction = CHANGE_ACTION.UPDATE) {
			void onExecutionDataChange.trigger({ action, payload: { field } });
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

		function applyExecutionStartedData(
			data: [executionId: string, data: { [nodeName: string]: ITaskStartedData[] }] | undefined,
			action: ChangeAction = CHANGE_ACTION.UPDATE,
		) {
			executionStartedData.value = data;
			triggerChange('executionStartedData', action);
		}

		function resetExecutionData(action: ChangeAction = CHANGE_ACTION.DELETE) {
			currentExecution.value = null;
			executionStartedData.value = undefined;
			executionResultDataLastUpdate.value = undefined;
			executionPairedItemMappings.value = {};
			triggerChange('executionDataState', action);
		}

		const executionRunData = computed<IRunData | null>(() => {
			if (!currentExecution.value?.data?.resultData) {
				return null;
			}

			return currentExecution.value.data.resultData.runData;
		});

		const execution = computed(() => currentExecution.value);

		const executedNode = computed(() => currentExecution.value?.executedNode);

		function setExecution(executionData: IExecutionResponse | null) {
			applyExecutionData(executionData);
		}

		function setExecutionRunData(executionData: IRunExecutionData) {
			applyExecutionRunData(executionData);
		}

		function addNodeExecutionStartedData(data: NodeExecuteBefore['data']) {
			const existingStartedData = executionStartedData.value;
			const currentData =
				existingStartedData?.[0] === data.executionId ? existingStartedData[1] : {};

			applyExecutionStartedData([
				data.executionId,
				{
					...currentData,
					[data.nodeName]: [...(currentData[data.nodeName] ?? []), data.data],
				},
			]);
		}

		function clearExecutionStartedData() {
			applyExecutionStartedData(undefined, CHANGE_ACTION.DELETE);
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
					'[executionData] updateNodeExecutionStatus called without execution data; ignoring.',
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

		function renameExecutionDataNode(oldName: string, newName: string): void {
			renameExecutionResponseNodeData(currentExecution.value, oldName, newName);

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

			executionPairedItemMappings.value = getPairedItemsMapping(currentExecution.value);
			executionResultDataLastUpdate.value = Date.now();
			triggerChange('execution');
		}

		return {
			execution,
			executionRunData,
			executedNode,
			executionStartedData,
			executionPairedItemMappings,
			executionResultDataLastUpdate,
			setExecution,
			setExecutionRunData,
			addNodeExecutionStartedData,
			clearExecutionStartedData,
			getExecutionRunDataByNodeName,
			updateNodeExecutionStatus,
			updateNodeExecutionRunData,
			clearNodeExecutionData,
			renameExecutionDataNode,
			resetExecutionData,
			onExecutionDataChange: onExecutionDataChange.on,
		};
	})();
}

export function disposeExecutionDataStore(executionId: ExecutionDataId) {
	const pinia = getActivePinia() as PiniaInternal;
	if (!pinia) return;

	const storeId = getExecutionDataStoreId(executionId);

	if (pinia.state.value[storeId]) {
		const store = pinia._s.get(storeId);
		if (store) {
			store.$dispose();
		}
		delete pinia.state.value[storeId];
	}
}
