import { createEventHook } from '@vueuse/core';
import { STORES } from '@n8n/stores';
import { defineStore, getActivePinia, type StoreGeneric } from 'pinia';
import type { ExecutionSummary, IRunData, ITaskData } from 'n8n-workflow';
import { computed, ref } from 'vue';

import type { IExecutionResponse } from '@/features/execution/executions/executions.types';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';
import { createExecutionDataId, useExecutionDataStore } from '@/app/stores/executionData.store';
import { CHANGE_ACTION } from './workflowDocument/types';
import type { ChangeAction, ChangeEvent } from './workflowDocument/types';

export type WorkflowExecutionSessionId = string;

type WorkflowExecutionSessionChangePayload = {
	workflowId: WorkflowExecutionSessionId;
};

type WorkflowExecutionSessionChangeEvent = ChangeEvent<WorkflowExecutionSessionChangePayload>;

type PiniaInternal = ReturnType<typeof getActivePinia> & {
	_s: Map<string, StoreGeneric>;
};

export function createWorkflowExecutionSessionId(workflowId: string): WorkflowExecutionSessionId {
	return workflowId;
}

export function getWorkflowExecutionSessionStoreId(workflowId: WorkflowExecutionSessionId): string {
	return `${STORES.WORKFLOW_EXECUTION_SESSIONS}/${workflowId}`;
}

