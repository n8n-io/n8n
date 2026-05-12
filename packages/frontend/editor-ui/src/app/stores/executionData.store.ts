import { defineStore, getActivePinia } from 'pinia';
import { STORES } from '@n8n/stores';
import { computed, inject, readonly, ref } from 'vue';
import { createEventHook } from '@vueuse/core';
import type { IRunData, IRunExecutionData, ITaskStartedData } from 'n8n-workflow';
import type { PushPayload } from '@n8n/api-types';
import type { NodeExecuteBefore } from '@n8n/api-types/push/execution';
import type { IExecutionResponse } from '@/features/execution/executions/executions.types';
import { ExecutionDataStoreKey } from '@/app/constants/injectionKeys';
import { getPairedItemsMapping } from '@/app/utils/pairedItemUtils';
import { CHANGE_ACTION } from './workflowDocument/types';
import type { ChangeAction, ChangeEvent } from './workflowDocument/types';

export type ExecutionDataId = string;

export type ExecutionDataChangePayload = {
	executionId: ExecutionDataId;
	nodeName?: string;
};

export type ExecutionDataChangeEvent = ChangeEvent<ExecutionDataChangePayload>;

export type ExecutionStartedDataValue = [
	executionId: string,
	data: { [nodeName: string]: ITaskStartedData[] },
];

export interface SetExecutionOptions {
	/**
	 * When the execution has `waitTill` set, the latest task for `lastNodeExecuted`
	 * is the transient waiting placeholder. Default behavior is to drop it so the
	 * UI can render the resumed run cleanly. Set to false to retain it.
	 */
	stripWaitingTaskData?: boolean;
}

export function createExecutionDataId(executionId: string): ExecutionDataId {
	return executionId;
}

/**
 * Gets the Pinia store id for an execution data store.
 */
export function getExecutionDataStoreId(id: ExecutionDataId) {
	return `${STORES.EXECUTION_DATA}/${id}`;
}

/**
 * Creates an execution data store keyed by execution id.
 *
 * Multiple instances live concurrently (active execution, displayed execution,
 * last successful execution). Pinia handles deduplication per id.
 */
