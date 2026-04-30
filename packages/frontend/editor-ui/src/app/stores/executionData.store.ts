import { createEventHook } from '@vueuse/core';
import { STORES } from '@n8n/stores';
import type { PushPayload } from '@n8n/api-types';
import type { NodeExecuteBefore } from '@n8n/api-types/push/execution';
import { defineStore, getActivePinia, type StoreGeneric } from 'pinia';
import type {
	IConnections,
	IConnection,
	INodeExecutionData,
	IRunData,
	IRunExecutionData,
	ITaskData,
	ITaskStartedData,
} from 'n8n-workflow';
import { computed, ref } from 'vue';

import type { IExecutionResponse } from '@/features/execution/executions/executions.types';
import { openFormPopupWindow } from '@/features/execution/executions/executions.utils';
import { getPairedItemsMapping } from '@/app/utils/pairedItemUtils';
import { CHANGE_ACTION } from './workflowDocument/types';
import type { ChangeAction, ChangeEvent } from './workflowDocument/types';

export type ExecutionDataId = string;

export type ExecutionDataChangePayload = {
	executionId: ExecutionDataId;
	nodeName?: string;
	execution: IExecutionResponse | null;
};

export type ExecutionDataChangeEvent = ChangeEvent<ExecutionDataChangePayload>;

type PiniaInternal = ReturnType<typeof getActivePinia> & {
	_s: Map<string, StoreGeneric>;
};

export function createExecutionDataId(executionId: string): ExecutionDataId {
	return executionId;
}

export function getExecutionDataStoreId(executionId: ExecutionDataId): string {
	return `${STORES.EXECUTION_DATA}/${executionId}`;
}

function getExecutionId(executionId: ExecutionDataId, execution: IExecutionResponse | null) {
	return execution?.id ?? executionId;
}

function updateExecutionResultData(
	execution: IExecutionResponse | null,
	updater: (resultData: NonNullable<IRunExecutionData['resultData']>) => void,
) {
	if (!execution?.data?.resultData) return false;

	updater(execution.data.resultData);
	return true;
}

function updatePairedItemSourceOverwrite(
	executionData: INodeExecutionData[],
	oldName: string,
	newName: string,
) {
	executionData
		.flatMap((nodeExecution) =>
			Array.isArray(nodeExecution.pairedItem)
				? nodeExecution.pairedItem
				: [nodeExecution.pairedItem],
		)
		.forEach((pairedItem) => {
			if (typeof pairedItem === 'number' || pairedItem?.sourceOverwrite?.previousNode !== oldName) {
				return;
			}

			pairedItem.sourceOverwrite.previousNode = newName;
		});
}

function renamePinDataReferences(
	pinData: NonNullable<IRunExecutionData['resultData']>['pinData'],
	oldName: string,
	newName: string,
) {
	if (!pinData) return;

	if (pinData[oldName]) {
		pinData[newName] = pinData[oldName];
		delete pinData[oldName];
	}

	Object.values(pinData).forEach((executionData) => {
		updatePairedItemSourceOverwrite(executionData, oldName, newName);
	});
}

function renameRunDataReferences(runData: IRunData, oldName: string, newName: string) {
	if (runData[oldName]) {
		runData[newName] = runData[oldName];
		delete runData[oldName];
	}

	Object.values(runData)
		.flatMap((taskData) => taskData.flatMap((task) => task.source))
		.forEach((source) => {
			if (!source || source.previousNode !== oldName) return;

			source.previousNode = newName;
		});
}

function renameWorkflowConnections(connections: IConnections, oldName: string, newName: string) {
	if (connections[oldName]) {
		connections[newName] = connections[oldName];
		delete connections[oldName];
	}

	Object.values(connections).forEach((nodeConnections) => {
		Object.values(nodeConnections).forEach((typedConnections) => {
			typedConnections.forEach((connectionGroup) => {
				connectionGroup?.forEach((connection: IConnection) => {
					if (connection.node === oldName) {
						connection.node = newName;
					}
				});
			});
		});
	});
}

function getRedactedItem(data: ITaskData['data']) {
	if (!data) return undefined;

	for (const connectionType of Object.keys(data)) {
		for (const items of data[connectionType]) {
			const redactedItem = items?.find((item) => item.redaction?.redacted);
			if (redactedItem) return redactedItem;
		}
	}

	return undefined;
}

