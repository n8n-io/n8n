import type { IExecutionResponse } from '@/features/execution/executions/executions.types';
import { IN_PROGRESS_EXECUTION_ID } from '@/app/constants';
import { WorkflowExecutionSessionStoreKey } from '@/app/constants/injectionKeys';
import { STORES } from '@n8n/stores';
import type { PushPayload } from '@n8n/api-types';
import type { NodeExecuteBefore } from '@n8n/api-types/push/execution';
import { defineStore, getActivePinia, type StoreGeneric } from 'pinia';
import type { ExecutionSummary, IRunExecutionData } from 'n8n-workflow';
import { computed, inject, ref } from 'vue';
import { createExecutionDataId, useExecutionDataStore } from './executionData.store';

export type WorkflowExecutionSessionId = string;

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
		const currentWorkflowExecutions = ref<ExecutionSummary[]>([]);
		const activeExecutionId = ref<string | null | undefined>();
		const previousExecutionId = ref<string | null | undefined>();
		const executionWaitingForWebhook = ref(false);
		const isInDebugMode = ref(false);
		const chatMessages = ref<string[]>([]);
		const chatPartialExecutionDestinationNode = ref<string | null>(null);
		const selectedTriggerNodeName = ref<string>();
		const lastSuccessfulExecutionId = ref<string | null>(null);

		const activeExecutionDataStore = computed(() => {
			if (activeExecutionId.value === undefined) return null;
			return useExecutionDataStore(
				createExecutionDataId(activeExecutionId.value ?? IN_PROGRESS_EXECUTION_ID),
			);
		});

		const currentExecution = computed(() => activeExecutionDataStore.value?.execution ?? null);
		const currentExecutionRunData = computed(
			() => activeExecutionDataStore.value?.executionRunData ?? null,
		);
		const executedNode = computed(() => activeExecutionDataStore.value?.executedNode);
		const currentExecutionStartedData = computed(
			() => activeExecutionDataStore.value?.executionStartedData,
		);
		const currentExecutionPairedItemMappings = computed(
			() => activeExecutionDataStore.value?.executionPairedItemMappings ?? {},
		);
		const currentExecutionResultDataLastUpdate = computed(
			() => activeExecutionDataStore.value?.executionResultDataLastUpdate,
		);
		const lastSuccessfulExecution = computed(() => {
			const executionId = lastSuccessfulExecutionId.value;
			return executionId
				? useExecutionDataStore(createExecutionDataId(executionId)).execution
				: null;
		});

		const isWorkflowRunning = computed(() => {
			if (activeExecutionId.value === null) return true;
			if (activeExecutionId.value && currentExecution.value) {
				return (
					['waiting', 'running'].includes(currentExecution.value.status) &&
					!currentExecution.value.finished
				);
			}
			return false;
		});

		const getAllLoadedFinishedExecutions = computed(() =>
			currentWorkflowExecutions.value.filter(
				(ex) => ex.finished === true || ex.stoppedAt !== undefined,
			),
		);

		const getPastChatMessages = computed(() => chatMessages.value);

		const workflowExecutionTriggerNodeName = computed(() => {
			if (!isWorkflowRunning.value) return undefined;
			if (currentExecution.value?.triggerNode) return currentExecution.value.triggerNode;
			return Object.keys(currentExecutionRunData.value ?? {})[0];
		});

		function setActiveExecutionId(id: string | null | undefined) {
			if (id) previousExecutionId.value = activeExecutionId.value;
			activeExecutionId.value = id;
		}

		function setExecutionWaitingForWebhook(value: boolean) {
			executionWaitingForWebhook.value = value;
		}

		function setDebugMode(value: boolean) {
			isInDebugMode.value = value;
		}

		function setChatPartialExecutionDestinationNode(value: string | null) {
			chatPartialExecutionDestinationNode.value = value;
		}

		function setSelectedTriggerNodeName(value: string | undefined) {
			selectedTriggerNodeName.value = value;
		}

		function setLastSuccessfulExecution(execution: IExecutionResponse | null) {
			lastSuccessfulExecutionId.value = execution?.id ?? null;
			if (execution?.id) {
				useExecutionDataStore(createExecutionDataId(execution.id)).setExecution(execution);
			}
		}

		function getWritableActiveExecutionDataStore(executionId?: string | null) {
			return useExecutionDataStore(
				createExecutionDataId(executionId ?? activeExecutionId.value ?? IN_PROGRESS_EXECUTION_ID),
			);
		}

		function setCurrentExecution(execution: IExecutionResponse | null) {
			getWritableActiveExecutionDataStore(execution?.id).setExecution(execution);
		}

		function setCurrentExecutionRunData(runExecutionData: IRunExecutionData) {
			getWritableActiveExecutionDataStore().setExecutionRunData(runExecutionData);
		}

		function addNodeExecutionStartedData(data: NodeExecuteBefore['data']): void {
			getWritableActiveExecutionDataStore(data.executionId).addNodeExecutionStartedData(data);
		}

		function clearExecutionStartedData(): void {
			getWritableActiveExecutionDataStore().clearExecutionStartedData();
		}

		function getExecutionRunDataByNodeName(nodeName: string) {
			return activeExecutionDataStore.value?.getExecutionRunDataByNodeName(nodeName) ?? null;
		}

		function updateNodeExecutionStatus(pushData: PushPayload<'nodeExecuteAfterData'>): void {
			getWritableActiveExecutionDataStore().updateNodeExecutionStatus(pushData);
		}

		function updateNodeExecutionRunData(pushData: PushPayload<'nodeExecuteAfterData'>): void {
			getWritableActiveExecutionDataStore().updateNodeExecutionRunData(pushData);
		}

		function clearNodeExecutionData(nodeName: string): void {
			getWritableActiveExecutionDataStore().clearNodeExecutionData(nodeName);
		}

		function renameExecutionDataNode(oldName: string, newName: string): void {
			activeExecutionDataStore.value?.renameExecutionDataNode(oldName, newName);
		}

		function setCurrentWorkflowExecutions(executions: ExecutionSummary[]) {
			currentWorkflowExecutions.value = executions.filter(
				(execution) => execution.workflowId === workflowId,
			);
		}

		function addToCurrentExecutions(executions: ExecutionSummary[]) {
			executions.forEach((execution) => {
				const exists = currentWorkflowExecutions.value.find((ex) => ex.id === execution.id);
				if (!exists && execution.workflowId === workflowId)
					currentWorkflowExecutions.value.push(execution);
			});
		}

		function deleteExecution(execution: ExecutionSummary) {
			currentWorkflowExecutions.value.splice(currentWorkflowExecutions.value.indexOf(execution), 1);
		}

		function resetChatMessages(): void {
			chatMessages.value = [];
		}

		function appendChatMessage(message: string): void {
			chatMessages.value.push(message);
		}

		function renameExecutionSessionNode(oldName: string, newName: string): void {
			if (selectedTriggerNodeName.value === oldName) selectedTriggerNodeName.value = newName;
			if (chatPartialExecutionDestinationNode.value === oldName) {
				chatPartialExecutionDestinationNode.value = newName;
			}
		}

		function resetExecutionSession(): void {
			currentWorkflowExecutions.value = [];
			activeExecutionId.value = undefined;
			previousExecutionId.value = undefined;
			executionWaitingForWebhook.value = false;
			isInDebugMode.value = false;
			chatMessages.value = [];
			chatPartialExecutionDestinationNode.value = null;
			selectedTriggerNodeName.value = undefined;
			lastSuccessfulExecutionId.value = null;
		}

		return {
			workflowId,
			currentWorkflowExecutions,
			activeExecutionId: computed(() => activeExecutionId.value),
			previousExecutionId: computed(() => previousExecutionId.value),
			executionWaitingForWebhook,
			isInDebugMode,
			chatMessages,
			chatPartialExecutionDestinationNode,
			selectedTriggerNodeName: computed(() => selectedTriggerNodeName.value),
			lastSuccessfulExecutionId,
			lastSuccessfulExecution,
			currentExecution,
			currentExecutionRunData,
			executedNode,
			currentExecutionStartedData,
			currentExecutionPairedItemMappings,
			currentExecutionResultDataLastUpdate,
			isWorkflowRunning,
			getAllLoadedFinishedExecutions,
			getPastChatMessages,
			workflowExecutionTriggerNodeName,
			setActiveExecutionId,
			setExecutionWaitingForWebhook,
			setDebugMode,
			setChatPartialExecutionDestinationNode,
			setSelectedTriggerNodeName,
			setLastSuccessfulExecution,
			setCurrentExecution,
			setCurrentExecutionRunData,
			addNodeExecutionStartedData,
			clearExecutionStartedData,
			getExecutionRunDataByNodeName,
			updateNodeExecutionStatus,
			updateNodeExecutionRunData,
			clearNodeExecutionData,
			renameExecutionDataNode,
			setCurrentWorkflowExecutions,
			addToCurrentExecutions,
			deleteExecution,
			resetChatMessages,
			appendChatMessage,
			renameExecutionSessionNode,
			resetExecutionSession,
		};
	})();
}

export function injectWorkflowExecutionSessionStore() {
	return inject(WorkflowExecutionSessionStoreKey, null);
}

export function disposeWorkflowExecutionSessionStore(workflowId: WorkflowExecutionSessionId) {
	const pinia = getActivePinia() as PiniaInternal;
	if (!pinia) return;

	const storeId = getWorkflowExecutionSessionStoreId(workflowId);
	if (pinia.state.value[storeId]) {
		pinia._s.get(storeId)?.$dispose();
		delete pinia.state.value[storeId];
	}
}
