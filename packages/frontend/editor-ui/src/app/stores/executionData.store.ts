import { defineStore, getActivePinia } from 'pinia';
import { STORES } from '@n8n/stores';
import { computed, effectScope, inject, readonly, ref, shallowReactive } from 'vue';
import type { ComputedRef } from 'vue';
import { createEventHook, throttledWatch } from '@vueuse/core';
import { structuralComputed } from '@n8n/composables/structuralComputed';
import isEqual from 'lodash/isEqual';
import { useI18n } from '@n8n/i18n';
import {
	NodeConnectionTypes,
	SEND_AND_WAIT_OPERATION,
	WAIT_INDEFINITELY,
	type ExecutionStatus,
	type INode,
	type IRunData,
	type IRunExecutionData,
	type ITaskData,
	type ITaskStartedData,
} from 'n8n-workflow';
import type { PushPayload } from '@n8n/api-types';
import type { NodeExecuteBefore } from '@n8n/api-types/push/execution';
import type { IExecutionResponse } from '@/features/execution/executions/executions.types';
import { ExecutionDataStoreKey } from '@/app/constants/injectionKeys';
import {
	CANVAS_EXECUTION_DATA_THROTTLE_DURATION,
	FORM_NODE_TYPE,
	WAIT_NODE_TYPE,
} from '@/app/constants';
import { getPairedItemsMapping } from '@/app/utils/pairedItemUtils';
import { sanitizeHtml } from '@/app/utils/htmlUtils';
import { CHANGE_ACTION } from './workflowDocument/types';
import type { ChangeAction, ChangeEvent } from './workflowDocument/types';
import type { ExecutionOutputMap } from '@/app/types/executionData';

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
		const i18n = useI18n();
		const execution = ref<IExecutionResponse | null>(null);
		const executionResultDataLastUpdate = ref<number>();
		const executionStartedData = ref<ExecutionStartedDataValue>();
		const executionPairedItemMappings = ref<Record<string, Set<string>>>({});

		const onExecutionDataChange = createEventHook<ExecutionDataChangeEvent>();

		const executionRunData = computed<IRunData | null>(
			() => execution.value?.data?.resultData?.runData ?? null,
		);

		const executedNode = computed(() => execution.value?.executedNode);

		// Per-node-name execution-issues map with atomic per-name updates.
		// Each entry is a structuralComputed in its own effectScope, so only
		// the affected node re-evaluates on runData changes and isEqual
		// short-circuits downstream propagation when the error array is
		// structurally identical. Entries are added/removed by reconciling
		// against executionRunData keys (driven by watch below).
		// effectScopes are children of the store's setup-scope, so $dispose
		// cascades cleanup — no explicit teardown needed.
		const executionIssuesByNodeName = shallowReactive(new Map<string, ComputedRef<string[]>>());
		const executionIssueScopes = new Map<string, () => void>();

		function computeNodeExecutionIssues(nodeName: string): string[] {
			const tasks = executionRunData.value?.[nodeName];
			if (!tasks) return [];
			const issues: string[] = [];
			for (const task of tasks) {
				if (task?.error) {
					const { message, description } = task.error;
					issues.push(sanitizeHtml(`${message}${description ? ` (${description})` : ''}`));
				}
			}
			return issues;
		}

		function applyAddExecutionIssuesEntry(nodeName: string) {
			if (executionIssueScopes.has(nodeName)) return;
			const scope = effectScope();
			scope.run(() => {
				executionIssuesByNodeName.set(
					nodeName,
					structuralComputed(() => computeNodeExecutionIssues(nodeName), isEqual),
				);
			});
			executionIssueScopes.set(nodeName, () => scope.stop());
		}

		function applyRemoveExecutionIssuesEntry(nodeName: string) {
			executionIssueScopes.get(nodeName)?.();
			executionIssueScopes.delete(nodeName);
			executionIssuesByNodeName.delete(nodeName);
		}

		function applyReconcileExecutionIssuesEntries(nodeNames: string[]) {
			const next = new Set(nodeNames);
			for (const old of executionIssueScopes.keys()) {
				if (!next.has(old)) applyRemoveExecutionIssuesEntry(old);
			}
			for (const name of nodeNames) applyAddExecutionIssuesEntry(name);
		}

		function reconcileExecutionIssuesFromRunData() {
			const runData = executionRunData.value;
			applyReconcileExecutionIssuesEntries(runData ? Object.keys(runData) : []);
		}

		// Subscribe to the event hook rather than watching `executionRunData` —
		// renameExecutionDataNode mutates runData keys in place, leaving the
		// computed's reference unchanged. The event hook fires on every
		// mutation (including rename), so reconcile picks up key changes
		// regardless of reference identity.
		void onExecutionDataChange.on(reconcileExecutionIssuesFromRunData);
		reconcileExecutionIssuesFromRunData();

		// ---------------------------------------------------------------------
		// Per-node-id projections of execution state.
		//
		// The store's primary key is node *name* (runData is keyed by name),
		// but consumers (canvas, NDV) need by-id lookup. The execution payload
		// embeds a `workflowData.nodes` snapshot, which is the authoritative
		// source for the name↔id mapping at execution time. `renameExecutionDataNode`
		// updates that snapshot in place, so renames propagate naturally.
		//
		// Each map uses the same shallowReactive<Map<id, ComputedRef<T>>>
		// pattern as `executionIssuesByNodeName`: per-entry structuralComputed,
		// reconciled against `workflowData.nodes` via `onExecutionDataChange`.
		// ---------------------------------------------------------------------

		// Lazy index of the embedded workflow snapshot, keyed by node id.
		// Materializes once per execution.value change and is shared across all
		// per-entry projections below — collapses id → node resolution from
		// O(N) per lookup to O(1).
		const executionNodeById = computed(() => {
			const map = new Map<string, INode>();
			const nodes = execution.value?.workflowData?.nodes;
			if (nodes) for (const n of nodes) map.set(n.id, n);
			return map;
		});

		function getExecutionNodeById(nodeId: string): INode | undefined {
			return executionNodeById.value.get(nodeId);
		}

		function getExecutionNodeIds(): string[] {
			return Array.from(executionNodeById.value.keys());
		}

		const byIdScopes = new Map<string, () => void>();
		const executionStatusByNodeId = shallowReactive(
			new Map<string, ComputedRef<ExecutionStatus>>(),
		);
		const executionRunDataByNodeId = shallowReactive(
			new Map<string, ComputedRef<ITaskData[] | null>>(),
		);
		const executionWaitingByNodeId = shallowReactive(
			new Map<string, ComputedRef<string | undefined>>(),
		);

		function computeExecutionStatus(nodeId: string): ExecutionStatus {
			const node = getExecutionNodeById(nodeId);
			if (!node) return 'new';
			const tasks = executionRunData.value?.[node.name] ?? [];
			// A canceled top-of-stack tends to mask the prior "real" status — peek
			// one task back so the UI shows the meaningful state.
			let status = tasks.at(-1)?.executionStatus;
			if (tasks.length > 1 && status === 'canceled') {
				status = tasks.at(-2)?.executionStatus;
			}
			return status ?? 'new';
		}

		function computeExecutionRunData(nodeId: string): ITaskData[] | null {
			const node = getExecutionNodeById(nodeId);
			if (!node) return null;
			const tasks = executionRunData.value?.[node.name];
			return tasks ?? null;
		}

		function computeExecutionWaiting(nodeId: string): string | undefined {
			const node = getExecutionNodeById(nodeId);
			if (!node) return undefined;
			const ex = execution.value;
			if (!ex || ex.finished) return undefined;
			// `waitTill` exists at runtime on resumed executions but isn't declared
			// on IExecutionResponse — narrow via the property check.
			const waitTill = (ex as IExecutionResponse & { waitTill?: Date | string }).waitTill;
			if (!waitTill) return undefined;
			const lastNodeExecuted = ex.data?.resultData?.lastNodeExecuted;
			if (node.name !== lastNodeExecuted) return undefined;

			const resume = node.parameters?.resume as string | undefined;
			if (node.type === WAIT_NODE_TYPE && (resume === 'webhook' || resume === 'form')) {
				return resume === 'webhook'
					? i18n.baseText('node.theNodeIsWaitingWebhookCall')
					: i18n.baseText('node.theNodeIsWaitingFormCall');
			}
			if (node.parameters?.operation === SEND_AND_WAIT_OPERATION) {
				return i18n.baseText('node.theNodeIsWaitingUserInput');
			}
			if (node.type === FORM_NODE_TYPE) {
				return i18n.baseText('node.theNodeIsWaitingFormCall');
			}
			const waitDate = new Date(waitTill);
			if (waitDate.getTime() === WAIT_INDEFINITELY.getTime()) {
				return i18n.baseText('node.theNodeIsWaitingIndefinitelyForAnIncomingWebhookCall');
			}
			return i18n.baseText('node.nodeIsWaitingTill', {
				interpolate: {
					date: waitDate.toLocaleDateString(),
					time: waitDate.toLocaleTimeString(),
				},
			});
		}

		function applyAddByIdEntry(nodeId: string) {
			if (byIdScopes.has(nodeId)) return;
			const scope = effectScope();
			scope.run(() => {
				executionStatusByNodeId.set(
					nodeId,
					structuralComputed(() => computeExecutionStatus(nodeId)),
				);
				// Plain `computed` (Object.is) rather than `structuralComputed(..., isEqual)`:
				// per-task data can be megabytes for nodes with large outputs, and
				// every push replaces the runData array reference with new content
				// — so an isEqual gate would deep-compare megabytes and never
				// short-circuit. Reference identity is the right gate here.
				executionRunDataByNodeId.set(
					nodeId,
					computed(() => computeExecutionRunData(nodeId)),
				);
				executionWaitingByNodeId.set(
					nodeId,
					structuralComputed(() => computeExecutionWaiting(nodeId)),
				);
			});
			byIdScopes.set(nodeId, () => scope.stop());
		}

		function applyRemoveByIdEntry(nodeId: string) {
			byIdScopes.get(nodeId)?.();
			byIdScopes.delete(nodeId);
			executionStatusByNodeId.delete(nodeId);
			executionRunDataByNodeId.delete(nodeId);
			executionWaitingByNodeId.delete(nodeId);
		}

		function applyReconcileByIdEntries(nodeIds: string[]) {
			const next = new Set(nodeIds);
			for (const old of byIdScopes.keys()) {
				if (!next.has(old)) applyRemoveByIdEntry(old);
			}
			for (const id of nodeIds) applyAddByIdEntry(id);
		}

		function reconcileByIdEntries() {
			applyReconcileByIdEntries(getExecutionNodeIds());
		}

		void onExecutionDataChange.on(reconcileByIdEntries);
		reconcileByIdEntries();

		// Throttled per-node-id aggregation of run data into `ExecutionOutputMap`.
		// Aggregation cost scales with task list length and item counts; rebuilding
		// on every push during a fast execution would be expensive. The throttle
		// batches updates; consumers (label rendering, item counters) only invalidate
		// when their specific id slot changes, gated by `isEqual` per node.
		const executionRunDataOutputMapByNodeId = shallowReactive(
			new Map<string, ExecutionOutputMap>(),
		);

		function rebuildExecutionRunDataOutputMap() {
			const runData = executionRunData.value;
			const snapshotNodes = execution.value?.workflowData?.nodes ?? [];
			if (!runData) {
				for (const k of Array.from(executionRunDataOutputMapByNodeId.keys())) {
					executionRunDataOutputMapByNodeId.delete(k);
				}
				return;
			}

			const nameToId = new Map(snapshotNodes.map((n) => [n.name, n.id]));
			const next = new Map<string, ExecutionOutputMap>();

			for (const nodeName of Object.keys(runData)) {
				const nodeId = nameToId.get(nodeName);
				if (!nodeId) continue;

				const agg: ExecutionOutputMap = {};
				const taskList = runData[nodeName] ?? [];

				for (const runIteration of taskList) {
					const data = runIteration.data ?? {};
					for (const connectionType of Object.keys(data)) {
						const connectionTypeData = data[connectionType] ?? {};
						agg[connectionType] = agg[connectionType] ?? {};

						for (const outputIndex of Object.keys(connectionTypeData)) {
							const parsedOutputIndex = parseInt(outputIndex, 10);
							const items = connectionTypeData[parsedOutputIndex] ?? [];

							agg[connectionType][outputIndex] = agg[connectionType][outputIndex] ?? {
								total: 0,
								iterations: 0,
								...(connectionType !== NodeConnectionTypes.Main ? { byTarget: {} } : {}),
							};

							// Non-main connections (AI tools/memory/embeddings) wrap items
							// in a `response` array; the apparent itemCount is the length
							// of that array, not the outer items list. Check only the first
							// item assuming uniform structure.
							let itemCount = items.length;
							if (connectionType !== NodeConnectionTypes.Main && items.length > 0) {
								const first = items[0];
								if (
									first?.json &&
									typeof first.json === 'object' &&
									'response' in first.json &&
									Array.isArray((first.json as { response: unknown[] }).response)
								) {
									itemCount = (first.json as { response: unknown[] }).response.length;
								}
							}

							if (runIteration.executionStatus !== 'canceled') {
								agg[connectionType][outputIndex].iterations += 1;
							}
							agg[connectionType][outputIndex].total += itemCount;

							if (connectionType !== NodeConnectionTypes.Main) {
								const callingNodeName = runIteration.source?.[0]?.previousNode;
								if (callingNodeName) {
									const targetId = nameToId.get(callingNodeName);
									if (targetId) {
										const entry = agg[connectionType][outputIndex];
										entry.byTarget = entry.byTarget ?? {};
										entry.byTarget[targetId] = entry.byTarget[targetId] ?? {
											total: 0,
											iterations: 0,
										};
										if (runIteration.executionStatus !== 'canceled') {
											entry.byTarget[targetId].iterations += 1;
										}
										entry.byTarget[targetId].total += itemCount;
									}
								}
							}
						}
					}
				}
				next.set(nodeId, agg);
			}

			// Reconcile to the shallowReactive map for per-id reactivity. isEqual
			// skips structurally-identical slots so downstream consumers don't
			// invalidate when their node's aggregation hasn't actually changed.
			for (const oldId of Array.from(executionRunDataOutputMapByNodeId.keys())) {
				if (!next.has(oldId)) executionRunDataOutputMapByNodeId.delete(oldId);
			}
			for (const [nodeId, value] of next.entries()) {
				const existing = executionRunDataOutputMapByNodeId.get(nodeId);
				if (!existing || !isEqual(existing, value)) {
					executionRunDataOutputMapByNodeId.set(nodeId, value);
				}
			}
		}

		throttledWatch(executionResultDataLastUpdate, rebuildExecutionRunDataOutputMap, {
			throttle: CANVAS_EXECUTION_DATA_THROTTLE_DURATION,
			immediate: true,
		});

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

		/**
		 * Returns a shallow snapshot of the current execution as a mutable
		 * `IExecutionResponse`. Use this when you need to build an updated
		 * execution to pass back to `setExecution()` — mutating top-level
		 * fields on the snapshot does not affect store state. For reactive
		 * reads, use `execution` instead.
		 */
		function getExecutionSnapshot(): IExecutionResponse | null {
			return execution.value === null ? null : { ...execution.value };
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
			if (execution.value) {
				execution.value = { ...execution.value };
			}
			fireChange(CHANGE_ACTION.UPDATE, nodeName);
		}

		function updateNodeExecutionRunData(pushData: PushPayload<'nodeExecuteAfterData'>) {
			const tasksData = execution.value?.data?.resultData.runData[pushData.nodeName];
			const existingRunIndex =
				tasksData?.findIndex((item) => item.executionIndex === pushData.data.executionIndex) ?? -1;

			if (tasksData?.[existingRunIndex]) {
				tasksData.splice(existingRunIndex, 1, pushData.data);
				executionResultDataLastUpdate.value = Date.now();
				if (execution.value) {
					execution.value = { ...execution.value };
				}
				fireChange(CHANGE_ACTION.UPDATE, pushData.nodeName);
			}
		}

		function clearNodeExecutionData(nodeName: string) {
			if (!execution.value?.data) return;
			const { [nodeName]: _removed, ...remaining } = execution.value.data.resultData.runData;
			execution.value.data.resultData.runData = remaining;
			executionResultDataLastUpdate.value = Date.now();
			if (execution.value) {
				execution.value = { ...execution.value };
			}
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

			if (execution.value) {
				execution.value = { ...execution.value };
			}
			fireChange(CHANGE_ACTION.UPDATE);
		}

		function markAsStopped(stopData?: {
			status: ExecutionStatus;
			startedAt: Date;
			stoppedAt: Date;
		}) {
			if (!execution.value?.data) return;
			const runData = execution.value.data.resultData.runData;
			for (const nodeName in runData) {
				runData[nodeName] = runData[nodeName].filter(
					({ executionStatus }) => executionStatus === 'success',
				);
			}
			if (stopData) {
				execution.value.status = stopData.status;
				execution.value.startedAt = stopData.startedAt;
				execution.value.stoppedAt = stopData.stoppedAt;
			}
			executionResultDataLastUpdate.value = Date.now();
			if (execution.value) {
				execution.value = { ...execution.value };
			}
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
			executionIssuesByNodeName,
			executionStatusByNodeId,
			executionRunDataByNodeId,
			executionWaitingByNodeId,
			executionRunDataOutputMapByNodeId,
			executionStartedData: readonly(executionStartedData),
			executionPairedItemMappings: readonly(executionPairedItemMappings),
			getExecutionRunDataByNodeName,
			getExecutionSnapshot,
			// Write API
			setExecution,
			setExecutionRunData,
			addNodeExecutionStartedData,
			clearExecutionStartedData,
			updateNodeExecutionStatus,
			updateNodeExecutionRunData,
			clearNodeExecutionData,
			renameExecutionDataNode,
			markAsStopped,
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
