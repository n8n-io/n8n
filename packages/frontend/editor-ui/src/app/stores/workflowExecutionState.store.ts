import { defineStore, getActivePinia } from 'pinia';
import { STORES } from '@n8n/stores';
import {
	computed,
	effectScope,
	onScopeDispose,
	readonly,
	ref,
	shallowReactive,
	type ComputedRef,
} from 'vue';
import { createEventHook } from '@vueuse/core';
import { structuralComputed } from '@n8n/composables/structuralComputed';
import type {
	ExecutionStatus,
	ExecutionSummary,
	IPinData,
	IRunExecutionData,
	ITaskData,
	ITaskStartedData,
} from 'n8n-workflow';
import type { NodeExecuteBefore } from '@n8n/api-types/push/execution';
import type {
	IExecutionResponse,
	IExecutionsStopData,
} from '@/features/execution/executions/executions.types';
import { IN_PROGRESS_EXECUTION_ID } from '@/app/constants/placeholders';
import { useExecutingNode } from '@/app/composables/useExecutingNode';
import { useUIStore } from '@/app/stores/ui.store';
import {
	createExecutionDataId,
	disposeExecutionDataStore,
	useExecutionDataStore,
} from './executionData.store';
import {
	injectWorkflowDocumentStore,
	useWorkflowDocumentStore,
	type WorkflowDocumentId,
} from './workflowDocument.store';
import { useDocumentTitle } from '@/app/composables/useDocumentTitle';
import {
	clearPopupWindowState,
	hasTrimmedRunData,
} from '@/features/execution/executions/executions.utils';
import { CHANGE_ACTION } from './workflowDocument/types';
import type { ChangeAction, ChangeEvent } from './workflowDocument/types';
import type {
	NodeAddedPayload,
	NodeRemovedPayload,
	NodesChangeEvent,
	NodesSetPayload,
} from './workflowDocument/useWorkflowDocumentNodes';
import type { ExecutionOutputMap } from '@/app/types/executionData';

const EMPTY_EXECUTION_ISSUES_BY_NODE_NAME = new Map<string, ComputedRef<string[]>>();
const EMPTY_EXECUTION_PIN_DATA_BY_NODE_NAME: IPinData = {};
const EMPTY_EXECUTION_STATUS_BY_NODE_ID = new Map<string, ComputedRef<ExecutionStatus>>();
const EMPTY_EXECUTION_RUN_DATA_BY_NODE_ID = new Map<string, ComputedRef<ITaskData[] | null>>();
const EMPTY_EXECUTION_RUN_DATA_OUTPUT_MAP_BY_NODE_ID = new Map<string, ExecutionOutputMap>();
const EMPTY_EXECUTION_WAITING_BY_NODE_ID = new Map<string, ComputedRef<string | undefined>>();

