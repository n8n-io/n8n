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
	IRunData,
	IRunExecutionData,
	ITaskData,
	ITaskStartedData,
} from 'n8n-workflow';
import type { NodeExecuteBefore } from '@n8n/api-types/push/execution';
import type { AgentNodeCapability, AgentNodeProgress } from '@n8n/api-types';
import type {
	IExecutionResponse,
	IExecutionsStopData,
} from '@/features/execution/executions/executions.types';
import { IN_PROGRESS_EXECUTION_ID } from '@/app/constants/placeholders';
import { useExecutingNode } from '@/app/composables/useExecutingNode';
import { useSubExecutions, type SubExecutionLink } from '@/app/composables/useSubExecutions';
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
import { AGENT_CAPABILITY_ACTIVE_MIN_DURATION } from '@/app/constants/durations';
import {
	capabilityActivityKeys,
	type AgentCapabilityActivityKey,
} from '@/features/agents/utils/agentCapabilityActivity';

const EMPTY_EXECUTION_ISSUES_BY_NODE_NAME = new Map<string, ComputedRef<string[]>>();
const EMPTY_EXECUTION_PIN_DATA_BY_NODE_NAME: IPinData = {};
const EMPTY_EXECUTION_STATUS_BY_NODE_ID = new Map<string, ComputedRef<ExecutionStatus>>();
const EMPTY_EXECUTION_RUN_DATA_BY_NODE_ID = new Map<string, ComputedRef<ITaskData[] | null>>();
const EMPTY_EXECUTION_RUN_DATA_OUTPUT_MAP_BY_NODE_ID = new Map<string, ExecutionOutputMap>();
const EMPTY_EXECUTION_WAITING_BY_NODE_ID = new Map<string, ComputedRef<string | undefined>>();
const EMPTY_EXECUTION_ISSUES_BY_NODE_ID = new Map<string, ComputedRef<string[]>>();
const EMPTY_EXECUTION_PIN_DATA_BY_NODE_ID = new Map<
	string,
	ComputedRef<IPinData[string] | undefined>
