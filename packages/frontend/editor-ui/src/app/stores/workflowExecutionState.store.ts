import { defineStore, getActivePinia } from 'pinia';
import { STORES } from '@n8n/stores';
import { computed, inject, readonly, ref } from 'vue';
import { createEventHook } from '@vueuse/core';
import type { ExecutionSummary } from 'n8n-workflow';
import type { IExecutionResponse } from '@/features/execution/executions/executions.types';
import { WorkflowExecutionStateStoreKey } from '@/app/constants/injectionKeys';
import { IN_PROGRESS_EXECUTION_ID } from '@/app/constants/placeholders';
import {
	createExecutionDataId,
	disposeExecutionDataStore,
	useExecutionDataStore,
} from './executionData.store';
import { CHANGE_ACTION } from './workflowDocument/types';
import type { ChangeAction, ChangeEvent } from './workflowDocument/types';

export type WorkflowExecutionStateId = string;

export type WorkflowExecutionStateChangePayload = {
	workflowId: WorkflowExecutionStateId;
	field: WorkflowExecutionStateField;
};

/** Discriminator for the field that changed (for fine-grained subscribers). */
export type WorkflowExecutionStateField =
	| 'activeExecutionId'
	| 'displayedExecutionId'
	| 'pendingExecution'
	| 'executionWaitingForWebhook'
	| 'isInDebugMode'
	| 'chatMessages'
	| 'chatPartialExecutionDestinationNode'
	| 'selectedTriggerNodeName'
	| 'currentWorkflowExecutions'
	| 'lastSuccessfulExecutionId'
	| 'state';

export type WorkflowExecutionStateChangeEvent = ChangeEvent<WorkflowExecutionStateChangePayload>;

export function createWorkflowExecutionStateId(workflowId: string): WorkflowExecutionStateId {
	return workflowId;
}

/**
 * Gets the Pinia store id for a workflow-execution-state store.
 */
export function getWorkflowExecutionStateStoreId(id: WorkflowExecutionStateId) {
	return `${STORES.WORKFLOW_EXECUTION_STATES}/${id}`;
}

/**
 * Creates a workflow-execution-state store keyed by workflow id.
 *
 * Owns per-workflow execution UI state — active/displayed/previous
 * execution ids, the pending-execution scaffold, chat, debug, webhook wait,
 * trigger selection, current executions list, and last-successful-execution
 * reference. Reads route through `useExecutionDataStore` for execution payloads
 * (or fall back to `pendingExecution` while `activeExecutionId === null`).
 */
