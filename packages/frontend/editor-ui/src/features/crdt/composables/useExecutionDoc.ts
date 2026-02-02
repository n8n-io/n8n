/**
 * CRDT Execution Document Composable
 *
 * Provides access to execution state from a CRDT document synced from the Coordinator.
 * The Coordinator receives push events and updates the execution document.
 * This composable provides read-only access for UI components.
 *
 * Data Flow:
 * 1. Server sends push events (executionStarted, nodeExecuteAfter, etc.)
 * 2. Coordinator receives push events via WebSocket
 * 3. Coordinator updates execution CRDT document
 * 4. Tabs receive sync updates via MessagePort
 * 5. Components use this composable to read execution state
 */

import { computed, onScopeDispose, ref, type ComputedRef, type Ref } from 'vue';
import { createEventHook } from '@vueuse/core';
import type { CRDTDoc, CRDTMap, CRDTArray } from '@n8n/crdt';
import { toJSON, isMapChange } from '@n8n/crdt';
import type { ITaskData, ExecutionStatus } from 'n8n-workflow';
import { useCRDTSync } from './useCRDTSync';
import type {
	ExecutionDocument,
	ExecutionDocumentState,
	ExecutionMeta,
	EdgeExecutionState,
	NodeExecutionChange,
	EdgeExecutionChange,
	ExecutionMetaChange,
	ResolvedValue,
	ResolvedParamChange,
} from '../types/executionDocument.types';
import { resolvedParamKey, parseResolvedParamKey } from '../types/executionDocument.types';

// Type aliases for cleaner code
type TaskDataMap = CRDTMap<unknown>;
type TaskDataArray = CRDTArray<TaskDataMap>;
type EdgeMap = CRDTMap<unknown>;

export interface UseExecutionDocOptions {
	/** Workflow ID (execution doc has same ID) */
	workflowId: string;
	/** Auto-connect on creation. Default: true */
	immediate?: boolean;
}

/**
 * Create an execution document interface for reading execution state.
 *
 * The execution document is managed by the Coordinator SharedWorker.
 * This composable provides read-only access for UI components.
 *
 * @example
 * ```ts
 * const executionDoc = useExecutionDoc({ workflowId: 'workflow-123' });
 *
 * // Wait for ready
 * await executionDoc.connect();
 *
 * // Get execution metadata
 * const meta = executionDoc.getMeta();
 *
 * // Get node execution data by ID
 * const nodeData = executionDoc.getNodeExecutionById('node-1');
 *
 * // Subscribe to changes
 * executionDoc.onNodeExecutionChange(({ nodeId, status }) => {
 *   console.log(`Node ${nodeId} status: ${status}`);
 * });
 * ```
 */