>();

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
		const activeAgentCapabilityCalls = shallowReactive(
			new Map<
				string,
				{
					nodeId: string;
					nodeName: string;
					capability: AgentNodeCapability;
					startedAt: number;
				}
			>(),
		);
		const latestAgentProgressByCapabilityCall = new Map<
			string,
			{ nodeName: string; sequenceNumber: number }
		>();
		const agentCapabilityRemovalTimers = new Map<string, ReturnType<typeof setTimeout>>();

		const activeAgentCapabilityKeysByNodeId = computed(() => {
			const keysByNodeId = new Map<string, Set<AgentCapabilityActivityKey>>();
			for (const call of activeAgentCapabilityCalls.values()) {
				const keys = keysByNodeId.get(call.nodeId) ?? new Set<AgentCapabilityActivityKey>();
				for (const key of capabilityActivityKeys(call.capability)) keys.add(key);
				keysByNodeId.set(call.nodeId, keys);
			}
			return keysByNodeId;
		});

		function capabilityCallKey(data: AgentNodeProgress['data']): string {
			return `${data.executionId}:${data.nodeId}:${data.runIndex}:${data.itemIndex}:${data.toolCallId}`;
		}

		function removeAgentCapabilityCall(key: string) {
			const timer = agentCapabilityRemovalTimers.get(key);
			if (timer) clearTimeout(timer);
			agentCapabilityRemovalTimers.delete(key);
			activeAgentCapabilityCalls.delete(key);
		}

		function clearAgentNodeProgress(nodeName: string) {
			for (const [key, call] of activeAgentCapabilityCalls) {
				if (call.nodeName === nodeName) removeAgentCapabilityCall(key);
			}
			for (const [key, call] of latestAgentProgressByCapabilityCall) {
				if (call.nodeName === nodeName) latestAgentProgressByCapabilityCall.delete(key);
			}
		}

		function clearAgentProgress() {
			for (const timer of agentCapabilityRemovalTimers.values()) clearTimeout(timer);
			agentCapabilityRemovalTimers.clear();
			activeAgentCapabilityCalls.clear();
			latestAgentProgressByCapabilityCall.clear();
		}

		function handleAgentNodeProgress({ data }: AgentNodeProgress) {
			if (activeExecutionId.value !== data.executionId) return;

			const callKey = capabilityCallKey(data);
			const latest = latestAgentProgressByCapabilityCall.get(callKey);
			if (latest && data.sequenceNumber <= latest.sequenceNumber) return;
			latestAgentProgressByCapabilityCall.set(callKey, {
				nodeName: data.nodeName,
				sequenceNumber: data.sequenceNumber,
			});

			if (data.status === 'running') {
				const existing = activeAgentCapabilityCalls.get(callKey);
				const removalTimer = agentCapabilityRemovalTimers.get(callKey);
				if (removalTimer) clearTimeout(removalTimer);
				agentCapabilityRemovalTimers.delete(callKey);
				activeAgentCapabilityCalls.set(callKey, {
					nodeId: data.nodeId,
					nodeName: data.nodeName,
					capability: data.capability,
					startedAt: existing?.startedAt ?? Date.now(),
				});
				return;
			}

			const call = activeAgentCapabilityCalls.get(callKey);
			if (!call) return;
			const remainingDuration = Math.max(
				0,
				AGENT_CAPABILITY_ACTIVE_MIN_DURATION - (Date.now() - call.startedAt),
			);
			if (remainingDuration === 0) {
				removeAgentCapabilityCall(callKey);
				return;
			}
			agentCapabilityRemovalTimers.set(
				callKey,
				setTimeout(() => removeAgentCapabilityCall(callKey), remainingDuration),
			);
		}

		/** Sub-workflow executions of the run being watched. */
		const subExecutions = useSubExecutions();

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

		// Drops the entries whose name now belongs to a different node than the one
		// that produced them.
		function dropRunDataOfReplacedNodes(
			runData: IRunData | null,
			executedNodes: ReadonlyArray<{ id: string; name: string }> | undefined,
		): IRunData | null {
			if (!runData || !executedNodes?.length) {
				return runData;
			}

			const executedIdByName = new Map(executedNodes.map((node) => [node.name, node.id]));
			const entries = Object.entries(runData);
			const kept = entries.filter(([nodeName]) => {
				const executedId = executedIdByName.get(nodeName);
				const currentId = documentStore.getNodeByName(nodeName)?.id;

				return !executedId || !currentId || executedId === currentId;
			});

			// Same object when nothing was dropped: this runs on every execution
			// push and consumers downstream gate on reference identity.
			return kept.length === entries.length ? runData : Object.fromEntries(kept);
		}

		const activeExecutionRunData = computed(() => {
			const executionId = getResolvedActiveExecutionId();
			if (!executionId) {
				return null;
			}

			const executionDataStore = useExecutionDataStore(createExecutionDataId(executionId));
			// Track the timestamp so in-place mutations to runData (which keep
			// the runData object reference) still propagate.
			void executionDataStore.executionResultDataLastUpdate;

			return dropRunDataOfReplacedNodes(
				executionDataStore.executionRunData,
				executionDataStore.execution?.workflowData?.nodes,
			);
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

		// Live sub-execution overlay: fills in per-node state from the live
		// sub-executions wherever this execution has none, lighting up the branch of
		// a workflow calling itself. Node ids only line up in that self-call case,
		// so a different sub-workflow contributes nothing and the maps come through
		// untouched. Reading from separate stores means the authoritative run data
		// fetched at the end replaces only the parent's own state, so the branch
		// stays lit.

		/** Registered sub-executions of the tracked run, in the order they started. */
		const subExecutionLinks = computed(() =>
			Array.from(subExecutions.byExecutionId.value.values()),
		);

		/**
		 * Live sub-executions' data stores, oldest first. Reading the registry here
		 * is what re-resolves the overlays when one starts or is superseded.
		 */
		function subExecutionStores() {
			return Array.from(subExecutions.byExecutionId.value.keys(), (executionId) =>
				useExecutionDataStore(createExecutionDataId(executionId)),
			);
		}

		/** Node ids present in any of the given maps. */
		function unionOfNodeIds(maps: Array<Map<string, unknown>>): Set<string> {
			const nodeIds = new Set<string>();
			for (const map of maps) for (const nodeId of map.keys()) nodeIds.add(nodeId);
			return nodeIds;
		}

		function ownStatusByNodeId() {
			const executionId = getResolvedActiveExecutionId();
			return executionId
				? useExecutionDataStore(createExecutionDataId(executionId)).executionStatusByNodeId
				: EMPTY_EXECUTION_STATUS_BY_NODE_ID;
		}

		function ownRunDataByNodeId() {
			const executionId = getResolvedActiveExecutionId();
			return executionId
				? useExecutionDataStore(createExecutionDataId(executionId)).executionRunDataByNodeId
				: EMPTY_EXECUTION_RUN_DATA_BY_NODE_ID;
		}

		function computeOverlaidStatus(nodeId: string): ExecutionStatus {
			const ownStatus = ownStatusByNodeId().get(nodeId)?.value;
			if (ownStatus !== undefined && ownStatus !== 'new') return ownStatus;
			// Newest wins, so an earlier iteration doesn't outrank the current one.
			const stores = subExecutionStores();
			for (let i = stores.length - 1; i >= 0; i--) {
				const status = stores[i].executionStatusByNodeId.get(nodeId)?.value;
				if (status !== undefined && status !== 'new') return status;
			}
			return ownStatus ?? 'new';
		}

		function computeOverlaidRunData(nodeId: string): ITaskData[] | null {
			const ownTasks = ownRunDataByNodeId().get(nodeId)?.value;
			if (ownTasks) return ownTasks;
			const stores = subExecutionStores();
			for (let i = stores.length - 1; i >= 0; i--) {
				const tasks = stores[i].executionRunDataByNodeId.get(nodeId)?.value;
				if (tasks) return tasks;
			}
			return null;
		}

		// Entries resolve the active execution and the registry on read, so they are
		// created once per node rather than once per node per iteration — a long loop
		// would otherwise churn through thousands of computeds. Owned by a scope
		// stopped on disposal; entries drop alongside the running maps below.
		const overlayScope = effectScope();
		const overlayStatusEntries = new Map<string, ComputedRef<ExecutionStatus>>();
		const overlayRunDataEntries = new Map<string, ComputedRef<ITaskData[] | null>>();

		function overlayStatusEntry(nodeId: string): ComputedRef<ExecutionStatus> {
			let entry = overlayStatusEntries.get(nodeId);
			if (!entry) {
				entry = overlayScope.run(() => structuralComputed(() => computeOverlaidStatus(nodeId)))!;
				overlayStatusEntries.set(nodeId, entry);
			}
			return entry;
		}

		function overlayRunDataEntry(nodeId: string): ComputedRef<ITaskData[] | null> {
			let entry = overlayRunDataEntries.get(nodeId);
			if (!entry) {
				// Plain `computed`: task data can be megabytes, so reference identity is
				// the right gate (same reason as the per-execution store).
				entry = overlayScope.run(() => computed(() => computeOverlaidRunData(nodeId)))!;
				overlayRunDataEntries.set(nodeId, entry);
			}
			return entry;
		}

		const activeExecutionStatusByNodeId = computed(() => {
			const own = ownStatusByNodeId();
			const overlays = subExecutionStores().map((store) => store.executionStatusByNodeId);
			if (overlays.length === 0) return own;

			const merged = new Map<string, ComputedRef<ExecutionStatus>>();
			for (const nodeId of unionOfNodeIds([own, ...overlays])) {
				merged.set(nodeId, overlayStatusEntry(nodeId));
			}
			return merged;
		});

		const activeExecutionRunDataByNodeId = computed(() => {
			const own = ownRunDataByNodeId();
			const overlays = subExecutionStores().map((store) => store.executionRunDataByNodeId);
			if (overlays.length === 0) return own;

			const merged = new Map<string, ComputedRef<ITaskData[] | null>>();
			for (const nodeId of unionOfNodeIds([own, ...overlays])) {
				merged.set(nodeId, overlayRunDataEntry(nodeId));
			}
			return merged;
		});

		const activeExecutionRunDataOutputMapByNodeId = computed(() => {
			const executionId = getResolvedActiveExecutionId();
			const own = executionId
				? useExecutionDataStore(createExecutionDataId(executionId))
						.executionRunDataOutputMapByNodeId
				: EMPTY_EXECUTION_RUN_DATA_OUTPUT_MAP_BY_NODE_ID;
			const overlays = subExecutionStores().map((store) => store.executionRunDataOutputMapByNodeId);
			if (overlays.length === 0) return own;

			// Only nodes that produced output have an entry, so a missing key is the
			// emptiness signal — no per-node wrapper needed.
			const merged = new Map<string, ExecutionOutputMap>();
			for (const overlay of overlays) {
				for (const [nodeId, outputMap] of overlay.entries()) merged.set(nodeId, outputMap);
			}
			for (const [nodeId, outputMap] of own.entries()) merged.set(nodeId, outputMap);
			return merged;
		});

		const activeExecutionWaitingByNodeId = computed(() => {
			const executionId = getResolvedActiveExecutionId();
			if (!executionId) return EMPTY_EXECUTION_WAITING_BY_NODE_ID;
			return useExecutionDataStore(createExecutionDataId(executionId)).executionWaitingByNodeId;
		});

		const activeExecutionIssuesByNodeId = computed(() => {
			const executionId = getResolvedActiveExecutionId();
			if (!executionId) return EMPTY_EXECUTION_ISSUES_BY_NODE_ID;
			return useExecutionDataStore(createExecutionDataId(executionId)).executionIssuesByNodeId;
		});

		const activeExecutionPinDataByNodeId = computed(() => {
			const executionId = getResolvedActiveExecutionId();
			if (!executionId) return EMPTY_EXECUTION_PIN_DATA_BY_NODE_ID;
			return useExecutionDataStore(createExecutionDataId(executionId)).executionPinDataByNodeId;
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
			// Both queues count: the calling node stays running while its child
			// advances.
			return (
				executingNode.isNodeExecuting(node.name) ||
				subExecutions.executingNode.isNodeExecuting(node.name)
			);
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
			overlayStatusEntries.delete(nodeId);
			overlayRunDataEntries.delete(nodeId);
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
			overlayScope.stop();
			overlayStatusEntries.clear();
			overlayRunDataEntries.clear();
			clearAgentProgress();
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
			if (activeExecutionId.value !== value) clearAgentProgress();
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
		 * Binds a starting sub-execution to the run this document is watching, so its
		 * node events are accepted. Ignored unless its parent chain reaches the
		 * tracked execution. Returns whether it was registered.
		 */
		function registerSubExecution(link: SubExecutionLink): boolean {
			const belongsToTrackedRun =
				link.parentExecutionId === activeExecutionId.value ||
				subExecutions.has(link.parentExecutionId);
			if (!belongsToTrackedRun) return false;

			// The superseded iteration is no longer shown, so drop its data rather
			// than keeping every loop iteration in memory.
			for (const id of subExecutions.register(link)) {
				disposeExecutionDataStore(useExecutionDataStore(createExecutionDataId(id)));
				trackedExecutionIds.value.delete(id);
			}
			trackExecutionId(link.executionId);
			return true;
		}

		/**
		 * A sub-execution finished. Its data stays registered (the canvas and log
		 * view keep showing it) but nothing in it runs, so the queue is cleared; a
		 * sibling still running re-fills it on its next node event.
		 */
		function markSubExecutionFinished(executionId: string) {
			if (!subExecutions.has(executionId)) return;
			subExecutions.executingNode.clearNodeExecutionQueue();
		}

		/** Empties the sub-execution registry and disposes the data it was showing. */
		function clearSubExecutions() {
			for (const id of subExecutions.clear()) {
				disposeExecutionDataStore(useExecutionDataStore(createExecutionDataId(id)));
				trackedExecutionIds.value.delete(id);
			}
		}

		/**
		 * Applies a fetched/started execution result to this document's session state:
		 * clears it when null, stages it as the pending scaffold while in progress, or
		 * tracks it as a displayed execution once it has a backend id.
		 */
		function setWorkflowExecutionData(workflowResultData: IExecutionResponse | null) {
			// Starts, clears, or swaps the displayed execution, so the previous run's
			// sub-executions stop being relevant.
			clearSubExecutions();

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
			// Stores already disposed by the loop above; just drop the registry.
			subExecutions.clear();
			clearAgentProgress();
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
			// Sub-executions abort too, but their data stays on display.
			subExecutions.executingNode.clearNodeExecutionQueue();
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
			/** Node currently executing inside a sub-execution of the tracked run. */
			subExecutingNode: subExecutions.executingNode,
			subExecutionLinks,
			isTrackedSubExecution: subExecutions.has,
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
			activeExecutionIssuesByNodeId,
			activeExecutionPinDataByNodeId,
			activeAgentCapabilityKeysByNodeId,
			executionRunningByNodeId,
			executionWaitingForNextByNodeId,
			resolveExecutionTriggerNodeName,
			// Write API
			trackExecutionId,
			registerSubExecution,
			markSubExecutionFinished,
			clearSubExecutions,
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
			handleAgentNodeProgress,
			clearAgentNodeProgress,
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