export function useWorkflowExecutionSessionStore(workflowId: WorkflowExecutionSessionId) {
	return defineStore(getWorkflowExecutionSessionStoreId(workflowId), () => {
		const nodeTypesStore = useNodeTypesStore();

		const activeExecutionId = ref<string | null | undefined>();
		const displayedExecutionId = ref<string | undefined>();
		const previousExecutionId = ref<string | null | undefined>();
		const executionWaitingForWebhook = ref(false);
		const isInDebugMode = ref(false);
		const chatMessages = ref<string[]>([]);
		const chatPartialExecutionDestinationNode = ref<string | null>(null);
		const selectedTriggerNodeName = ref<string>();
		const currentWorkflowExecutions = ref<ExecutionSummary[]>([]);
		const lastSuccessfulExecutionId = ref<string | null>(null);
		const pendingExecution = ref<IExecutionResponse | null>(null);

		const onExecutionSessionChange = createEventHook<WorkflowExecutionSessionChangeEvent>();

		function getActiveExecutionDataStore() {
			const executionId = activeExecutionId.value ?? displayedExecutionId.value;
			if (!executionId) return null;

			return useExecutionDataStore(createExecutionDataId(executionId));
		}

		const activeExecution = computed(() => {
			if (activeExecutionId.value === null) return pendingExecution.value;

			return getActiveExecutionDataStore()?.execution ?? null;
		});

		const activeExecutionRunData = computed<IRunData | null>(() => {
			return activeExecution.value?.data?.resultData.runData ?? null;
		});

		const activeExecutionStartedData = computed(() => {
			return getActiveExecutionDataStore()?.executionStartedData;
		});

		const activeExecutionPairedItemMappings = computed<Record<string, Set<string>>>(() => {
			return getActiveExecutionDataStore()?.executionPairedItemMappings ?? {};
		});

		const activeExecutionResultDataLastUpdate = computed<number | undefined>(() => {
			return getActiveExecutionDataStore()?.executionResultDataLastUpdate;
		});

		const lastSuccessfulExecution = computed<IExecutionResponse | null>({
			get() {
				if (!lastSuccessfulExecutionId.value) return null;

				return useExecutionDataStore(createExecutionDataId(lastSuccessfulExecutionId.value))
					.execution;
			},
			set(execution) {
				setLastSuccessfulExecution(execution);
			},
		});

		const isWorkflowRunning = computed(() => {
			if (activeExecutionId.value === null) return true;
			if (!activeExecutionId.value || !activeExecution.value) return false;

			return (
				['waiting', 'running'].includes(activeExecution.value.status) &&
				activeExecution.value.finished !== true
			);
		});

		const executionTriggerNodeName = computed(() => {
			if (!isWorkflowRunning.value) return undefined;
			if (activeExecution.value?.triggerNode) return activeExecution.value.triggerNode;

			const runData = activeExecution.value?.data?.resultData.runData ?? {};
			return Object.keys(runData).find((nodeName) => {
				const node = activeExecution.value?.workflowData.nodes.find(
					({ name }) => name === nodeName,
				);
				if (!node) return false;

				return (
					nodeTypesStore.getNodeType(node.type, node.typeVersion)?.group.includes('trigger') ??
					false
				);
			});
		});

		const getAllLoadedFinishedExecutions = computed(() =>
			currentWorkflowExecutions.value.filter(
				(execution) => execution.finished === true || execution.stoppedAt !== undefined,
			),
		);

		const getPastChatMessages = computed(() => chatMessages.value);

		function triggerExecutionSessionChange(action: ChangeAction) {
			void onExecutionSessionChange.trigger({
				action,
				payload: { workflowId },
			});
		}

		function setActiveExecutionId(id: string | null | undefined) {
			if (id) {
				previousExecutionId.value = activeExecutionId.value;
				displayedExecutionId.value = id;
			}
			activeExecutionId.value = id;
			triggerExecutionSessionChange(CHANGE_ACTION.UPDATE);
		}

		function setPendingExecution(execution: IExecutionResponse | null) {
			pendingExecution.value = execution;
			triggerExecutionSessionChange(execution ? CHANGE_ACTION.UPDATE : CHANGE_ACTION.DELETE);
		}

		function setPendingExecutionRunData(runData: IRunData) {
			if (!pendingExecution.value?.data?.resultData) return;

			pendingExecution.value = {
				...pendingExecution.value,
				data: {
					...pendingExecution.value.data,
					resultData: {
						...pendingExecution.value.data.resultData,
						runData,
					},
				},
			};
			triggerExecutionSessionChange(CHANGE_ACTION.UPDATE);
		}

		function getActiveExecutionRunDataByNodeName(nodeName: string): ITaskData[] | null {
			return activeExecutionRunData.value?.[nodeName] ?? null;
		}

		function clearActiveNodeExecutionData(nodeName: string) {
			const executionDataStore = getActiveExecutionDataStore();
			if (executionDataStore) {
				executionDataStore.clearNodeExecutionData(nodeName);
				return;
			}

			if (!pendingExecution.value?.data?.resultData) return;

			const { [nodeName]: _removedRunData, ...remainingRunData } =
				pendingExecution.value.data.resultData.runData;
			setPendingExecutionRunData(remainingRunData);
		}

		function promotePendingExecution(executionId: string) {
			if (!pendingExecution.value) return null;

			const execution = {
				...pendingExecution.value,
				id: executionId,
			};
			useExecutionDataStore(createExecutionDataId(executionId)).setExecution(execution);
			displayedExecutionId.value = executionId;
			pendingExecution.value = null;
			triggerExecutionSessionChange(CHANGE_ACTION.UPDATE);
			return execution;
		}

		function setExecutionWaitingForWebhook(waitingForWebhook: boolean) {
			executionWaitingForWebhook.value = waitingForWebhook;
			triggerExecutionSessionChange(CHANGE_ACTION.UPDATE);
		}

		function setDebugMode(debugMode: boolean) {
			isInDebugMode.value = debugMode;
			triggerExecutionSessionChange(CHANGE_ACTION.UPDATE);
		}

		function setChatPartialExecutionDestinationNode(nodeName: string | null) {
			chatPartialExecutionDestinationNode.value = nodeName;
			triggerExecutionSessionChange(CHANGE_ACTION.UPDATE);
		}

		function setLastSuccessfulExecution(execution: IExecutionResponse | null) {
			if (!execution) {
				lastSuccessfulExecutionId.value = null;
				triggerExecutionSessionChange(CHANGE_ACTION.UPDATE);
				return;
			}

			useExecutionDataStore(createExecutionDataId(execution.id)).setExecution(execution);
			lastSuccessfulExecutionId.value = execution.id;
			displayedExecutionId.value = execution.id;
			triggerExecutionSessionChange(CHANGE_ACTION.UPDATE);
		}

		function setLastSuccessfulExecutionId(executionId: string | null) {
			lastSuccessfulExecutionId.value = executionId;
			triggerExecutionSessionChange(CHANGE_ACTION.UPDATE);
		}

		function filterCurrentWorkflowExecutions(executions: ExecutionSummary[]) {
			const executionIds = new Set<string>();

			return executions.filter((execution) => {
				if (execution.workflowId !== workflowId || executionIds.has(execution.id)) return false;

				executionIds.add(execution.id);
				return true;
			});
		}

		function setCurrentWorkflowExecutions(executions: ExecutionSummary[]) {
			currentWorkflowExecutions.value = filterCurrentWorkflowExecutions(executions);
			triggerExecutionSessionChange(CHANGE_ACTION.UPDATE);
		}

		function clearCurrentWorkflowExecutions() {
			currentWorkflowExecutions.value = [];
			triggerExecutionSessionChange(CHANGE_ACTION.DELETE);
		}

		function deleteExecution(execution: ExecutionSummary | string) {
			const executionId = typeof execution === 'string' ? execution : execution.id;
			currentWorkflowExecutions.value = currentWorkflowExecutions.value.filter(
				(currentExecution) => currentExecution.id !== executionId,
			);
			triggerExecutionSessionChange(CHANGE_ACTION.DELETE);
		}

		function addToCurrentExecutions(executions: ExecutionSummary[]) {
			const currentExecutionIds = new Set(currentWorkflowExecutions.value.map(({ id }) => id));
			const matchingExecutions = executions.filter((execution) => {
				if (execution.workflowId !== workflowId || currentExecutionIds.has(execution.id))
					return false;

				currentExecutionIds.add(execution.id);
				return true;
			});

			if (matchingExecutions.length === 0) return;

			currentWorkflowExecutions.value.push(...matchingExecutions);
			triggerExecutionSessionChange(CHANGE_ACTION.UPDATE);
		}

		function resetChatMessages() {
			chatMessages.value = [];
			triggerExecutionSessionChange(CHANGE_ACTION.DELETE);
		}

		function appendChatMessage(message: string) {
			chatMessages.value.push(message);
			triggerExecutionSessionChange(CHANGE_ACTION.UPDATE);
		}

		function setSelectedTriggerNodeName(nodeName: string | undefined) {
			selectedTriggerNodeName.value = nodeName;
			triggerExecutionSessionChange(CHANGE_ACTION.UPDATE);
		}

		function renamePendingExecutionDataNode(oldName: string, newName: string) {
			if (!pendingExecution.value) return;

			const runData = pendingExecution.value.data?.resultData.runData;
			if (runData?.[oldName]) {
				runData[newName] = runData[oldName];
				delete runData[oldName];
			}

			pendingExecution.value.workflowData.nodes.forEach((node) => {
				if (node.name === oldName) node.name = newName;
			});
		}

		function renameExecutionSessionNode(oldName: string, newName: string) {
			renamePendingExecutionDataNode(oldName, newName);
			if (chatPartialExecutionDestinationNode.value === oldName) {
				chatPartialExecutionDestinationNode.value = newName;
			}
			if (selectedTriggerNodeName.value === oldName) {
				selectedTriggerNodeName.value = newName;
			}
			triggerExecutionSessionChange(CHANGE_ACTION.UPDATE);
		}

		function resetExecutionSession() {
			activeExecutionId.value = undefined;
			displayedExecutionId.value = undefined;
			previousExecutionId.value = undefined;
			pendingExecution.value = null;
			executionWaitingForWebhook.value = false;
			isInDebugMode.value = false;
			chatMessages.value = [];
			chatPartialExecutionDestinationNode.value = null;
			selectedTriggerNodeName.value = undefined;
			currentWorkflowExecutions.value = [];
			lastSuccessfulExecutionId.value = null;
			triggerExecutionSessionChange(CHANGE_ACTION.DELETE);
		}

		return {
			activeExecutionId,
			displayedExecutionId,
			previousExecutionId,
			executionWaitingForWebhook,
			isInDebugMode,
			chatMessages,
			chatPartialExecutionDestinationNode,
			selectedTriggerNodeName,
			currentWorkflowExecutions,
			lastSuccessfulExecutionId,
			pendingExecution,
			activeExecution,
			activeExecutionRunData,
			activeExecutionStartedData,
			activeExecutionPairedItemMappings,
			activeExecutionResultDataLastUpdate,
			lastSuccessfulExecution,
			isWorkflowRunning,
			executionTriggerNodeName,
			getAllLoadedFinishedExecutions,
			getPastChatMessages,
			setActiveExecutionId,
			setPendingExecution,
			setPendingExecutionRunData,
			getActiveExecutionDataStore,
			getActiveExecutionRunDataByNodeName,
			clearActiveNodeExecutionData,
			promotePendingExecution,
			setExecutionWaitingForWebhook,
			setDebugMode,
			setChatPartialExecutionDestinationNode,
			setLastSuccessfulExecution,
			setLastSuccessfulExecutionId,
			setCurrentWorkflowExecutions,
			clearCurrentWorkflowExecutions,
			deleteExecution,
			addToCurrentExecutions,
			resetChatMessages,
			appendChatMessage,
			setSelectedTriggerNodeName,
			renameExecutionSessionNode,
			resetExecutionSession,
			onExecutionSessionChange: onExecutionSessionChange.on,
		};
	})();
}

export function disposeWorkflowExecutionSessionStore(workflowId: WorkflowExecutionSessionId) {
	const pinia = getActivePinia() as PiniaInternal;
	if (!pinia) return;

	const storeId = getWorkflowExecutionSessionStoreId(workflowId);
	if (pinia.state.value[storeId]) {
		const store = pinia._s.get(storeId);
		if (store) {
			store.$dispose();
		}

		delete pinia.state.value[storeId];
	}
}
