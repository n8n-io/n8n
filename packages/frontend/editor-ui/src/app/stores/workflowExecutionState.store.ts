import { defineStore, getActivePinia } from 'pinia';
import { STORES } from '@n8n/stores';
import { computed, readonly, ref, type ComputedRef, type ShallowRef } from 'vue';
import { createEventHook } from '@vueuse/core';
import type { ExecutionSummary } from 'n8n-workflow';
import type {
	IExecutionResponse,
	IExecutionsStopData,
} from '@/features/execution/executions/executions.types';
import { IN_PROGRESS_EXECUTION_ID } from '@/app/constants/placeholders';
import { injectWorkflowDocumentStore } from './workflowDocument.store';
import {
	createExecutionDataId,
	disposeExecutionDataStore,
	useExecutionDataStore,
} from './executionData.store';
import { CHANGE_ACTION } from './workflowDocument/types';
import type { ChangeAction, ChangeEvent } from './workflowDocument/types';

const EMPTY_EXECUTION_ISSUES_BY_NODE_NAME = new Map<string, ComputedRef<string[]>>();

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
	| 'executingNode'
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
		 * Per-workflow queue of currently executing node names. A node can
		 * appear multiple times — push handlers add on `nodeExecuteBefore`
		 * and remove on `nodeExecuteAfter`, and parallel sub-node runs can
		 * stack the same name. Used by the UI to show running spinners.
		 */
		const executingNode = ref<string[]>([]);
		/**
		 * Last node name added to the `executingNode` queue. Drives
		 * spinner animation timing — UI keeps the spinner visible for a
		 * minimum duration based on this signal.
		 */
		const lastAddedExecutingNode = ref<string | null>(null);
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

		/**
		 * Per-node-name execution issues map for the active or displayed
		 * execution. Mirrors the fallback chain in `activeExecution`
		 * (active id → displayed id → empty). Map identity changes when the
		 * active/displayed execution swaps; per-name `ComputedRef` entries
		 * inside each Map are owned by the per-execution data store and gate
		 * downstream propagation via `isEqual`.
		 */
		const activeExecutionIssuesByNodeName = computed(() => {
			if (typeof activeExecutionId.value === 'string') {
				return useExecutionDataStore(createExecutionDataId(activeExecutionId.value))
					.executionIssuesByNodeName;
			}
			if (typeof displayedExecutionId.value === 'string') {
				return useExecutionDataStore(createExecutionDataId(displayedExecutionId.value))
					.executionIssuesByNodeName;
			}
			return EMPTY_EXECUTION_ISSUES_BY_NODE_NAME;
		});

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

		// --- Executing-node queue ---

		function addExecutingNode(nodeName: string) {
			executingNode.value.push(nodeName);
			lastAddedExecutingNode.value = nodeName;
			fireChange(CHANGE_ACTION.ADD, 'executingNode');
		}

		function removeExecutingNode(nodeName: string) {
			const executionIndex = executingNode.value.indexOf(nodeName);
			if (executionIndex === -1) return;
			executingNode.value.splice(executionIndex, 1);
			fireChange(CHANGE_ACTION.DELETE, 'executingNode');
		}

		function isNodeExecuting(nodeName: string): boolean {
			return executingNode.value.includes(nodeName);
		}

		function clearNodeExecutionQueue() {
			if (executingNode.value.length === 0 && lastAddedExecutingNode.value === null) return;
			executingNode.value = [];
			lastAddedExecutingNode.value = null;
			fireChange(CHANGE_ACTION.DELETE, 'executingNode');
		}

		// --- Execution lifecycle (cross-store orchestration) ---

		/**
		 * Routes an execution payload to the correct location based on its id.
		 *  - `null`                       -> clears pending + displayed
		 *  - `IN_PROGRESS_EXECUTION_ID`   -> stages as pending scaffold + sets activeExecutionId(null) + writes to placeholder executionData store
		 *  - real id                      -> writes to the id-keyed executionData store, and (if no active id) sets displayedExecutionId for read fallback
		 *
		 * Replaces the legacy `useWorkflowState.setWorkflowExecutionData`.
		 */
		function loadExecution(execution: IExecutionResponse | null) {
			if (execution === null) {
				setPendingExecution(null);
				clearDisplayedExecution();
				return;
			}
			if (execution.id === IN_PROGRESS_EXECUTION_ID) {
				setPendingExecution(execution);
				setActiveExecutionId(null);
				useExecutionDataStore(createExecutionDataId(IN_PROGRESS_EXECUTION_ID)).setExecution(
					execution,
				);
				return;
			}
			trackExecutionId(execution.id);
			useExecutionDataStore(createExecutionDataId(execution.id)).setExecution(execution);
			// When an active execution id is already tracked, the read path resolves
			// via activeExecutionId — leave pending/displayed alone. Only when there
			// is no active id do we clear pending and surface this execution as the
			// displayed fallback so `activeExecution` resolves to it.
			if (typeof activeExecutionId.value !== 'string') {
				setPendingExecution(null);
				setActiveExecutionId(undefined);
				setDisplayedExecutionId(execution.id);
			}
		}

		/**
		 * Pure state mutation for "execution stopped." Clears active id, the
		 * executing-node queue, and the webhook-wait flag, then routes the stop
		 * payload to the appropriate executionData store based on the tri-state
		 * activeExecutionId. Caller-side side effects (document title, popup
		 * cleanup) stay with the caller — this method touches only store state.
		 *
		 * Replaces the state portion of legacy `useWorkflowState.markExecutionAsStopped`.
		 */
		function markExecutionAsStopped(stopData?: IExecutionsStopData) {
			const previousActiveId = activeExecutionId.value;

			setActiveExecutionId(undefined);
			clearNodeExecutionQueue();
			setExecutionWaitingForWebhook(false);

			if (typeof previousActiveId === 'string') {
				const executionDataStore = useExecutionDataStore(createExecutionDataId(previousActiveId));
				executionDataStore.clearExecutionStartedData();
				executionDataStore.markAsStopped(stopData);
				return;
			}

			if (previousActiveId === null) {
				const executionDataStore = useExecutionDataStore(
					createExecutionDataId(IN_PROGRESS_EXECUTION_ID),
				);
				executionDataStore.clearExecutionStartedData();
				executionDataStore.markAsStopped(stopData);
				if (stopData) applyStopDataToPendingExecution(stopData);
				return;
			}

			// previousActiveId === undefined: stop-race-with-finished case where active
			// was just cleared but the displayed execution still needs the stop applied.
			if (typeof displayedExecutionId.value === 'string') {
				const executionDataStore = useExecutionDataStore(
					createExecutionDataId(displayedExecutionId.value),
				);
				executionDataStore.clearExecutionStartedData();
				executionDataStore.markAsStopped(stopData);
			}
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
			executingNode.value = [];
			lastAddedExecutingNode.value = null;
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
			executingNode: readonly(executingNode),
			lastAddedExecutingNode: readonly(lastAddedExecutingNode),
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
			activeExecutionIssuesByNodeName,
			resolveExecutionTriggerNodeName,
			isNodeExecuting,
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
			addExecutingNode,
			removeExecutingNode,
			clearNodeExecutionQueue,
			loadExecution,
			markExecutionAsStopped,
			resetExecutionState,
			// Events
			onWorkflowExecutionStateChange: onWorkflowExecutionStateChange.on,
		};
	})();
}

export type WorkflowExecutionStateStore = ReturnType<typeof useWorkflowExecutionStateStore>;

/**
 * Disposes a workflow-execution-state store. Call when navigating between
 * workflows. Mirrors `disposeWorkflowDocumentStore`.
 */
export function disposeWorkflowExecutionStateStore(store: WorkflowExecutionStateStore) {
	const pinia = getActivePinia();
	store.$dispose();

	if (pinia) {
		delete pinia.state.value[store.$id];
	}
}

/**
 * Returns the workflow-execution-state store for the workflow that the current
 * `WorkflowDocumentStore` injection resolves to. Derives from
 * `injectWorkflowDocumentStore` (no separate provider) — the two stores are 1:1
 * by workflow id, so one source of truth for "current workflow" is enough.
 *
 * Inherits the document-store injection's fallback chain (legacy
 * `workflowsStore.workflowId`) transitively.
 */
export function injectWorkflowExecutionStateStore(): ShallowRef<WorkflowExecutionStateStore> {
	const documentStore = injectWorkflowDocumentStore();
	return computed(() =>
		useWorkflowExecutionStateStore(createWorkflowExecutionStateId(documentStore.value.workflowId)),
	);
}