export function useExecutionDataStore(executionId: ExecutionDataId) {
	return defineStore(getExecutionDataStoreId(executionId), () => {
		const execution = ref<IExecutionResponse | null>(null);
		const executionStartedData =
			ref<[executionId: string, data: { [nodeName: string]: ITaskStartedData[] }]>();
		const executionResultDataLastUpdate = ref<number>();
		const executionPairedItemMappings = ref<Record<string, Set<string>>>({});

		const executionRunData = computed<IRunData | null>(() => {
			return execution.value?.data?.resultData?.runData ?? null;
		});
		const executedNode = computed(() => execution.value?.executedNode);

		const onExecutionDataChange = createEventHook<ExecutionDataChangeEvent>();

		function triggerExecutionDataChange(action: ChangeAction, nodeName?: string) {
			void onExecutionDataChange.trigger({
				action,
				payload: {
					executionId,
					nodeName,
					execution: execution.value,
				},
			});
		}

		function refreshExecutionData(action: ChangeAction, nodeName?: string) {
			executionPairedItemMappings.value = getPairedItemsMapping(execution.value);
			executionResultDataLastUpdate.value = Date.now();
			triggerExecutionDataChange(action, nodeName);
		}

		function clearExecutionStartedData() {
			executionStartedData.value = undefined;
		}

		function setExecution(newExecution: IExecutionResponse | null) {
			if (newExecution?.data?.waitTill) {
				const lastNodeExecuted = newExecution.data.resultData.lastNodeExecuted;
				if (lastNodeExecuted) {
					delete newExecution.data.resultData.runData[lastNodeExecuted];
				}
			}

			execution.value = newExecution;
			clearExecutionStartedData();
			refreshExecutionData(CHANGE_ACTION.UPDATE);
		}

		function setExecutionRunData(runExecutionData: IRunExecutionData) {
			if (!execution.value) return;

			execution.value = {
				...execution.value,
				data: runExecutionData,
			};
			clearExecutionStartedData();
			refreshExecutionData(CHANGE_ACTION.UPDATE);
		}

		function addNodeExecutionStartedData(data: NodeExecuteBefore['data']) {
			const targetExecutionId = getExecutionId(executionId, execution.value);
			if (data.executionId !== targetExecutionId) return;

			const currentData =
				executionStartedData.value?.[0] === data.executionId ? executionStartedData.value[1] : {};

			executionStartedData.value = [
				data.executionId,
				{
					...currentData,
					[data.nodeName]: [...(currentData[data.nodeName] ?? []), data.data],
				},
			];
		}

		function getExecutionRunDataByNodeName(nodeName: string) {
			return execution.value?.data?.resultData.runData[nodeName];
		}

		function updateNodeExecutionStatus(pushData: PushPayload<'nodeExecuteAfterData'>) {
			if (!execution.value?.data) {
				console.warn(
					'[executionData.store] updateNodeExecutionStatus called without execution data; ignoring.',
				);
				return;
			}

			const { nodeName, data } = pushData;
			const node = execution.value.workflowData.nodes.find(
				(workflowNode) => workflowNode.name === nodeName,
			);
			if (!node) return;

			execution.value.data.resultData.lastNodeExecuted = nodeName;
			execution.value.data.resultData.runData[nodeName] ??= [];

			const tasksData = execution.value.data.resultData.runData[nodeName];
			if (data.executionStatus === 'waiting') {
				tasksData.push(data);

				if (data.metadata?.resumeFormUrl) {
					openFormPopupWindow(data.metadata.resumeFormUrl);
				}
			} else {
				const existingRunIndex = tasksData.findIndex(
					(item) => item.executionIndex === data.executionIndex,
				);
				const hasWaitingItems = tasksData.some((item) => item.executionStatus === 'waiting');
				const index =
					existingRunIndex > -1 && !hasWaitingItems ? existingRunIndex : tasksData.length - 1;
				const status = tasksData[index]?.executionStatus ?? 'unknown';

				if (status === 'waiting' || status === 'running' || tasksData[existingRunIndex]) {
					tasksData.splice(index, 1, data);
				} else {
					tasksData.push(data);
				}
			}

			const redactedItem = getRedactedItem(data.data);
			if (!execution.value.data.redactionInfo?.isRedacted && redactedItem) {
				execution.value.data.redactionInfo = {
					isRedacted: true,
					reason: redactedItem.redaction?.reason ?? 'workflow_redaction_policy',
					canReveal: false,
				};
			}

			refreshExecutionData(CHANGE_ACTION.UPDATE, nodeName);
		}

		function updateNodeExecutionRunData(pushData: PushPayload<'nodeExecuteAfterData'>) {
			const tasksData = execution.value?.data?.resultData.runData[pushData.nodeName];
			const existingRunIndex =
				tasksData?.findIndex((item) => item.executionIndex === pushData.data.executionIndex) ?? -1;

			if (!tasksData?.[existingRunIndex]) return;

			tasksData.splice(existingRunIndex, 1, pushData.data);
			refreshExecutionData(CHANGE_ACTION.UPDATE, pushData.nodeName);
		}

		function clearNodeExecutionData(nodeName: string) {
			const updated = updateExecutionResultData(execution.value, (resultData) => {
				const { [nodeName]: _removedRunData, ...remainingRunData } = resultData.runData;
				resultData.runData = remainingRunData;
			});

			if (updated) refreshExecutionData(CHANGE_ACTION.DELETE, nodeName);
		}

		function renameExecutionDataNode(oldName: string, newName: string) {
			if (!execution.value) return;

			updateExecutionResultData(execution.value, (resultData) => {
				renameRunDataReferences(resultData.runData, oldName, newName);
				renamePinDataReferences(resultData.pinData, oldName, newName);

				if (resultData.lastNodeExecuted === oldName) {
					resultData.lastNodeExecuted = newName;
				}
			});

			execution.value.workflowData.nodes.forEach((node) => {
				if (node.name === oldName) {
					node.name = newName;
				}
			});
			renameWorkflowConnections(execution.value.workflowData.connections, oldName, newName);
			renamePinDataReferences(execution.value.workflowData.pinData, oldName, newName);

			if (execution.value.executedNode === oldName) {
				execution.value.executedNode = newName;
			}
			if (execution.value.triggerNode === oldName) {
				execution.value.triggerNode = newName;
			}

			refreshExecutionData(CHANGE_ACTION.UPDATE, newName);
		}

		function resetExecutionData() {
			execution.value = null;
			executionPairedItemMappings.value = {};
			clearExecutionStartedData();
			executionResultDataLastUpdate.value = undefined;
			triggerExecutionDataChange(CHANGE_ACTION.DELETE);
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
