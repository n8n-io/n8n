import { IN_PROGRESS_EXECUTION_ID } from '@/app/constants';
import { openFormPopupWindow } from '@/features/execution/executions/executions.utils';
import type { IExecutionResponse } from '@/features/execution/executions/executions.types';
import { getPairedItemsMapping } from '@/app/utils/pairedItemUtils';
import { STORES } from '@n8n/stores';
import type { PushPayload } from '@n8n/api-types';
import type { NodeExecuteBefore } from '@n8n/api-types/push/execution';
import { createEventHook } from '@vueuse/core';
import { defineStore, getActivePinia, type StoreGeneric } from 'pinia';
import type { IRunData, IRunExecutionData, ITaskStartedData } from 'n8n-workflow';
import { computed, ref } from 'vue';
import { CHANGE_ACTION } from './workflowDocument/types';
import type { ChangeEvent } from './workflowDocument/types';
import {
	createWorkflowExecutionSessionId,
	useWorkflowExecutionSessionStore,
} from './workflowExecutionSession.store';

export type ExecutionDataId = string;

type PiniaInternal = ReturnType<typeof getActivePinia> & {
	_s: Map<string, StoreGeneric>;
};

export type ExecutionDataChangeEvent = ChangeEvent<{
	executionId: ExecutionDataId;
	nodeName?: string;
}>;

export function createExecutionDataId(executionId: string): ExecutionDataId {
	return executionId;
}

export function getExecutionDataStoreId(executionId: ExecutionDataId): string {
	return `${STORES.EXECUTION_DATA}/${executionId}`;
}

