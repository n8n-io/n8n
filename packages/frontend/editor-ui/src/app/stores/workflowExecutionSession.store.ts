import { defineStore, getActivePinia, type StoreGeneric } from 'pinia';
import { computed, ref, watch } from 'vue';
import { createEventHook } from '@vueuse/core';
import { STORES } from '@n8n/stores';
import type { IExecutionResponse } from '@/features/execution/executions/executions.types';
import { findTriggerNodeToAutoSelect } from '@/features/execution/executions/executions.utils';
import { isChatNode } from '@/app/utils/aiUtils';
import type { ExecutionSummary } from 'n8n-workflow';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import { CHANGE_ACTION } from './workflowDocument/types';
import type { ChangeAction, ChangeEvent } from './workflowDocument/types';
import {
	getActiveExecutionDataStore,
	useExecutionDataStore,
} from '@/app/stores/executionData.store';

export type WorkflowExecutionSessionId = string;

type WorkflowExecutionSessionField =
	| 'activeExecutionId'
	| 'executionWaitingForWebhook'
	| 'isInDebugMode'
	| 'chatMessages'
	| 'chatPartialExecutionDestinationNode'
	| 'selectedTriggerNodeName'
	| 'lastSuccessfulExecutionId'
	| 'currentWorkflowExecutions'
	| 'executionSessionState';

export type WorkflowExecutionSessionPayload = {
	field: WorkflowExecutionSessionField;
};

export type WorkflowExecutionSessionChangeEvent = ChangeEvent<WorkflowExecutionSessionPayload>;

type PiniaInternal = ReturnType<typeof getActivePinia> & {
	_s: Map<string, StoreGeneric>;
};

const WORKFLOW_EXECUTION_SESSION_STORE_PREFIX =
	'WORKFLOW_EXECUTION_SESSIONS' in STORES
		? STORES.WORKFLOW_EXECUTION_SESSIONS
		: 'workflowExecutionSessions';

export function createWorkflowExecutionSessionId(workflowId: string): WorkflowExecutionSessionId {
	return workflowId;
}

export function getWorkflowExecutionSessionStoreId(workflowId: WorkflowExecutionSessionId) {
	return `${WORKFLOW_EXECUTION_SESSION_STORE_PREFIX}/${workflowId}`;
}