export function useExecutionDataStore(id: ExecutionDataId) {
	return defineStore(getExecutionDataStoreId(id), () => {
		const execution = ref<IExecutionResponse | null>(null);
		const executionResultDataLastUpdate = ref<number>();
		const executionStartedData = ref<ExecutionStartedDataValue>();
		const executionPairedItemMappings = ref<Record<string, Set<string>>>({});

		const onExecutionDataChange = createEventHook<ExecutionDataChangeEvent>();

		const executionRunData = computed<IRunData | null>(
			() => execution.value?.data?.resultData?.runData ?? null,
		);

		const executedNode = computed(() => execution.value?.executedNode);

		function fireChange(action: ChangeAction, nodeName?: string) {
			void onExecutionDataChange.trigger({
				action,
				payload: { executionId: id, ...(nodeName ? { nodeName } : {}) },
			});
		}

		function getExecutionRunDataByNodeName(nodeName: string) {
			const runData = executionRunData.value;
			if (runData === null) return null;
			if (!runData.hasOwnProperty(nodeName)) return null;
			return runData[nodeName];
		}

		function setExecution(value: IExecutionResponse | null, opts: SetExecutionOptions = {}) {
			const { stripWaitingTaskData = true } = opts;
			if (stripWaitingTaskData && value?.data?.waitTill) {
				delete value.data.resultData.runData[value.data.resultData.lastNodeExecuted as string];
			}
			execution.value = value;
			executionResultDataLastUpdate.value = Date.now();
			executionPairedItemMappings.value = getPairedItemsMapping(value);
			executionStartedData.value = undefined;
			fireChange(value === null ? CHANGE_ACTION.DELETE : CHANGE_ACTION.UPDATE);
		}

		function setExecutionRunData(runExecutionData: IRunExecutionData) {
			if (!execution.value) return;
			execution.value = { ...execution.value, data: runExecutionData };
			executionResultDataLastUpdate.value = Date.now();
			executionStartedData.value = undefined;
			fireChange(CHANGE_ACTION.UPDATE);
		}

		function addNodeExecutionStartedData(data: NodeExecuteBefore['data']) {
			const currentData =
				executionStartedData.value?.[0] === data.executionId ? executionStartedData.value[1] : {};

			executionStartedData.value = [
				data.executionId,
				{
					...currentData,
					[data.nodeName]: [...(currentData[data.nodeName] ?? []), data.data],
				},
			];

			fireChange(CHANGE_ACTION.ADD, data.nodeName);
		}

		function clearExecutionStartedData() {
			executionStartedData.value = undefined;
			fireChange(CHANGE_ACTION.DELETE);
		}

		function updateNodeExecutionStatus(pushData: PushPayload<'nodeExecuteAfterData'>) {
			if (!execution.value?.data) return;

			const { nodeName, data } = pushData;
			const isNodeWaiting = data.executionStatus === 'waiting';

			execution.value.data.resultData.lastNodeExecuted = nodeName;

			if (execution.value.data.resultData.runData[nodeName] === undefined) {
				execution.value.data.resultData.runData[nodeName] = [];
			}

			const tasksData = execution.value.data.resultData.runData[nodeName];
			if (isNodeWaiting) {
				tasksData.push(data);
			} else {
				// If we process items in parallel on subnodes we get several placeholder
				// taskData items. Find and replace the item with the matching
				// executionIndex; only append if no match.
				const existingRunIndex = tasksData.findIndex(
					(item) => item.executionIndex === data.executionIndex,
				);

				// For waiting nodes always replace the last item as executionIndex differs.
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

			// Conservative redaction synthesis from item-level markers in push events.
			// The full redactionInfo (with accurate canReveal) arrives later via the
			// executionFinished REST call; this provides an early signal so the UI can
			// show the redacted state during live execution.
			if (!execution.value.data.redactionInfo?.isRedacted && data.data) {
				for (const connectionType of Object.keys(data.data)) {
					for (const items of data.data[connectionType]) {
						if (items?.some((item) => item.redaction?.redacted)) {
							execution.value.data.redactionInfo = {
								isRedacted: true,
								reason:
									items.find((item) => item.redaction?.redacted)?.redaction?.reason ??
									'workflow_redaction_policy',
								canReveal: false,
							};
							break;
						}
					}
					if (execution.value.data.redactionInfo?.isRedacted) break;
				}
			}

			executionResultDataLastUpdate.value = Date.now();
			fireChange(CHANGE_ACTION.UPDATE, nodeName);
		}

		function updateNodeExecutionRunData(pushData: PushPayload<'nodeExecuteAfterData'>) {
			const tasksData = execution.value?.data?.resultData.runData[pushData.nodeName];
			const existingRunIndex =
				tasksData?.findIndex((item) => item.executionIndex === pushData.data.executionIndex) ?? -1;

			if (tasksData?.[existingRunIndex]) {
				tasksData.splice(existingRunIndex, 1, pushData.data);
				executionResultDataLastUpdate.value = Date.now();
				fireChange(CHANGE_ACTION.UPDATE, pushData.nodeName);
			}
		}

		function clearNodeExecutionData(nodeName: string) {
			if (!execution.value?.data) return;
			const { [nodeName]: _removed, ...remaining } = execution.value.data.resultData.runData;
			execution.value.data.resultData.runData = remaining;
			executionResultDataLastUpdate.value = Date.now();
			fireChange(CHANGE_ACTION.DELETE, nodeName);
		}

		function renameExecutionDataNode(oldName: string, newName: string) {
			const data = execution.value?.data;
			if (!data) return;

			// runData keys
			const runData = data.resultData?.runData;
			if (runData?.[oldName]) {
				runData[newName] = runData[oldName];
				delete runData[oldName];
			}

			// pinData keys (in execution result, distinct from workflow document pinData)
			const pinData = data.resultData?.pinData;
			if (pinData?.[oldName]) {
				pinData[newName] = pinData[oldName];
				delete pinData[oldName];
			}

			// pairedItem.sourceOverwrite.previousNode in pinData
			Object.values(pinData ?? {})
				.flatMap((items) =>
					items.flatMap((item) =>
						Array.isArray(item.pairedItem) ? item.pairedItem : [item.pairedItem],
					),
				)
				.forEach((pairedItem) => {
					if (
						typeof pairedItem === 'number' ||
						pairedItem?.sourceOverwrite?.previousNode !== oldName
					) {
						return;
					}
					pairedItem.sourceOverwrite.previousNode = newName;
				});

			// task.source.previousNode in runData
			Object.values(runData ?? {})
				.flatMap((tasks) => tasks.flatMap((task) => task.source))
				.forEach((source) => {
					if (!source || source.previousNode !== oldName) return;
					source.previousNode = newName;
				});

			// workflowData snapshot embedded in execution: nodes, connections, pinData
			const workflowData = execution.value?.workflowData;
			if (workflowData) {
				workflowData.nodes = workflowData.nodes.map((node) =>
					node.name === oldName ? { ...node, name: newName } : node,
				);
				if (workflowData.connections?.[oldName]) {
					workflowData.connections[newName] = workflowData.connections[oldName];
					delete workflowData.connections[oldName];
				}
				for (const sourceName of Object.keys(workflowData.connections ?? {})) {
					const outputs = workflowData.connections[sourceName];
					for (const connectionType of Object.keys(outputs)) {
						const outputBuckets = outputs[connectionType];
						for (const bucket of outputBuckets ?? []) {
							if (!bucket) continue;
							for (const conn of bucket) {
								if (conn?.node === oldName) conn.node = newName;
							}
						}
					}
				}
				if (workflowData.pinData?.[oldName]) {
					workflowData.pinData[newName] = workflowData.pinData[oldName];
					delete workflowData.pinData[oldName];
				}
			}

			// executedNode reference
			if (execution.value && execution.value.executedNode === oldName) {
				execution.value.executedNode = newName;
			}

			executionResultDataLastUpdate.value = Date.now();
			fireChange(CHANGE_ACTION.UPDATE);
		}

		function resetExecutionData() {
			execution.value = null;
			executionResultDataLastUpdate.value = undefined;
			executionStartedData.value = undefined;
			executionPairedItemMappings.value = {};
			fireChange(CHANGE_ACTION.DELETE);
		}

		return {
			executionId: id,
			// Read API
			execution: readonly(execution),
			executionResultDataLastUpdate: readonly(executionResultDataLastUpdate),
			executionRunData,
			executedNode,
			executionStartedData: readonly(executionStartedData),
			executionPairedItemMappings: readonly(executionPairedItemMappings),
			getExecutionRunDataByNodeName,
			// Write API
			setExecution,
			setExecutionRunData,
			addNodeExecutionStartedData,
			clearExecutionStartedData,
			updateNodeExecutionStatus,
			updateNodeExecutionRunData,
			clearNodeExecutionData,
			renameExecutionDataNode,
			resetExecutionData,
			// Events
			onExecutionDataChange: onExecutionDataChange.on,
		};
	})();
}

/**
 * Disposes an execution data store instance. Call this when an execution is
 * unloaded (e.g. workflow switch, iframe re-execution, end of session).
 *
 * Pinia's $dispose removes the store from its registry, but not from
 * pinia.state. Remove the state entry as well so recreating starts clean.
 */
export function disposeExecutionDataStore(store: ReturnType<typeof useExecutionDataStore>) {
	const pinia = getActivePinia();
	store.$dispose();

	if (pinia) {
		delete pinia.state.value[store.$id];
	}
}

/**
 * Injects the active execution data store from the current component tree.
 * Returns null if not within a component context that has provided the store.
 */
export function injectExecutionDataStore() {
	return inject(ExecutionDataStoreKey, null);
}