export type WorkflowExecutionStateChangePayload = {
	documentId: WorkflowDocumentId;
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

/**
 * Gets the Pinia store id for a workflow-execution-state store.
 */
export function getWorkflowExecutionStateStoreId(id: WorkflowDocumentId) {
	return `${STORES.WORKFLOW_EXECUTION_STATES}/${id}`;
}

/**
 * Creates a workflow-execution-state store keyed by the workflow document id.
 * One execution-state store exists per workflow-document store, so the two
 * share an identity — pass the same `WorkflowDocumentId` (constructed via
 * `createWorkflowDocumentId`) to both factories.
 *
 * Owns per-workflow execution UI state — active/displayed/previous
 * execution ids, the pending-execution scaffold, chat, debug, webhook wait,
 * trigger selection, current executions list, and last-successful-execution
 * reference. Reads route through `useExecutionDataStore` for execution payloads
 * (or fall back to `pendingExecution` while `activeExecutionId === null`).
 */
export function useWorkflowExecutionStateStore(id: WorkflowDocumentId) {
	return defineStore(getWorkflowExecutionStateStoreId(id), () => {
		const documentId = id;
		const [workflowId] = id.split('@');

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
		 * Id of the execution most recently marked as stopped from this document
		 * while its local run data was incomplete (trimmed placeholders), kept so
		 * its late `executionFinished` push is still accepted and backfills the
		 * data. In scaling mode the stop endpoint persists `canceled` before the
		 * worker aborts, so the stop poll clears `activeExecutionId` before the
		 * worker's push arrives. Only set when backfill is needed — when live
		 * pushes already delivered the full data, the fetched copy can be worse
		 * than the local one (the stop endpoint may persist a pre-stop snapshot).
		 * Consumed by the push handler on match; also cleared when a new run
		 * starts tracking and on reset.
		 */
		const stoppedExecutionId = ref<string | null>(null);
		/**
		 * Every execution id ever bound to this workflow's state. Used at
		 * `resetExecutionState` time to dispose all per-execution data stores
		 * — including ones rolled out of the `previousExecutionId` slot, which
		 * the slot-only collection would otherwise miss.
		 */
		const trackedExecutionIds = ref<Set<string>>(new Set());

		/**
		 * Queue of currently-executing node names driving per-node loading
		 * spinners. Owned by the per-document store so spinner state stays
		 * isolated per workflow document. Read purely via Vue reactivity; it is
		 * intentionally not wired into the change-event mechanism below.
		 */
		const executingNode = useExecutingNode();

		const onWorkflowExecutionStateChange = createEventHook<WorkflowExecutionStateChangeEvent>();

		function fireChange(action: ChangeAction, field: WorkflowExecutionStateField) {
			void onWorkflowExecutionStateChange.trigger({
				action,
				payload: { documentId, field },
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
		 *
		 * Typed as a mutable `IExecutionResponse` for consumers (the executionData
		 * store exposes a readonly ref); treat it as read-only — all writes go
		 * through the store actions.
		 */
		const activeExecution = computed<IExecutionResponse | null>(() => {
			if (activeExecutionId.value === null) return pendingExecution.value;
			const executionId =
				typeof activeExecutionId.value === 'string'
					? activeExecutionId.value
					: typeof displayedExecutionId.value === 'string'
						? displayedExecutionId.value
						: undefined;
			if (executionId === undefined) return null;
			const executionDataStore = useExecutionDataStore(createExecutionDataId(executionId));
			// Track the timestamp so in-place mutations that preserve the execution
			// object reference still propagate to consumers (same defensive pattern
			// as `activeExecutionRunData`).
			void executionDataStore.executionResultDataLastUpdate;
			return executionDataStore.execution as IExecutionResponse | null;
		});

		/**
		 * Resolves the execution id whose data backs the "active execution" view.
		 * Tri-state fallback:
		 *  - string activeExecutionId  -> that id
		 *  - null activeExecutionId    -> IN_PROGRESS sentinel (pending run)
		 *  - undefined activeExecutionId + string displayedExecutionId
		 *                              -> displayed id (preserves the last view
		 *                                 after active is cleared)
		 *  - otherwise                 -> undefined
		 */
		function getResolvedActiveExecutionId(): string | undefined {
			if (typeof activeExecutionId.value === 'string') return activeExecutionId.value;
			if (activeExecutionId.value === null) return IN_PROGRESS_EXECUTION_ID;
			if (typeof displayedExecutionId.value === 'string') return displayedExecutionId.value;
			return undefined;
		}

		const isExecutionDataDisplayed = computed(
			() =>
				!isInDebugMode.value &&
				activeExecutionId.value === undefined &&
				typeof displayedExecutionId.value === 'string',
		);

		const activeExecutionRunData = computed(() => {
			const executionId = getResolvedActiveExecutionId();
			if (!executionId) return null;
			const executionDataStore = useExecutionDataStore(createExecutionDataId(executionId));
			// Track the timestamp so in-place mutations to runData (which keep
			// the runData object reference) still propagate.
			void executionDataStore.executionResultDataLastUpdate;
			return executionDataStore.executionRunData;
		});

		const activeExecutionExecutedNode = computed(() => {
			const executionId = getResolvedActiveExecutionId();
			if (!executionId) return undefined;
			return useExecutionDataStore(createExecutionDataId(executionId)).executedNode;
		});

		const activeExecutionStartedData = computed(() => {
			const executionId = getResolvedActiveExecutionId();
			if (!executionId) return undefined;
			// Mutable-typed for consumers (the executionData store exposes a
			// readonly ref); treat it as read-only.
			return useExecutionDataStore(createExecutionDataId(executionId)).executionStartedData as
				| [executionId: string, data: { [nodeName: string]: ITaskStartedData[] }]
				| undefined;
		});

		const activeExecutionPairedItemMappings = computed(() => {
			const executionId = getResolvedActiveExecutionId();
			if (!executionId) return {};
			return useExecutionDataStore(createExecutionDataId(executionId))
				.executionPairedItemMappings as Record<string, Set<string>>;
		});

		const activeExecutionResultDataLastUpdate = computed(() => {
			const executionId = getResolvedActiveExecutionId();
			if (!executionId) return undefined;
			return useExecutionDataStore(createExecutionDataId(executionId))
				.executionResultDataLastUpdate;
		});

		function getActiveExecutionRunDataByNodeName(nodeName: string): ITaskData[] | null {
			const runData = activeExecutionRunData.value;
			if (runData === null) return null;
			return runData[nodeName] ?? null;
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

		const activeExecutionPinDataByNodeName = computed(() => {
			const executionId = getResolvedActiveExecutionId();
			if (!executionId) return EMPTY_EXECUTION_PIN_DATA_BY_NODE_NAME;
			return useExecutionDataStore(createExecutionDataId(executionId)).executionPinDataByNodeName;
		});

		// Active/displayed/pending fallback for the per-node-id execution data
		// projections. Resolves the backing execution id via
		// `getResolvedActiveExecutionId()` (string id → that execution, pending
		// `null` → IN_PROGRESS scaffold, else displayed id) so these stay
		// consistent with `activeExecutionRunData`; falls back to an empty Map
		// sentinel only when no execution is being tracked.

		const activeExecutionStatusByNodeId = computed(() => {
			const executionId = getResolvedActiveExecutionId();
			if (!executionId) return EMPTY_EXECUTION_STATUS_BY_NODE_ID;
			return useExecutionDataStore(createExecutionDataId(executionId)).executionStatusByNodeId;
		});

		const activeExecutionRunDataByNodeId = computed(() => {
			const executionId = getResolvedActiveExecutionId();
			if (!executionId) return EMPTY_EXECUTION_RUN_DATA_BY_NODE_ID;
			return useExecutionDataStore(createExecutionDataId(executionId)).executionRunDataByNodeId;
		});

		const activeExecutionRunDataOutputMapByNodeId = computed(() => {
			const executionId = getResolvedActiveExecutionId();
			if (!executionId) return EMPTY_EXECUTION_RUN_DATA_OUTPUT_MAP_BY_NODE_ID;
			return useExecutionDataStore(createExecutionDataId(executionId))
				.executionRunDataOutputMapByNodeId;
		});

		const activeExecutionWaitingByNodeId = computed(() => {
			const executionId = getResolvedActiveExecutionId();
			if (!executionId) return EMPTY_EXECUTION_WAITING_BY_NODE_ID;
			return useExecutionDataStore(createExecutionDataId(executionId)).executionWaitingByNodeId;
		});

		const lastSuccessfulExecution = computed<IExecutionResponse | null>(() => {
			const lid = lastSuccessfulExecutionId.value;
			if (!lid) return null;
			// Mutable-typed for consumers (the executionData store exposes a
			// readonly ref); treat it as read-only.
			return useExecutionDataStore(createExecutionDataId(lid))
				.execution as IExecutionResponse | null;
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

		// ---------------------------------------------------------------------
		// Per-node-id "is this node mid-execution?" projections.
		//
		// Reconciled against the matching workflowDocument store's `onNodesChange`.
		// Each per-entry structuralComputed reads the `executingNode` refs
		// reactively, so add/remove calls invalidate only that entry — and only
		// when the *value* changes (gated by structural equality).
		// ---------------------------------------------------------------------

		const documentStore = useWorkflowDocumentStore(documentId);

		const executionRunningByNodeId = shallowReactive(new Map<string, ComputedRef<boolean>>());
		const executionWaitingForNextByNodeId = shallowReactive(
			new Map<string, ComputedRef<boolean>>(),
		);
		const runningScopes = new Map<string, () => void>();

		function computeExecutionRunning(nodeId: string): boolean {
			// `nodesById` is a top-level shallowRef inside useWorkflowDocumentNodes;
			// Pinia unwraps it to a Map at the store boundary.
			const node = documentStore.nodesById.get(nodeId);
			if (!node) return false;
			return executingNode.isNodeExecuting(node.name);
		}

		function computeExecutionWaitingForNext(nodeId: string): boolean {
			const node = documentStore.nodesById.get(nodeId);
			if (!node) return false;
			return (
				node.name === executingNode.lastAddedExecutingNode.value &&
				executingNode.executingNode.value.length === 0 &&
				isWorkflowRunning.value
			);
		}

		function applyAddRunningEntry(nodeId: string) {
			if (runningScopes.has(nodeId)) return;
			const scope = effectScope();
			scope.run(() => {
				executionRunningByNodeId.set(
					nodeId,
					structuralComputed(() => computeExecutionRunning(nodeId)),
				);
				executionWaitingForNextByNodeId.set(
					nodeId,
					structuralComputed(() => computeExecutionWaitingForNext(nodeId)),
				);
			});
			runningScopes.set(nodeId, () => scope.stop());
		}

		function applyRemoveRunningEntry(nodeId: string) {
			runningScopes.get(nodeId)?.();
			runningScopes.delete(nodeId);
			executionRunningByNodeId.delete(nodeId);
			executionWaitingForNextByNodeId.delete(nodeId);
		}

		function applyReconcileRunningEntries(nodeIds: string[]) {
			const next = new Set(nodeIds);
			for (const old of runningScopes.keys()) {
				if (!next.has(old)) applyRemoveRunningEntry(old);
			}
			for (const id of nodeIds) applyAddRunningEntry(id);
		}

		// Subscribe lazily and defensively. Some test files mock
		// `useWorkflowDocumentStore` with a partial object that lacks
		// `onNodesChange` / `nodesById`. The guard keeps the dependency soft for
		// tests that don't exercise the running maps; in production the document
		// store always provides the full surface.
		if (typeof documentStore.onNodesChange === 'function') {
			documentStore.onNodesChange((event: NodesChangeEvent) => {
				switch (event.action) {
					case CHANGE_ACTION.ADD: {
						const { node } = event.payload as NodeAddedPayload;
						applyAddRunningEntry(node.id);
						break;
					}
					case CHANGE_ACTION.DELETE: {
						const payload = event.payload as NodeRemovedPayload;
						if (payload.id) {
							applyRemoveRunningEntry(payload.id);
						} else {
							applyReconcileRunningEntries([]);
						}
						break;
					}
					case CHANGE_ACTION.SET: {
						const { nodeIds } = event.payload as NodesSetPayload;
						applyReconcileRunningEntries(nodeIds);
						break;
					}
				}
			});
		}

		const initialNodesById = documentStore.nodesById;
		if (initialNodesById && typeof initialNodesById.keys === 'function') {
			applyReconcileRunningEntries(Array.from(initialNodesById.keys()));
		}

		// Scopes created from `onNodesChange` callbacks have no active parent
		// (event dispatch runs outside any scope), so `$dispose()` never
		// reaches them. Vue 3.5 computeds are not scope-owned and detach from
		// deps once unsubscribed, so this is deterministic cleanup hygiene
		// rather than leak prevention: stop the scopes and drop the per-node
		// entries when the store is disposed.
		onScopeDispose(() => {
			for (const stop of runningScopes.values()) stop();
			runningScopes.clear();
			executionRunningByNodeId.clear();
			executionWaitingForNextByNodeId.clear();
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
			// A new run (null = pending, string = known id) supersedes any
			// stopped-execution marker. `undefined` must not clear it: clearing the
			// active id is exactly the transition the marker is created to outlive.
			if (value !== undefined) {
				stoppedExecutionId.value = null;
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

		/**
		 * Applies a fetched/started execution result to this document's session state:
		 * clears it when null, stages it as the pending scaffold while in progress, or
		 * tracks it as a displayed execution once it has a backend id.
		 */
		function setWorkflowExecutionData(workflowResultData: IExecutionResponse | null) {
			if (workflowResultData === null) {
				setPendingExecution(null);
				clearDisplayedExecution();
			} else if (workflowResultData.id === IN_PROGRESS_EXECUTION_ID) {
				setPendingExecution(workflowResultData);
				setActiveExecutionId(null);
				useExecutionDataStore(createExecutionDataId(IN_PROGRESS_EXECUTION_ID)).setExecution(
					workflowResultData,
				);
			} else {
				trackExecutionId(workflowResultData.id);
				useExecutionDataStore(createExecutionDataId(workflowResultData.id)).setExecution(
					workflowResultData,
				);
				if (typeof activeExecutionId.value !== 'string') {
					setPendingExecution(null);
					setActiveExecutionId(undefined);
					setDisplayedExecutionId(workflowResultData.id);
				}
			}
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

		/**
		 * Consumes the stopped-execution marker once its `executionFinished` push
		 * has been accepted, so a duplicate push cannot re-process the finish.
		 */
		function clearStoppedExecutionId() {
			stoppedExecutionId.value = null;
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

		function setActiveExecutionRunData(runData: IRunExecutionData) {
			const executionId = getResolvedActiveExecutionId();
			if (!executionId) return;
			useExecutionDataStore(createExecutionDataId(executionId)).setExecutionRunData(runData);
		}

		function clearActiveExecutionStartedData() {
			const executionId = getResolvedActiveExecutionId();
			if (!executionId) return;
			useExecutionDataStore(createExecutionDataId(executionId)).clearExecutionStartedData();
		}

		function addActiveNodeExecutionStartedData(data: NodeExecuteBefore['data']) {
			const executionId = getResolvedActiveExecutionId();
			if (!executionId) return;
			useExecutionDataStore(createExecutionDataId(executionId)).addNodeExecutionStartedData(data);
		}

		/**
		 * Cross-store rename for the active execution. Reaches into:
		 *  - executionData store (runData keys, pinData, sources, workflowData, executedNode)
		 *  - this store (selectedTriggerNodeName, chatPartialDest)
		 *  - uiStore (lastSelectedNode, dirty flag)
		 *  - workflowDocument store (node metadata, workflow-level pinData)
		 */
		function renameActiveExecutionNode(nameData: { old: string; new: string }) {
			const uiStore = useUIStore();
			uiStore.markStateDirty();

			const executionId = getResolvedActiveExecutionId();
			if (executionId) {
				useExecutionDataStore(createExecutionDataId(executionId)).renameExecutionDataNode(
					nameData.old,
					nameData.new,
				);
			}

			renameExecutionStateNode(nameData.old, nameData.new);

			if (uiStore.lastSelectedNode === nameData.old) {
				uiStore.lastSelectedNode = nameData.new;
			}

			if (workflowId) {
				const workflowDocumentStore = useWorkflowDocumentStore(documentId);
				workflowDocumentStore.renameNodeMetadata(nameData.old, nameData.new);
				workflowDocumentStore.renamePinDataNode(nameData.old, nameData.new);
			}
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
			stoppedExecutionId.value = null;
			executingNode.clearNodeExecutionQueue();
			fireChange(CHANGE_ACTION.DELETE, 'state');
		}

		/**
		 * Resets this document's execution session after a stop: clears the active
		 * execution id / executing-node queue / webhook-wait, restores the IDLE
		 * document title, and marks the relevant executionData store as stopped
		 * (active id → IN_PROGRESS scaffold → displayed-id fallback for the
		 * stop-race-with-finished case).
		 */
		function markExecutionAsStopped(stopData?: IExecutionsStopData) {
			const activeId = activeExecutionId.value;

			setActiveExecutionId(undefined);
			executingNode.clearNodeExecutionQueue();
			setExecutionWaitingForWebhook(false);

			useDocumentTitle().setDocumentTitle(useWorkflowDocumentStore(documentId).name, 'IDLE');

			if (typeof activeId === 'string') {
				const executionDataStore = useExecutionDataStore(createExecutionDataId(activeId));
				// Remember the stopped id so the late `executionFinished` push can
				// still backfill this execution's run data — but only when the local
				// copy is incomplete (trimmed placeholders); see stoppedExecutionId.
				if (hasTrimmedRunData(executionDataStore.executionRunData ?? {})) {
					stoppedExecutionId.value = activeId;
				}
				executionDataStore.clearExecutionStartedData();
				executionDataStore.markAsStopped(stopData);
			} else if (activeId === null) {
				// Pending scaffold: filter the IN_PROGRESS placeholder data and
				// mirror status onto the pendingExecution ref so the UI sees the canceled state.
				const executionDataStore = useExecutionDataStore(
					createExecutionDataId(IN_PROGRESS_EXECUTION_ID),
				);
				executionDataStore.clearExecutionStartedData();
				executionDataStore.markAsStopped(stopData);
				if (stopData) {
					applyStopDataToPendingExecution(stopData);
				}
			} else {
				// activeExecutionId === undefined: fall back to displayedExecutionId for the
				// stop-race-with-finished case where active was just cleared.
				const displayedId = displayedExecutionId.value;
				if (typeof displayedId === 'string') {
					const executionDataStore = useExecutionDataStore(createExecutionDataId(displayedId));
					executionDataStore.clearExecutionStartedData();
					executionDataStore.markAsStopped(stopData);
				}
			}

			clearPopupWindowState();
		}

		return {
			documentId,
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
			stoppedExecutionId: readonly(stoppedExecutionId),
			executingNode,
			activeExecution,
			isExecutionDataDisplayed,
			activeExecutionRunData,
			activeExecutionExecutedNode,
			activeExecutionStartedData,
			activeExecutionPairedItemMappings,
			activeExecutionResultDataLastUpdate,
			lastSuccessfulExecution,
			isWorkflowRunning,
			getAllLoadedFinishedExecutions,
			getPastChatMessages,
			getActiveExecutionRunDataByNodeName,
			activeExecutionIssuesByNodeName,
			activeExecutionPinDataByNodeName,
			activeExecutionStatusByNodeId,
			activeExecutionRunDataByNodeId,
			activeExecutionRunDataOutputMapByNodeId,
			activeExecutionWaitingByNodeId,
			executionRunningByNodeId,
			executionWaitingForNextByNodeId,
			resolveExecutionTriggerNodeName,
			// Write API
			trackExecutionId,
			setActiveExecutionId,
			setWorkflowExecutionData,
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
			clearStoppedExecutionId,
			clearAllExecutions,
			setCurrentWorkflowExecutions,
			clearCurrentWorkflowExecutions,
			deleteExecution,
			addToCurrentExecutions,
			resetChatMessages,
			appendChatMessage,
			setSelectedTriggerNodeName,
			renameExecutionStateNode,
			setActiveExecutionRunData,
			clearActiveExecutionStartedData,
			addActiveNodeExecutionStartedData,
			renameActiveExecutionNode,
			resetExecutionState,
			markExecutionAsStopped,
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
 * Resolves the workflow-execution-state store for the current workflow
 * document scope.
 *
 * There is deliberately no separate provide for this store: the workflow
 * document store (`WorkflowDocumentStoreKey`) is the single provided source
 * of truth for a subtree's scope, and the execution-state store shares its
 * identity (same `WorkflowDocumentId`). Deriving from the injected document
 * store keeps the two from ever pointing at different scopes. Falls back to
 * the global workflow id outside any provide tree, exactly like
 * `injectWorkflowDocumentStore()`.
 */
export function injectWorkflowExecutionStateStore(): ComputedRef<
	ReturnType<typeof useWorkflowExecutionStateStore>
> {
	const workflowDocumentStore = injectWorkflowDocumentStore();
	return computed(() => useWorkflowExecutionStateStore(workflowDocumentStore.value.documentId));
}