export function useWorkflowExecutionSessionStore(workflowId: WorkflowExecutionSessionId) {
	return defineStore(getWorkflowExecutionSessionStoreId(workflowId), () => {
		const workflowsStore = useWorkflowsStore();
		const nodeTypesStore = useNodeTypesStore();

		const currentWorkflowExecutions = ref<ExecutionSummary[]>([]);
		const executionWaitingForWebhook = ref(false);
		const isInDebugMode = ref(false);
		const chatMessages = ref<string[]>([]);
		const chatPartialExecutionDestinationNode = ref<string | null>(null);
		const selectedTriggerNodeName = ref<string>();
		const activeExecutionId = ref<string | null | undefined>();
		const previousExecutionId = ref<string | null | undefined>();
		const lastSuccessfulExecutionId = ref<string | null>(null);

		const onExecutionSessionChange = createEventHook<WorkflowExecutionSessionChangeEvent>();

		function triggerChange(
			field: WorkflowExecutionSessionField,
			action: ChangeAction = CHANGE_ACTION.UPDATE,
		) {
			void onExecutionSessionChange.trigger({ action, payload: { field } });
		}

		const activeExecution = computed(() => {
			return (
				getActiveExecutionDataStore({ activeExecutionId: activeExecutionId.value })?.execution ??
				null
			);
		});

		const isWorkflowRunning = computed(() => {
			if (activeExecutionId.value === null) {
				return true;
			}

			const execution = activeExecution.value;
			if (activeExecutionId.value && execution) {
				if (['waiting', 'running'].includes(execution.status) && !execution.finished) {
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

			const execution = activeExecution.value;
			if (execution?.triggerNode) {
				return execution.triggerNode;
			}

			return Object.keys(execution?.data?.resultData.runData ?? {}).find((name) =>
				workflowsStore.workflowTriggerNodes.some((node) => node.name === name),
			);
		});

		const selectableTriggerNodes = computed(() =>
			workflowsStore.workflowTriggerNodes.filter((node) => !node.disabled && !isChatNode(node)),
		);

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

		function applyLastSuccessfulExecutionId(
			executionId: string | null,
			action: ChangeAction = CHANGE_ACTION.UPDATE,
		) {
			lastSuccessfulExecutionId.value = executionId;
			triggerChange('lastSuccessfulExecutionId', action);
		}

		function applyCurrentWorkflowExecutions(
			executions: ExecutionSummary[],
			action: ChangeAction = CHANGE_ACTION.UPDATE,
		) {
			currentWorkflowExecutions.value = executions;
			triggerChange('currentWorkflowExecutions', action);
		}

		function applyExecutionSessionReset(action: ChangeAction = CHANGE_ACTION.DELETE) {
			currentWorkflowExecutions.value = [];
			executionWaitingForWebhook.value = false;
			isInDebugMode.value = false;
			chatMessages.value = [];
			chatPartialExecutionDestinationNode.value = null;
			selectedTriggerNodeName.value = undefined;
			activeExecutionId.value = undefined;
			previousExecutionId.value = undefined;
			lastSuccessfulExecutionId.value = null;
			triggerChange('executionSessionState', action);
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
			if (!execution) {
				applyLastSuccessfulExecutionId(null, CHANGE_ACTION.DELETE);
				return;
			}

			useExecutionDataStore(execution.id).setExecution(execution);
			applyLastSuccessfulExecutionId(execution.id);
		}

		function setLastSuccessfulExecutionId(executionId: string | null) {
			applyLastSuccessfulExecutionId(
				executionId,
				executionId === null ? CHANGE_ACTION.DELETE : CHANGE_ACTION.UPDATE,
			);
		}

		function setCurrentWorkflowExecutions(executions: ExecutionSummary[]) {
			applyCurrentWorkflowExecutions(executions);
		}

		function clearCurrentWorkflowExecutions() {
			applyCurrentWorkflowExecutions([], CHANGE_ACTION.DELETE);
		}

		function deleteExecution(execution: ExecutionSummary): void {
			applyCurrentWorkflowExecutions(
				currentWorkflowExecutions.value.filter(
					(currentExecution) => currentExecution !== execution,
				),
			);
		}

		function addToCurrentExecutions(executions: ExecutionSummary[]): void {
			const nextExecutions = [...currentWorkflowExecutions.value];

			executions.forEach((execution) => {
				const exists = nextExecutions.find(
					(currentExecution) => currentExecution.id === execution.id,
				);
				if (!exists && execution.workflowId === workflowId) {
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

		function renameExecutionSessionNode(oldName: string, newName: string): void {
			if (chatPartialExecutionDestinationNode.value === oldName) {
				applyChatPartialExecutionDestinationNode(newName);
			}

			if (selectedTriggerNodeName.value === oldName) {
				applySelectedTriggerNodeName(newName);
			}
		}

		function resetExecutionSession() {
			applyExecutionSessionReset();
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
						findTriggerNodeToAutoSelect(selectableTriggerNodes.value, (typeName, version) =>
							nodeTypesStore.getNodeType(typeName, version),
						)?.name,
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
			activeExecutionId,
			previousExecutionId,
			executionWaitingForWebhook,
			isInDebugMode,
			chatMessages,
			chatPartialExecutionDestinationNode,
			selectedTriggerNodeName,
			lastSuccessfulExecutionId,
			getAllLoadedFinishedExecutions,
			getPastChatMessages,
			isWorkflowRunning,
			executionTriggerNodeName,
			setActiveExecutionId,
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