export function useExecutionDoc(options: UseExecutionDocOptions): ExecutionDocument {
	const { workflowId, immediate = true } = options;

	// Execution doc ID follows convention: `exec-{workflowId}`
	const executionDocId = `exec-${workflowId}`;

	// Use CRDT sync with coordinator transport (execution docs are coordinator-managed)
	const crdt = useCRDTSync({
		docId: executionDocId,
		immediate,
		transport: 'coordinator',
	});

	// Map CRDT state to ExecutionDocumentState
	const state: Ref<ExecutionDocumentState> = computed(() => {
		const s = crdt.state.value;
		if (s === 'disconnected') return 'idle';
		if (s === 'ready') return 'ready';
		if (s === 'error') return 'error';
		return 'connecting';
	}) as Ref<ExecutionDocumentState>;

	const isReady: ComputedRef<boolean> = computed(() => state.value === 'ready');
	const error = ref<string | null>(null);

	// CRDT doc reference (not reactive)
	let doc: CRDTDoc | null = null;

	// Event hooks (VueUse pattern - auto-cleanup on scope dispose)
	const executionStartedHook = createEventHook<{ executionId: string }>();
	const metaChangeHook = createEventHook<ExecutionMetaChange>();
	const nodeExecutionChangeHook = createEventHook<NodeExecutionChange>();
	const edgeExecutionChangeHook = createEventHook<EdgeExecutionChange>();
	const resolvedParamChangeHook = createEventHook<ResolvedParamChange>();

	// Track current execution ID to detect new executions
	let currentExecutionId: string | null = null;

	// Cleanup subscriptions
	let unsubscribeMeta: (() => void) | null = null;
	let unsubscribeRunData: (() => void) | null = null;
	let unsubscribeEdges: (() => void) | null = null;
	let unsubscribeResolvedParams: (() => void) | null = null;

	// Handle CRDT document ready
	crdt.onReady((crdtDoc) => {
		doc = crdtDoc;
		setupChangeSubscriptions();
	});

	crdt.onError((err) => {
		error.value = err.message;
	});

	/**
	 * Set up change subscriptions for the execution document maps.
	 */
	function setupChangeSubscriptions(): void {
		if (!doc) return;

		// Subscribe to meta changes
		const metaMap = doc.getMap<unknown>('meta');
		unsubscribeMeta = metaMap.onDeepChange((changes, _origin) => {
			// Fire events for all origins (coordinator writes are remote from tab perspective)
			for (const change of changes) {
				if (!isMapChange(change)) continue;

				const [key] = change.path;

				// Detect new execution by checking executionId change
				if (key === 'executionId') {
					const newExecutionId = change.value as string;
					if (newExecutionId && newExecutionId !== currentExecutionId) {
						currentExecutionId = newExecutionId;
						void executionStartedHook.trigger({ executionId: newExecutionId });
					}
				}

				if (key === 'status') {
					const executionId = metaMap.get('executionId') as string | undefined;
					const status = change.value as ExecutionStatus;
					if (executionId) {
						void metaChangeHook.trigger({ executionId, status });
					}
				}
			}
		});

		// Subscribe to runData changes (node execution updates)
		const runDataMap = doc.getMap<unknown>('runData');
		unsubscribeRunData = runDataMap.onDeepChange((changes, _origin) => {
			const nodeIndex = doc?.getMap<unknown>('nodeIndex');
			if (!nodeIndex) return;

			for (const change of changes) {
				if (!isMapChange(change)) continue;

				const [nodeName, ...rest] = change.path;
				if (typeof nodeName !== 'string') continue;

				// Find nodeId from nodeIndex (reverse lookup)
				let nodeId: string | null = null;
				for (const [id, name] of nodeIndex.entries()) {
					if (name === nodeName) {
						nodeId = id;
						break;
					}
				}

				if (!nodeId) continue;

				// Get run index from path or default to latest
				let runIndex = 0;
				if (rest.length > 0 && typeof rest[0] === 'number') {
					runIndex = rest[0];
				} else {
					// For add/delete on nodeName, get the latest run index
					const nodeRuns = runDataMap.get(nodeName) as TaskDataArray | undefined;
					if (nodeRuns) {
						runIndex = Math.max(0, nodeRuns.length - 1);
					}
				}

				// Determine status from the run data
				let status: ExecutionStatus | 'running' | 'idle' = 'idle';
				const nodeRuns = runDataMap.get(nodeName) as TaskDataArray | undefined;
				if (nodeRuns && runIndex < nodeRuns.length) {
					const run = nodeRuns.get(runIndex) as TaskDataMap | undefined;
					if (run) {
						status = (run.get('executionStatus') as ExecutionStatus | 'running') ?? 'running';
					}
				}

				void nodeExecutionChangeHook.trigger({
					nodeId,
					nodeName,
					status,
					runIndex,
				});
			}
		});

		// Subscribe to edge changes (item counts)
		const edgesMap = doc.getMap<unknown>('edges');
		unsubscribeEdges = edgesMap.onDeepChange((changes, _origin) => {
			for (const change of changes) {
				if (!isMapChange(change)) continue;

				const [edgeId] = change.path;
				if (typeof edgeId !== 'string') continue;

				const edgeExec = edgesMap.get(edgeId) as EdgeMap | undefined;
				if (edgeExec) {
					void edgeExecutionChangeHook.trigger({
						edgeId,
						totalItems: (edgeExec.get('totalItems') as number) ?? 0,
						iterations: (edgeExec.get('iterations') as number) ?? 0,
					});
				}
			}
		});

		// Subscribe to resolved params changes
		const resolvedParamsMap = doc.getMap<unknown>('resolvedParams');
		unsubscribeResolvedParams = resolvedParamsMap.onDeepChange((changes, _origin) => {
			console.log('[useExecutionDoc] resolvedParams changed, changes:', changes.length);
			for (const change of changes) {
				console.log('[useExecutionDoc] change:', change);
				if (!isMapChange(change)) continue;

				// Key format: "{nodeId}:{paramPath}"
				const key = change.path[0];
				if (typeof key !== 'string') continue;

				const parsed = parseResolvedParamKey(key);
				console.log('[useExecutionDoc] parsed key:', parsed);
				if (parsed) {
					void resolvedParamChangeHook.trigger({
						nodeId: parsed.nodeId,
						paramPath: parsed.paramPath,
					});
				}
			}
		});
	}

	// --- Data Access ---

	function getMeta(): ExecutionMeta | null {
		if (!doc) return null;
		const meta = doc.getMap<unknown>('meta');
		const executionId = meta.get('executionId') as string | undefined;
		if (!executionId) return null;

		return {
			executionId,
			workflowId: meta.get('workflowId') as string,
			status: meta.get('status') as ExecutionStatus,
			mode: meta.get('mode') as ExecutionMeta['mode'],
			startedAt: meta.get('startedAt') as number,
			finishedAt: meta.get('finishedAt') as number | undefined,
		};
	}

	function getNodeExecutionByName(nodeName: string): ITaskData[] | null {
		if (!doc) return null;
		const runData = doc.getMap<unknown>('runData');
		const nodeRuns = runData.get(nodeName) as TaskDataArray | undefined;
		if (!nodeRuns) return null;

		const result: ITaskData[] = [];
		for (let i = 0; i < nodeRuns.length; i++) {
			const crdtTask = nodeRuns.get(i) as TaskDataMap | undefined;
			if (crdtTask) {
				result.push(toJSON(crdtTask) as ITaskData);
			}
		}
		return result.length > 0 ? result : null;
	}

	function getNodeExecutionById(nodeId: string): ITaskData[] | null {
		if (!doc) return null;
		const nodeIndex = doc.getMap<unknown>('nodeIndex');
		const nodeName = nodeIndex.get(nodeId) as string | undefined;
		if (!nodeName) return null;
		return getNodeExecutionByName(nodeName);
	}

	function getEdgeExecution(edgeId: string): EdgeExecutionState | null {
		if (!doc) return null;
		const edges = doc.getMap<unknown>('edges');
		const edgeExec = edges.get(edgeId) as EdgeMap | undefined;
		if (!edgeExec) return null;

		return {
			edgeId: edgeExec.get('edgeId') as string,
			sourceNodeName: edgeExec.get('sourceNodeName') as string,
			targetNodeName: edgeExec.get('targetNodeName') as string | undefined,
			connectionType: edgeExec.get('connectionType') as string,
			outputIndex: edgeExec.get('outputIndex') as number,
			totalItems: edgeExec.get('totalItems') as number,
			iterations: edgeExec.get('iterations') as number,
		};
	}

	function getCallingNodes(nodeName: string): string[] {
		const nodeRuns = getNodeExecutionByName(nodeName);
		if (!nodeRuns) return [];

		const callers = new Set<string>();
		for (const run of nodeRuns) {
			for (const source of run.source ?? []) {
				if (source?.previousNode) {
					callers.add(source.previousNode);
				}
			}
		}
		return Array.from(callers);
	}

	function getNodeNameById(nodeId: string): string | null {
		if (!doc) return null;
		const nodeIndex = doc.getMap<unknown>('nodeIndex');
		const nodeName = nodeIndex.get(nodeId) as string | undefined;
		return nodeName ?? null;
	}

	// --- Resolved Params ---

	/**
	 * Get a resolved value for a specific parameter path.
	 * @param nodeId - The node ID
	 * @param paramPath - The parameter path (e.g., "parameters.value")
	 */
	function getResolvedParam(nodeId: string, paramPath: string): ResolvedValue | null {
		if (!doc) return null;
		const resolvedParamsMap = doc.getMap<unknown>('resolvedParams');
		const key = resolvedParamKey(nodeId, paramPath);
		const value = resolvedParamsMap.get(key);
		if (!value) return null;
		return toJSON(value) as ResolvedValue;
	}

	/**
	 * Get all resolved values for a node.
	 * Returns a Map of paramPath → ResolvedValue
	 */
	function getAllResolvedParams(nodeId: string): Map<string, ResolvedValue> {
		const result = new Map<string, ResolvedValue>();
		if (!doc) return result;

		const resolvedParamsMap = doc.getMap<unknown>('resolvedParams');
		const prefix = `${nodeId}:`;

		for (const [key, value] of resolvedParamsMap.entries()) {
			if (key.startsWith(prefix)) {
				const paramPath = key.slice(prefix.length);
				result.set(paramPath, toJSON(value) as ResolvedValue);
			}
		}

		return result;
	}

	// --- Lifecycle ---

	async function connect(): Promise<void> {
		await crdt.connect();
	}

	function disconnect(): void {
		unsubscribeMeta?.();
		unsubscribeMeta = null;
		unsubscribeRunData?.();
		unsubscribeRunData = null;
		unsubscribeEdges?.();
		unsubscribeEdges = null;
		unsubscribeResolvedParams?.();
		unsubscribeResolvedParams = null;
		crdt.disconnect();
		doc = null;
	}

	// Auto-cleanup on scope dispose
	onScopeDispose(() => {
		disconnect();
	});

	return {
		workflowId,
		state,
		error,
		isReady,
		connect,
		disconnect,
		getMeta,
		getNodeExecutionByName,
		getNodeExecutionById,
		getEdgeExecution,
		getCallingNodes,
		getNodeNameById,
		getResolvedParam,
		getAllResolvedParams,
		onExecutionStarted: executionStartedHook.on,
		onMetaChange: metaChangeHook.on,
		onNodeExecutionChange: nodeExecutionChangeHook.on,
		onEdgeExecutionChange: edgeExecutionChangeHook.on,
		onResolvedParamChange: resolvedParamChangeHook.on,
	};
}