export function useWorkflowExecutionStateStore(id: WorkflowExecutionStateId) {
	return defineStore(getWorkflowExecutionStateStoreId(id), () => {
		const workflowId = id;

		// --- State ---

		/**
		 * Tri-state semantics:
		 *   undefined -> no active execution being tracked
		 *   null      -> execution started but backend id not yet known
		 *   string    -> active backend execution id
		 */
		const activeExecutionId = ref<string | null | undefined>();
		const displayedExecutionId = ref<string | null | undefined>();
		const previousExecutionId = ref<string | null | undefined>();
		/**
		 * Placeholder execution payload while `activeExecutionId === null`.
		 * Used by chat hub / manual run scaffolding before the backend assigns
		 * an execution id. `promotePendingExecution(executionId)` migrates this
		 * payload into a real execution-data store keyed by the new id.
		 */
		const pendingExecution = ref<IExecutionResponse | null>(null);
		const executionWaitingForWebhook = ref(false);
		const isInDebugMode = ref(false);
		const chatMessages = ref<string[]>([]);
		const chatPartialExecutionDestinationNode = ref<string | null>(null);
		const selectedTriggerNodeName = ref<string | undefined>();
		const currentWorkflowExecutions = ref<ExecutionSummary[]>([]);
		const lastSuccessfulExecutionId = ref<string | null>(null);
		/**
		 * Every execution id ever bound to this workflow's state. Used at
		 * `resetExecutionState` time to dispose all per-execution data stores
		 * — including ones rolled out of the `previousExecutionId` slot, which
		 * the slot-only collection would otherwise miss.
		 */
		const trackedExecutionIds = ref<Set<string>>(new Set());

		const onWorkflowExecutionStateChange = createEventHook<WorkflowExecutionStateChangeEvent>();

		function fireChange(action: ChangeAction, field: WorkflowExecutionStateField) {
			void onWorkflowExecutionStateChange.trigger({
				action,
				payload: { workflowId, field },
			});
		}

		/**
		 * Records an execution id as bound to this workflow so its
		 * per-execution data store gets disposed on `resetExecutionState`.
		 * Safe to call repeatedly with the same id; ignores `null`/`undefined`
		 * and the IN_PROGRESS sentinel (the sentinel is disposed unconditionally).
		 */
		function trackExecutionId(executionId: string | null | undefined) {
			if (
				typeof executionId === 'string' &&
				executionId.length > 0 &&
				executionId !== IN_PROGRESS_EXECUTION_ID
			) {
				trackedExecutionIds.value.add(executionId);
			}
		}

		// --- Read API ---

		/**
		 * Returns the execution payload to display.
		 *  - `activeExecutionId === null`  -> `pendingExecution` (scaffold)
		 *  - `activeExecutionId === string` -> the executionData store keyed by that id
		 *  - `activeExecutionId === undefined` and `displayedExecutionId === string`
		 *    -> the displayed executionData store (preserved after active is cleared)
		 *  - otherwise null
		 */
		const activeExecution = computed(() => {
			if (activeExecutionId.value === null) return pendingExecution.value;
			if (typeof activeExecutionId.value === 'string') {
				return useExecutionDataStore(createExecutionDataId(activeExecutionId.value)).execution;
			}
			if (typeof displayedExecutionId.value === 'string') {
				return useExecutionDataStore(createExecutionDataId(displayedExecutionId.value)).execution;
			}
			return null;
		});

		const activeExecutionRunData = computed(
			() => activeExecution.value?.data?.resultData?.runData ?? null,
		);

		const activeExecutionStartedData = computed(() => {
			if (typeof activeExecutionId.value !== 'string') return undefined;
			return useExecutionDataStore(createExecutionDataId(activeExecutionId.value))
				.executionStartedData;
		});

		const activeExecutionPairedItemMappings = computed(() => {
			if (typeof activeExecutionId.value !== 'string') return {};
			return useExecutionDataStore(createExecutionDataId(activeExecutionId.value))
				.executionPairedItemMappings;
		});

		const activeExecutionResultDataLastUpdate = computed(() => {
			if (typeof activeExecutionId.value !== 'string') return undefined;
			return useExecutionDataStore(createExecutionDataId(activeExecutionId.value))
				.executionResultDataLastUpdate;
		});

		function getActiveExecutionRunDataByNodeName(nodeName: string) {
			const runData = activeExecutionRunData.value;
			if (runData === null) return null;
			if (!runData.hasOwnProperty(nodeName)) return null;
			return runData[nodeName];
		}

		const lastSuccessfulExecution = computed(() => {
			const lid = lastSuccessfulExecutionId.value;
			if (!lid) return null;
			return useExecutionDataStore(createExecutionDataId(lid)).execution;
		});

		const isWorkflowRunning = computed(() => {
			if (activeExecutionId.value === null) return true;
			if (activeExecutionId.value && activeExecution.value) {
				if (
					['waiting', 'running'].includes(activeExecution.value.status) &&
					!activeExecution.value.finished
				) {
					return true;
				}
			}
			return false;
		});

		/**
		 * Resolves the trigger node name driving the active execution.
		 * Falls back to scanning runData keys for partial executions.
		 */
		function resolveExecutionTriggerNodeName(triggerNodeNames: string[]): string | undefined {
			if (!isWorkflowRunning.value) return undefined;
			if (activeExecution.value?.triggerNode) return activeExecution.value.triggerNode;
			return Object.keys(activeExecution.value?.data?.resultData.runData ?? {}).find((name) =>
				triggerNodeNames.includes(name),
			);
		}

		const getAllLoadedFinishedExecutions = computed(() =>
			currentWorkflowExecutions.value.filter(
				(ex) => ex.finished === true || ex.stoppedAt !== undefined,
			),
		);

		const getPastChatMessages = computed(() => chatMessages.value);

		// --- Write API ---

		function setActiveExecutionId(value: string | null | undefined) {
			// When transitioning to a real execution id while a pending scaffold
			// is staged (e.g. REST response arrives before executionStarted push),
			// migrate the scaffold into the id-keyed executionData store so the
			// executedNode/runData survive the id transition. Mirrors master's
			// "data follows id" behavior when execution data was a single ref.
			if (typeof value === 'string' && pendingExecution.value !== null) {
				promotePendingExecution(value);
				return;
			}
			trackExecutionId(value);
			if (value) {
				previousExecutionId.value = activeExecutionId.value;
				displayedExecutionId.value = value;
			}
			activeExecutionId.value = value;
			fireChange(
				value === undefined ? CHANGE_ACTION.DELETE : CHANGE_ACTION.UPDATE,
				'activeExecutionId',
			);
		}

		function setDisplayedExecutionId(value: string | null | undefined) {
			trackExecutionId(value);
			displayedExecutionId.value = value;
			fireChange(
				value === undefined ? CHANGE_ACTION.DELETE : CHANGE_ACTION.UPDATE,
				'displayedExecutionId',
			);
		}

		function setPendingExecution(value: IExecutionResponse | null) {
			if (value?.id) trackExecutionId(value.id);
			pendingExecution.value = value;
			fireChange(value === null ? CHANGE_ACTION.DELETE : CHANGE_ACTION.UPDATE, 'pendingExecution');
		}

		function setPendingExecutionRunData(runData: IExecutionResponse['data']) {
			if (!pendingExecution.value) return;
			pendingExecution.value = { ...pendingExecution.value, data: runData };
			fireChange(CHANGE_ACTION.UPDATE, 'pendingExecution');
		}

		/**
		 * Mirrors stop metadata (status/startedAt/stoppedAt) onto the pending-execution
		 * scaffold so the UI sees the canceled state when stop is requested before the
		 * backend assigns a real id. No-op when there is no pending scaffold.
		 */
		function applyStopDataToPendingExecution(stopData: {
			status: IExecutionResponse['status'];
			startedAt: IExecutionResponse['startedAt'];
			stoppedAt: IExecutionResponse['stoppedAt'];
		}) {
			if (!pendingExecution.value) return;
			pendingExecution.value = {
				...pendingExecution.value,
				status: stopData.status,
				startedAt: stopData.startedAt,
				stoppedAt: stopData.stoppedAt,
			};
			fireChange(CHANGE_ACTION.UPDATE, 'pendingExecution');
		}

		/**
		 * Promotes the pending-execution scaffold into a backend-keyed
		 * executionData store, then sets `activeExecutionId` to the new id.
		 */
		function promotePendingExecution(executionId: string) {
			const scaffold = pendingExecution.value;
			pendingExecution.value = null;
			const promoted: IExecutionResponse = scaffold
				? { ...scaffold, id: executionId }
				: ({ id: executionId } as IExecutionResponse);
			trackExecutionId(executionId);
			useExecutionDataStore(createExecutionDataId(executionId)).setExecution(promoted);
			setActiveExecutionId(executionId);
			fireChange(CHANGE_ACTION.UPDATE, 'pendingExecution');
		}

		function clearActiveNodeExecutionData(nodeName: string) {
			if (typeof activeExecutionId.value !== 'string') return;
			useExecutionDataStore(createExecutionDataId(activeExecutionId.value)).clearNodeExecutionData(
				nodeName,
			);
		}

		function setExecutionWaitingForWebhook(value: boolean) {
			executionWaitingForWebhook.value = value;
			fireChange(CHANGE_ACTION.UPDATE, 'executionWaitingForWebhook');
		}

		function setIsInDebugMode(value: boolean) {
			isInDebugMode.value = value;
			fireChange(CHANGE_ACTION.UPDATE, 'isInDebugMode');
		}

		function setChatPartialExecutionDestinationNode(value: string | null) {
			chatPartialExecutionDestinationNode.value = value;
			fireChange(
				value === null ? CHANGE_ACTION.DELETE : CHANGE_ACTION.UPDATE,
				'chatPartialExecutionDestinationNode',
			);
		}

		/**
		 * Stores the last-successful-execution by registering its payload in an
		 * executionData store and tracking only the id here. Disposes the
		 * previously-tracked store entry to avoid leaking data across runs.
		 */
		function setLastSuccessfulExecution(execution: IExecutionResponse | null) {
			const previousId = lastSuccessfulExecutionId.value;
			if (
				previousId &&
				previousId !== execution?.id &&
				previousId !== activeExecutionId.value &&
				previousId !== displayedExecutionId.value
			) {
				disposeExecutionDataStore(useExecutionDataStore(createExecutionDataId(previousId)));
				trackedExecutionIds.value.delete(previousId);
			}
			if (execution === null) {
				lastSuccessfulExecutionId.value = null;
				fireChange(CHANGE_ACTION.DELETE, 'lastSuccessfulExecutionId');
				return;
			}
			trackExecutionId(execution.id);
			useExecutionDataStore(createExecutionDataId(execution.id)).setExecution(execution);
			lastSuccessfulExecutionId.value = execution.id;
			fireChange(CHANGE_ACTION.UPDATE, 'lastSuccessfulExecutionId');
		}

		function setLastSuccessfulExecutionId(value: string | null) {
			trackExecutionId(value);
			lastSuccessfulExecutionId.value = value;
			fireChange(
				value === null ? CHANGE_ACTION.DELETE : CHANGE_ACTION.UPDATE,
				'lastSuccessfulExecutionId',
			);
		}

		function clearDisplayedExecution() {
			displayedExecutionId.value = undefined;
			fireChange(CHANGE_ACTION.DELETE, 'displayedExecutionId');
		}

		function clearAllExecutions() {
			currentWorkflowExecutions.value = [];
			fireChange(CHANGE_ACTION.DELETE, 'currentWorkflowExecutions');
		}

		function setCurrentWorkflowExecutions(executions: ExecutionSummary[]) {
			currentWorkflowExecutions.value = executions;
			fireChange(CHANGE_ACTION.UPDATE, 'currentWorkflowExecutions');
		}

		function clearCurrentWorkflowExecutions() {
			setCurrentWorkflowExecutions([]);
		}

		function deleteExecution(executionOrId: ExecutionSummary | string) {
			const targetId = typeof executionOrId === 'string' ? executionOrId : executionOrId.id;
			const idx = currentWorkflowExecutions.value.findIndex((e) => e.id === targetId);
			if (idx === -1) return;
			currentWorkflowExecutions.value.splice(idx, 1);
			fireChange(CHANGE_ACTION.DELETE, 'currentWorkflowExecutions');
		}

		function addToCurrentExecutions(executions: ExecutionSummary[]) {
			let added = false;
			executions.forEach((execution) => {
				const exists = currentWorkflowExecutions.value.find((ex) => ex.id === execution.id);
				if (!exists && execution.workflowId === workflowId) {
					currentWorkflowExecutions.value.push(execution);
					added = true;
				}
			});
			if (added) fireChange(CHANGE_ACTION.ADD, 'currentWorkflowExecutions');
		}

		function resetChatMessages() {
			chatMessages.value = [];
			fireChange(CHANGE_ACTION.DELETE, 'chatMessages');
		}

		function appendChatMessage(message: string) {
			chatMessages.value.push(message);
			fireChange(CHANGE_ACTION.ADD, 'chatMessages');
		}

		function setSelectedTriggerNodeName(value: string | undefined) {
			selectedTriggerNodeName.value = value;
			fireChange(
				value === undefined ? CHANGE_ACTION.DELETE : CHANGE_ACTION.UPDATE,
				'selectedTriggerNodeName',
			);
		}

		/**
		 * Renames state references to a node. Execution-data references
		 * (executedNode, runData keys, etc.) live in the executionData store and
		 * are renamed via its own `renameExecutionDataNode` method.
		 */
		function renameExecutionStateNode(oldName: string, newName: string) {
			let touched = false;
			if (selectedTriggerNodeName.value === oldName) {
				selectedTriggerNodeName.value = newName;
				touched = true;
			}
			if (chatPartialExecutionDestinationNode.value === oldName) {
				chatPartialExecutionDestinationNode.value = newName;
				touched = true;
			}
			if (touched) fireChange(CHANGE_ACTION.UPDATE, 'state');
		}

		function resetExecutionState() {
			// Dispose every per-execution data store ever bound to this workflow,
			// plus the IN_PROGRESS placeholder (sentinel reused across runs).
			for (const id of trackedExecutionIds.value) {
				disposeExecutionDataStore(useExecutionDataStore(createExecutionDataId(id)));
			}
			trackedExecutionIds.value.clear();
			disposeExecutionDataStore(
				useExecutionDataStore(createExecutionDataId(IN_PROGRESS_EXECUTION_ID)),
			);

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
			fireChange(CHANGE_ACTION.DELETE, 'state');
		}

		return {
			workflowId,
			// Read API
			activeExecutionId: readonly(activeExecutionId),
			displayedExecutionId: readonly(displayedExecutionId),
			previousExecutionId: readonly(previousExecutionId),
			pendingExecution: readonly(pendingExecution),
			executionWaitingForWebhook: readonly(executionWaitingForWebhook),
			isInDebugMode: readonly(isInDebugMode),
			chatMessages: readonly(chatMessages),
			chatPartialExecutionDestinationNode: readonly(chatPartialExecutionDestinationNode),
			selectedTriggerNodeName: readonly(selectedTriggerNodeName),
			currentWorkflowExecutions: readonly(currentWorkflowExecutions),
			lastSuccessfulExecutionId: readonly(lastSuccessfulExecutionId),
			activeExecution,
			activeExecutionRunData,
			activeExecutionStartedData,
			activeExecutionPairedItemMappings,
			activeExecutionResultDataLastUpdate,
			lastSuccessfulExecution,
			isWorkflowRunning,
			getAllLoadedFinishedExecutions,
			getPastChatMessages,
			getActiveExecutionRunDataByNodeName,
			resolveExecutionTriggerNodeName,
			// Write API
			trackExecutionId,
			setActiveExecutionId,
			setDisplayedExecutionId,
			setPendingExecution,
			setPendingExecutionRunData,
			applyStopDataToPendingExecution,
			promotePendingExecution,
			clearActiveNodeExecutionData,
			setExecutionWaitingForWebhook,
			setIsInDebugMode,
			setChatPartialExecutionDestinationNode,
			setLastSuccessfulExecution,
			setLastSuccessfulExecutionId,
			clearDisplayedExecution,
			clearAllExecutions,
			setCurrentWorkflowExecutions,
			clearCurrentWorkflowExecutions,
			deleteExecution,
			addToCurrentExecutions,
			resetChatMessages,
			appendChatMessage,
			setSelectedTriggerNodeName,
			renameExecutionStateNode,
			resetExecutionState,
			// Events
			onWorkflowExecutionStateChange: onWorkflowExecutionStateChange.on,
		};
	})();
}

/**
 * Disposes a workflow-execution-state store. Call when navigating between
 * workflows. Mirrors `disposeWorkflowDocumentStore`.
 */
export function disposeWorkflowExecutionStateStore(
	store: ReturnType<typeof useWorkflowExecutionStateStore>,
) {
	const pinia = getActivePinia();
	store.$dispose();

	if (pinia) {
		delete pinia.state.value[store.$id];
	}
}

/**
 * Injects the active workflow-execution-state store from the component tree.
 * Returns null when not within a context that has provided the store.
 */
export function injectWorkflowExecutionStateStore() {
	return inject(WorkflowExecutionStateStoreKey, null);
}