export function useExecutionDataStore(executionId: ExecutionDataId) {
	return defineStore(getExecutionDataStoreId(executionId), () => {
		const currentExecution = ref<IExecutionResponse | null>(null);
		const executionStartedData =
			ref<[executionId: string, data: { [nodeName: string]: ITaskStartedData[] }]>();
		const executionResultDataLastUpdate = ref<number>();
		const executionPairedItemMappings = ref<Record<string, Set<string>>>({});

		const onExecutionDataChange = createEventHook<ExecutionDataChangeEvent>();

		const execution = computed(() => currentExecution.value);
		const executionRunData = computed<IRunData | null>(() => {
			if (!currentExecution.value?.data?.resultData) return null;
			return currentExecution.value.data.resultData.runData;
		});
		const executedNode = computed(() => currentExecution.value?.executedNode);

		function touch(nodeName?: string) {
			executionPairedItemMappings.value = getPairedItemsMapping(currentExecution.value);
			executionResultDataLastUpdate.value = Date.now();
			void onExecutionDataChange.trigger({
				action: CHANGE_ACTION.UPDATE,
				payload: { executionId, nodeName },
			});
		}

		function setExecution(newExecution: IExecutionResponse | null) {
			if (newExecution?.data?.waitTill) {
				delete newExecution.data.resultData.runData[
					newExecution.data.resultData.lastNodeExecuted as string
				];
			}
			currentExecution.value = newExecution;
			executionStartedData.value = undefined;
			touch();
		}

		function setExecutionRunData(runExecutionData: IRunExecutionData) {
			if (!currentExecution.value) return;

			currentExecution.value = {
				...currentExecution.value,
				data: runExecutionData,
			};
			executionStartedData.value = undefined;
			touch();
		}

		function addNodeExecutionStartedData(data: NodeExecuteBefore['data']): void {
			const currentData =
				executionStartedData.value?.[0] === data.executionId ? executionStartedData.value?.[1] : {};

			executionStartedData.value = [
				data.executionId,
				{
					...currentData,
					[data.nodeName]: [...(currentData[data.nodeName] ?? []), data.data],
				},
			];
			void onExecutionDataChange.trigger({
				action: CHANGE_ACTION.ADD,
				payload: { executionId, nodeName: data.nodeName },
			});
		}

		function clearExecutionStartedData(): void {
			executionStartedData.value = undefined;
			void onExecutionDataChange.trigger({
				action: CHANGE_ACTION.DELETE,
				payload: { executionId },
			});
		}

		function getExecutionRunDataByNodeName(nodeName: string) {
			if (executionRunData.value === null) return null;
			if (!Object.prototype.hasOwnProperty.call(executionRunData.value, nodeName)) return null;
			return executionRunData.value[nodeName];
		}

		function updateNodeExecutionStatus(pushData: PushPayload<'nodeExecuteAfterData'>): void {
			if (!currentExecution.value?.data) {
				console.warn(
					'[executionData.store] updateNodeExecutionStatus called without execution data; ignoring.',
				);
				return;
			}

			const { nodeName, data } = pushData;
			const isNodeWaiting = data.executionStatus === 'waiting';

			currentExecution.value.data.resultData.lastNodeExecuted = nodeName;

			if (currentExecution.value.data.resultData.runData[nodeName] === undefined) {
				currentExecution.value.data.resultData.runData[nodeName] = [];
			}

			const tasksData = currentExecution.value.data.resultData.runData[nodeName];
			if (isNodeWaiting) {
				tasksData.push(data);
				if (data.metadata?.resumeFormUrl) {
					openFormPopupWindow(data.metadata.resumeFormUrl);
				}
			} else {
				const existingRunIndex = tasksData.findIndex(
					(item) => item.executionIndex === data.executionIndex,
				);
				const hasWaitingItems = tasksData.some((it) => it.executionStatus === 'waiting');
				const index =
					existingRunIndex > -1 && !hasWaitingItems ? existingRunIndex : tasksData.length - 1;
				const status = tasksData[index]?.executionStatus ?? 'unknown';

				if (status === 'waiting' || status === 'running' || tasksData[existingRunIndex]) {
					tasksData.splice(index, 1, data);
				} else {
					tasksData.push(data);
				}
			}

			if (!currentExecution.value.data.redactionInfo?.isRedacted && data.data) {
				for (const connectionType of Object.keys(data.data)) {
					for (const items of data.data[connectionType]) {
						if (items?.some((item) => item.redaction?.redacted)) {
							currentExecution.value.data.redactionInfo = {
								isRedacted: true,
								reason:
									items.find((item) => item.redaction?.redacted)?.redaction?.reason ??
									'workflow_redaction_policy',
								canReveal: false,
							};
							break;
						}
					}
					if (currentExecution.value.data.redactionInfo?.isRedacted) break;
				}
			}

			touch(nodeName);
		}

		function updateNodeExecutionRunData(pushData: PushPayload<'nodeExecuteAfterData'>): void {
			const tasksData = currentExecution.value?.data?.resultData.runData[pushData.nodeName];
			const existingRunIndex =
				tasksData?.findIndex((item) => item.executionIndex === pushData.data.executionIndex) ?? -1;

			if (tasksData?.[existingRunIndex]) {
				tasksData.splice(existingRunIndex, 1, pushData.data);
				touch(pushData.nodeName);
			}
		}

		function clearNodeExecutionData(nodeName: string): void {
			if (!currentExecution.value?.data) return;

			const { [nodeName]: _removedRunData, ...remainingRunData } =
				currentExecution.value.data.resultData.runData;
			currentExecution.value.data.resultData.runData = remainingRunData;
			touch(nodeName);
		}

		function renameExecutionDataNode(oldName: string, newName: string): void {
			const currentExecutionValue = currentExecution.value;
			const resultData = currentExecutionValue?.data?.resultData;
			if (!resultData) return;

			if (resultData.runData?.[oldName]) {
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
					if (
						typeof pairedItem === 'number' ||
						pairedItem?.sourceOverwrite?.previousNode !== oldName
					)
						return;
					pairedItem.sourceOverwrite.previousNode = newName;
				});

			Object.values(resultData.runData ?? {})
				.flatMap((taskData) => taskData.flatMap((task) => task.source))
				.forEach((source) => {
					if (!source || source.previousNode !== oldName) return;
					source.previousNode = newName;
				});

			if (currentExecutionValue.workflowData) {
				currentExecutionValue.workflowData.nodes = currentExecutionValue.workflowData.nodes.map(
					(node) => (node.name === oldName ? { ...node, name: newName } : node),
				);
				const connections = currentExecutionValue.workflowData.connections;
				if (connections?.[oldName]) {
					connections[newName] = connections[oldName];
					delete connections[oldName];
				}
				Object.values(connections ?? {}).forEach((nodeConnections) => {
					Object.values(nodeConnections ?? {}).forEach((connectionGroups) => {
						connectionGroups?.forEach((connectionsForOutput) => {
							connectionsForOutput?.forEach((connection) => {
								if (connection.node === oldName) connection.node = newName;
							});
						});
					});
				});
			}

			touch(newName);
		}

		function resetExecutionData(): void {
			currentExecution.value = null;
			executionStartedData.value = undefined;
			executionPairedItemMappings.value = {};
			executionResultDataLastUpdate.value = undefined;
			void onExecutionDataChange.trigger({
				action: CHANGE_ACTION.DELETE,
				payload: { executionId },
			});
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
		pinia._s.get(storeId)?.$dispose();
		delete pinia.state.value[storeId];
	}
}

export function getActiveExecutionDataStore(
	session:
		| {
				activeExecutionId?: string | null | undefined;
				workflowId?: string;
		  }
		| null
		| undefined,
) {
	let activeExecutionId = session?.activeExecutionId;

	if (activeExecutionId === undefined && session?.workflowId) {
		const workflowSession = useWorkflowExecutionSessionStore(
			createWorkflowExecutionSessionId(session.workflowId),
		);
		activeExecutionId = workflowSession.activeExecutionId;
	}

	if (activeExecutionId === null) {
		activeExecutionId = IN_PROGRESS_EXECUTION_ID;
	}

	if (activeExecutionId === undefined) return null;
	return useExecutionDataStore(createExecutionDataId(activeExecutionId));
}
