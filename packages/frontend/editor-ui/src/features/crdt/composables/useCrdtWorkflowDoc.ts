import { computed, onScopeDispose } from 'vue';
import { createEventHook } from '@vueuse/core';
import type {
	CRDTDoc,
	CRDTMap,
	DeepChange,
	ChangeOrigin,
	CRDTAwareness,
	TransactionBatch,
} from '@n8n/crdt';
import { isMapChange, ChangeOrigin as CO, seedValueDeep, toJSON, setNestedValue } from '@n8n/crdt';
import { useCRDTSync, type CRDTTransportType } from './useCRDTSync';
import type { INodeExecutionData } from 'n8n-workflow';
import type {
	WorkflowDocument,
	WorkflowNode,
	WorkflowEdge,
	NodePositionChange,
	NodeParamsChange,
	NodeHandlesChange,
	NodeSizeChange,
	NodeSubtitleChange,
	NodeDisabledChange,
	NodeNameChange,
	ComputedHandle,
	PinnedDataChange,
} from '../types/workflowDocument.types';
import type { WorkflowAwarenessState } from '../types/awareness.types';

export interface UseCrdtWorkflowDocOptions {
	/** Document/workflow ID */
	docId: string;
	/** Auto-connect on creation. Default: true */
	immediate?: boolean;
	/**
	 * Transport type for syncing. Default: 'worker'
	 * - 'worker': Uses SharedWorker for cross-tab sync + server connection
	 * - 'websocket': Direct WebSocket connection to server (no cross-tab sync)
	 * - 'coordinator': Uses Database Coordinator SharedWorker (Worker Mode - local only)
	 */
	transport?: CRDTTransportType;
}

/**
 * CRDT-backed workflow document implementation.
 *
 * Provides raw workflow data from a CRDT document with real-time sync.
 * Implements WorkflowDocument interface - no Vue Flow types here.
 *
 * @example
 * ```ts
 * const doc = useCrdtWorkflowDoc({ docId: 'workflow-123' });
 *
 * // Wait for ready
 * await doc.connect();
 *
 * // Read nodes
 * const nodes = doc.getNodes();
 *
 * // Update position (syncs to other users)
 * doc.updateNodePosition('node-1', [100, 200]);
 * ```
 */
export function useCrdtWorkflowDoc(options: UseCrdtWorkflowDocOptions): WorkflowDocument {
	const { docId, immediate = true, transport = 'worker' } = options;

	// Generate unique instance ID for this view (for Vue Flow and awareness)
	const instanceId = crypto.randomUUID();

	// Use existing CRDT sync composable
	const crdt = useCRDTSync({ docId, immediate, transport });

	// Map CRDT state to WorkflowDocumentState (disconnected → idle)
	const state = computed(() => (crdt.state.value === 'disconnected' ? 'idle' : crdt.state.value));
	const isReady = computed(() => state.value === 'ready');

	// CRDT doc reference (not reactive - it's a class instance)
	let doc: CRDTDoc | null = null;

	// Event hooks for remote changes (VueUse pattern - auto-cleanup on scope dispose)
	const nodeAddedHook = createEventHook<WorkflowNode>();
	const nodeRemovedHook = createEventHook<string>();
	const nodePositionHook = createEventHook<NodePositionChange>();
	const nodeParamsHook = createEventHook<NodeParamsChange>();
	const nodeHandlesHook = createEventHook<NodeHandlesChange>();
	const nodeSizeHook = createEventHook<NodeSizeChange>();
	const nodeSubtitleHook = createEventHook<NodeSubtitleChange>();
	const nodeDisabledHook = createEventHook<NodeDisabledChange>();
	const nodeNameHook = createEventHook<NodeNameChange>();
	const edgeAddedHook = createEventHook<WorkflowEdge>();
	const edgeRemovedHook = createEventHook<string>();
	const edgesChangedHook = createEventHook<undefined>(); // Fires for ALL edge changes (any origin)
	const pinnedDataHook = createEventHook<PinnedDataChange>();

	// Cleanup function for transaction batch subscription
	let unsubscribeTransactionBatch: (() => void) | null = null;
	// Cleanup function for pinned data subscription
	let unsubscribePinnedData: (() => void) | null = null;

	// --- Helpers ---

	function getCrdtNode(nodeId: string): CRDTMap<unknown> | undefined {
		if (!doc) return undefined;
		return doc.getMap('nodes').get(nodeId) as CRDTMap<unknown> | undefined;
	}

	function crdtEdgeToWorkflowEdge(id: string, crdtEdge: CRDTMap<unknown>): WorkflowEdge {
		return {
			id,
			source: crdtEdge.get('source') as string,
			target: crdtEdge.get('target') as string,
			sourceHandle: crdtEdge.get('sourceHandle') as string,
			targetHandle: crdtEdge.get('targetHandle') as string,
		};
	}

	function crdtNodeToWorkflowNode(id: string, crdtNode: CRDTMap<unknown>): WorkflowNode {
		const position = crdtNode.get('position') as [number, number] | undefined;
		const name = crdtNode.get('name') as string | undefined;
		const type = crdtNode.get('type') as string | undefined;
		const typeVersion = crdtNode.get('typeVersion') as number | undefined;
		// Parameters are stored as deep CRDT structures, convert to plain object
		const rawParams = crdtNode.get('parameters');
		const parameters = (toJSON(rawParams) as Record<string, unknown>) ?? {};
		// Handles are stored as CRDT arrays, convert to plain arrays
		const rawInputs = crdtNode.get('inputs');
		const rawOutputs = crdtNode.get('outputs');
		const inputs = rawInputs ? (toJSON(rawInputs) as ComputedHandle[]) : undefined;
		const outputs = rawOutputs ? (toJSON(rawOutputs) as ComputedHandle[]) : undefined;
		// Size is stored as [width, height] tuple
		const rawSize = crdtNode.get('size');
		const size = rawSize ? (toJSON(rawSize) as [number, number]) : undefined;
		// Subtitle is server-computed
		const subtitle = crdtNode.get('subtitle') as string | undefined;
		// Disabled state
		const disabled = crdtNode.get('disabled') as boolean | undefined;
		// Node settings (top-level properties)
		const alwaysOutputData = crdtNode.get('alwaysOutputData') as boolean | undefined;
		const executeOnce = crdtNode.get('executeOnce') as boolean | undefined;
		const retryOnFail = crdtNode.get('retryOnFail') as boolean | undefined;
		const maxTries = crdtNode.get('maxTries') as number | undefined;
		const waitBetweenTries = crdtNode.get('waitBetweenTries') as number | undefined;
		const onError = crdtNode.get('onError') as string | undefined;
		const notes = crdtNode.get('notes') as string | undefined;
		const notesInFlow = crdtNode.get('notesInFlow') as boolean | undefined;
		const color = crdtNode.get('color') as string | undefined;

		return {
			id,
			position: position ?? [0, 0],
			name: name ?? id,
			type: type ?? 'unknown',
			typeVersion: typeVersion ?? 1,
			parameters,
			inputs,
			outputs,
			size,
			subtitle,
			disabled,
			alwaysOutputData,
			executeOnce,
			retryOnFail,
			maxTries,
			waitBetweenTries,
			onError,
			notes,
			notesInFlow,
			color,
		};
	}

	// --- Change Handling ---

	/**
	 * Check if origin requires UI update.
	 * - remote: changes from other users → need UI update
	 * - undoRedo: local undo/redo → need UI update (CRDT changed but Vue Flow didn't)
	 * - local: normal local changes → Vue Flow already updated, skip
	 */
	function needsUIUpdate(origin: ChangeOrigin): boolean {
		return origin === CO.remote || origin === CO.undoRedo;
	}

	function handleChanges(changes: DeepChange[], origin: ChangeOrigin): void {
		if (!doc) return;

		const nodesMap = doc.getMap('nodes');

		for (const change of changes) {
			if (!isMapChange(change)) continue;

			const [nodeId, ...rest] = change.path;
			if (typeof nodeId !== 'string') continue;

			if (rest.length === 0) {
				// Top-level node change (add/delete entire node)
				if (change.action === 'add') {
					// Add: trigger for both local + remote + undoRedo (all need Vue Flow update)
					const crdtNode = nodesMap.get(nodeId) as CRDTMap<unknown> | undefined;
					if (crdtNode) {
						const node = crdtNodeToWorkflowNode(nodeId, crdtNode);
						void nodeAddedHook.trigger(node);
					}
				} else if (change.action === 'delete' && needsUIUpdate(origin)) {
					// Delete: remote/undoRedo (local already removed from Vue Flow)
					void nodeRemovedHook.trigger(nodeId);
				}
			} else {
				// Nested property changes
				const prop = rest[0];

				// Handle and size changes are ALWAYS server-computed,
				// so they should ALWAYS trigger UI update regardless of origin.
				// Even local parameter changes result in server-computed handle/size updates.
				if (prop === 'inputs' || prop === 'outputs') {
					const crdtNode = nodesMap.get(nodeId) as CRDTMap<unknown> | undefined;
					if (crdtNode) {
						const rawInputs = crdtNode.get('inputs');
						const rawOutputs = crdtNode.get('outputs');
						const inputs = rawInputs ? (toJSON(rawInputs) as ComputedHandle[]) : [];
						const outputs = rawOutputs ? (toJSON(rawOutputs) as ComputedHandle[]) : [];
						void nodeHandlesHook.trigger({ nodeId, inputs, outputs });
					}
				} else if (prop === 'size') {
					// Size is server-computed based on handles, always trigger UI update
					const crdtNode = nodesMap.get(nodeId) as CRDTMap<unknown> | undefined;
					if (crdtNode) {
						const rawSize = crdtNode.get('size');
						const size: [number, number] = rawSize
							? (toJSON(rawSize) as [number, number])
							: [96, 96];
						void nodeSizeHook.trigger({ nodeId, size });
					}
				} else if (prop === 'subtitle') {
					// Subtitle is server-computed, always trigger UI update
					const crdtNode = nodesMap.get(nodeId) as CRDTMap<unknown> | undefined;
					if (crdtNode) {
						const subtitle = crdtNode.get('subtitle') as string | undefined;
						void nodeSubtitleHook.trigger({ nodeId, subtitle });
					}
				} else if (prop === 'disabled') {
					// Disabled state changed - trigger for all origins (local changes need UI update too)
					const crdtNode = nodesMap.get(nodeId) as CRDTMap<unknown> | undefined;
					if (crdtNode) {
						const disabled = (crdtNode.get('disabled') as boolean) ?? false;
						void nodeDisabledHook.trigger({ nodeId, disabled });
					}
				} else if (prop === 'name') {
					// Name changed - trigger for all origins (local changes need UI update too for canvas label)
					const crdtNode = nodesMap.get(nodeId) as CRDTMap<unknown> | undefined;
					if (crdtNode) {
						const name = crdtNode.get('name') as string;
						void nodeNameHook.trigger({ nodeId, name });
					}
				} else if (needsUIUpdate(origin)) {
					// Other property changes: only update UI for remote/undoRedo
					// Local changes are already reflected in Vue Flow
					if (prop === 'position' && Array.isArray(change.value)) {
						const position = change.value as [number, number];
						void nodePositionHook.trigger({ nodeId, position });
					} else if (prop === 'parameters' && typeof change.value === 'object') {
						const params = change.value as Record<string, unknown>;
						void nodeParamsHook.trigger({ nodeId, params });
					}
				}
			}
		}
	}

	/**
	 * Handle edge changes from CRDT.
	 */
	function handleEdgeChanges(changes: DeepChange[], origin: ChangeOrigin): void {
		if (!doc) return;

		const edgesMap = doc.getMap('edges');
		let hasEdgeChange = false;

		for (const change of changes) {
			if (!isMapChange(change)) continue;

			const [edgeId, ...rest] = change.path;
			if (typeof edgeId !== 'string') continue;

			// Only handle top-level edge changes (add/delete)
			if (rest.length === 0) {
				hasEdgeChange = true;

				if (change.action === 'add') {
					// Add: trigger for ALL origins (local, remote, undoRedo)
					// Unlike onConnect which adds edges to Vue Flow directly,
					// addNodesAndEdges() adds edges only to CRDT, so Vue Flow needs the event
					const crdtEdge = edgesMap.get(edgeId) as CRDTMap<unknown> | undefined;
					if (crdtEdge) {
						const edge = crdtEdgeToWorkflowEdge(edgeId, crdtEdge);
						void edgeAddedHook.trigger(edge);
					}
				} else if (change.action === 'delete' && needsUIUpdate(origin)) {
					// Delete: remote/undoRedo only (local delete already handled by Vue Flow)
					void edgeRemovedHook.trigger(edgeId);
				}
			}
			// Edge properties don't change after creation - edges are immutable
		}

		// Fire general edges changed hook for ALL origins (for reactivity like handle connectivity)
		if (hasEdgeChange) {
			void edgesChangedHook.trigger(undefined);
		}
	}

	// Handle CRDT document ready
	crdt.onReady((crdtDoc) => {
		doc = crdtDoc;

		// Subscribe to batched changes from both nodes and edges maps.
		// This fires once per transaction with all changes batched together,
		// ensuring nodes are processed before edges (avoiding "source or target missing" errors).
		unsubscribeTransactionBatch = doc.onTransactionBatch(
			['nodes', 'edges'],
			(batch: TransactionBatch) => {
				const nodeChanges = batch.changes.get('nodes') ?? [];
				const edgeChanges = batch.changes.get('edges') ?? [];

				// Process nodes first, then edges - all from the same transaction
				if (nodeChanges.length > 0) {
					handleChanges(nodeChanges, batch.origin);
				}
				if (edgeChanges.length > 0) {
					handleEdgeChanges(edgeChanges, batch.origin);
				}
			},
		);

		// Subscribe to pinned data changes
		const pinnedDataMap = doc.getMap('pinnedData');
		unsubscribePinnedData = pinnedDataMap.onDeepChange((changes, origin) => {
			// Only fire events for remote/undoRedo changes (local already applied)
			if (!needsUIUpdate(origin)) return;

			for (const change of changes) {
				if (!isMapChange(change)) continue;

				const [nodeId] = change.path;
				if (typeof nodeId !== 'string') continue;

				// Only handle top-level changes (add/update/delete pinned data for a node)
				if (change.path.length === 1) {
					if (change.action === 'delete') {
						void pinnedDataHook.trigger({ nodeId, data: undefined });
					} else {
						// Add or update
						const value = pinnedDataMap.get(nodeId);
						const data = value ? (toJSON(value) as INodeExecutionData[]) : undefined;
						void pinnedDataHook.trigger({ nodeId, data });
					}
				}
			}
		});
	});

	// --- Data Access ---

	function getNodes(): WorkflowNode[] {
		if (!doc) return [];

		const nodesMap = doc.getMap('nodes');
		const nodes: WorkflowNode[] = [];

		for (const [id, value] of nodesMap.entries()) {
			if (value && typeof value === 'object') {
				nodes.push(crdtNodeToWorkflowNode(id, value as CRDTMap<unknown>));
			}
		}

		return nodes;
	}

	function getEdges(): WorkflowEdge[] {
		if (!doc) return [];

		const edgesMap = doc.getMap('edges');
		const edges: WorkflowEdge[] = [];

		for (const [id, value] of edgesMap.entries()) {
			if (value && typeof value === 'object') {
				edges.push(crdtEdgeToWorkflowEdge(id, value as CRDTMap<unknown>));
			}
		}

		return edges;
	}

	// --- Mutations ---

	function addNode(node: WorkflowNode): void {
		if (!doc) return;

		doc.transact(() => {
			const nodesMap = doc!.getMap('nodes');
			const crdtNode = doc!.createMap();
			crdtNode.set('id', node.id);
			crdtNode.set('position', node.position);
			crdtNode.set('name', node.name);
			crdtNode.set('type', node.type);
			crdtNode.set('typeVersion', node.typeVersion);
			// Deep seed parameters for fine-grained conflict resolution
			crdtNode.set('parameters', seedValueDeep(doc!, node.parameters));
			if (node.disabled !== undefined) {
				crdtNode.set('disabled', node.disabled);
			}
			nodesMap.set(node.id, crdtNode);
		});
		// Hook triggers via onDeepChange subscription (handles both local + remote)
	}

	function addNodes(nodes: WorkflowNode[]): void {
		if (!doc || nodes.length === 0) return;

		doc.transact(() => {
			const nodesMap = doc!.getMap('nodes');
			for (const node of nodes) {
				const crdtNode = doc!.createMap();
				crdtNode.set('id', node.id);
				crdtNode.set('position', node.position);
				crdtNode.set('name', node.name);
				crdtNode.set('type', node.type);
				crdtNode.set('typeVersion', node.typeVersion);
				// Deep seed parameters for fine-grained conflict resolution
				crdtNode.set('parameters', seedValueDeep(doc!, node.parameters));
				if (node.disabled !== undefined) {
					crdtNode.set('disabled', node.disabled);
				}
				nodesMap.set(node.id, crdtNode);
			}
		});
	}

	function addNodesAndEdges(nodes: WorkflowNode[], edges: WorkflowEdge[]): void {
		if (!doc) return;
		if (nodes.length === 0 && edges.length === 0) return;

		doc.transact(() => {
			// Add nodes
			if (nodes.length > 0) {
				const nodesMap = doc!.getMap('nodes');
				for (const node of nodes) {
					const crdtNode = doc!.createMap();
					crdtNode.set('id', node.id);
					crdtNode.set('position', node.position);
					crdtNode.set('name', node.name);
					crdtNode.set('type', node.type);
					crdtNode.set('typeVersion', node.typeVersion);
					crdtNode.set('parameters', seedValueDeep(doc!, node.parameters));
					if (node.disabled !== undefined) {
						crdtNode.set('disabled', node.disabled);
					}
					nodesMap.set(node.id, crdtNode);
				}
			}

			// Add edges
			if (edges.length > 0) {
				const edgesMap = doc!.getMap('edges');
				for (const edge of edges) {
					const crdtEdge = doc!.createMap();
					crdtEdge.set('source', edge.source);
					crdtEdge.set('target', edge.target);
					crdtEdge.set('sourceHandle', edge.sourceHandle);
					crdtEdge.set('targetHandle', edge.targetHandle);
					edgesMap.set(edge.id, crdtEdge);
				}
			}
		});
	}

	function removeNode(nodeId: string): void {
		if (!doc) return;

		doc.transact(() => {
			doc?.getMap('nodes').delete(nodeId);
		});
		// No hook trigger - Vue Flow already removed the node before calling this
	}

	/**
	 * Remove multiple nodes and edges in a single atomic transaction.
	 * Also adds any reconnection edges (for node deletion with auto-reconnect).
	 * Removes pinned data for deleted nodes (matches production behavior).
	 */
	function removeNodesAndEdges(
		nodeIds: string[],
		edgeIds: string[],
		reconnections: WorkflowEdge[],
	): void {
		if (!doc) return;
		if (nodeIds.length === 0 && edgeIds.length === 0 && reconnections.length === 0) return;

		doc.transact(() => {
			// Add reconnection edges first (so undo will remove them last)
			if (reconnections.length > 0) {
				const edgesMap = doc!.getMap('edges');
				for (const edge of reconnections) {
					const crdtEdge = doc!.createMap();
					crdtEdge.set('source', edge.source);
					crdtEdge.set('target', edge.target);
					crdtEdge.set('sourceHandle', edge.sourceHandle);
					crdtEdge.set('targetHandle', edge.targetHandle);
					edgesMap.set(edge.id, crdtEdge);
				}
			}

			// Remove old edges
			if (edgeIds.length > 0) {
				const edgesMap = doc!.getMap('edges');
				for (const edgeId of edgeIds) {
					edgesMap.delete(edgeId);
				}
			}

			// Remove nodes and their pinned data
			if (nodeIds.length > 0) {
				const nodesMap = doc!.getMap('nodes');
				const pinnedDataMap = doc!.getMap('pinnedData');
				for (const nodeId of nodeIds) {
					nodesMap.delete(nodeId);
					// Also remove pinned data for this node (matches production behavior)
					pinnedDataMap.delete(nodeId);
				}
			}
		});
	}

	function updateNodePositions(updates: NodePositionChange[]): void {
		if (!doc || updates.length === 0) return;

		doc.transact(() => {
			for (const { nodeId, position } of updates) {
				const crdtNode = getCrdtNode(nodeId);
				if (crdtNode) {
					crdtNode.set('position', position);
				}
			}
		});
	}

	/**
	 * Replace all parameters for a node.
	 * Use updateNodeParamAtPath for fine-grained updates.
	 */
	function updateNodeParams(nodeId: string, params: Record<string, unknown>): void {
		if (!doc) return;

		doc.transact(() => {
			const crdtNode = getCrdtNode(nodeId);
			if (crdtNode) {
				// Deep seed the new parameters for fine-grained conflict resolution
				crdtNode.set('parameters', seedValueDeep(doc!, params));
			}
		});
	}

	/**
	 * Update a specific parameter path within a node's parameters.
	 * This enables fine-grained updates that won't conflict with changes to other parameters.
	 *
	 * @param nodeId - The node ID
	 * @param path - Array of keys to the parameter (e.g., ['operation'] or ['assignments', 'assignments', '0', 'name'])
	 * @param value - The new value (will be deep-seeded if object/array)
	 */
	function updateNodeParamAtPath(nodeId: string, path: string[], value: unknown): void {
		if (!doc || path.length === 0) return;

		doc.transact(() => {
			const crdtNode = getCrdtNode(nodeId);
			if (!crdtNode) return;

			const parametersMap = crdtNode.get('parameters') as CRDTMap<unknown> | undefined;
			if (!parametersMap) return;

			setNestedValue(doc!, parametersMap, path, value);
		});
	}

	/**
	 * Get the raw CRDT parameters map for a node (for advanced use cases).
	 * Returns undefined if node doesn't exist.
	 */
	function getNodeParametersMap(nodeId: string): CRDTMap<unknown> | undefined {
		const crdtNode = getCrdtNode(nodeId);
		if (!crdtNode) return undefined;
		return crdtNode.get('parameters') as CRDTMap<unknown> | undefined;
	}

	/**
	 * Set the disabled state of a node.
	 */
	function setNodeDisabled(nodeId: string, disabled: boolean): void {
		if (!doc) return;

		doc.transact(() => {
			const crdtNode = getCrdtNode(nodeId);
			if (crdtNode) {
				crdtNode.set('disabled', disabled);
			}
		});
	}

	/**
	 * Set a top-level node setting (e.g., alwaysOutputData, executeOnce).
	 * Use for node properties that are NOT in node.parameters.
	 */
	function setNodeSetting(nodeId: string, key: string, value: unknown): void {
		if (!doc) return;

		doc.transact(() => {
			const crdtNode = getCrdtNode(nodeId);
			if (crdtNode) {
				if (value === undefined || value === null) {
					crdtNode.delete(key);
				} else {
					crdtNode.set(key, value);
				}
			}
		});
	}

	/**
	 * Get the raw CRDT map for a node (for subscribing to all changes).
	 * Returns undefined if node doesn't exist.
	 */
	function getNodeCrdtMap(nodeId: string): CRDTMap<unknown> | undefined {
		return getCrdtNode(nodeId);
	}

	// --- Edge Mutations ---

	/**
	 * Add an edge to the workflow.
	 * Edges are stored flat in CRDT, keyed by edge ID.
	 */
	function addEdge(edge: WorkflowEdge): void {
		if (!doc) return;

		doc.transact(() => {
			const edgesMap = doc!.getMap('edges');
			const crdtEdge = doc!.createMap();
			crdtEdge.set('source', edge.source);
			crdtEdge.set('target', edge.target);
			crdtEdge.set('sourceHandle', edge.sourceHandle);
			crdtEdge.set('targetHandle', edge.targetHandle);
			edgesMap.set(edge.id, crdtEdge);
		});
	}

	/**
	 * Remove an edge by ID.
	 */
	function removeEdge(edgeId: string): void {
		if (!doc) return;

		doc.transact(() => {
			doc?.getMap('edges').delete(edgeId);
		});
		// No hook trigger - Vue Flow already removed the edge before calling this
	}

	// --- Pinned Data ---

	/**
	 * Get pinned data for a node by ID.
	 * Returns undefined if node has no pinned data.
	 */
	function getPinnedData(nodeId: string): INodeExecutionData[] | undefined {
		if (!doc) return undefined;
		const pinnedDataMap = doc.getMap('pinnedData');
		const value = pinnedDataMap.get(nodeId);
		if (!value) return undefined;
		return toJSON(value) as INodeExecutionData[];
	}

	/**
	 * Set pinned data for a node by ID.
	 * Stored as plain array (not deep seeded) - pinned data is replaced wholesale, not merged.
	 */
	function setPinnedData(nodeId: string, data: INodeExecutionData[]): void {
		if (!doc) return;

		doc.transact(() => {
			const pinnedDataMap = doc!.getMap('pinnedData');
			pinnedDataMap.set(nodeId, data);
		});

		// Trigger hook for local changes (onDeepChange only fires for remote)
		void pinnedDataHook.trigger({ nodeId, data });
	}

	/**
	 * Remove pinned data for a node by ID.
	 */
	function removePinnedData(nodeId: string): void {
		if (!doc) return;

		doc.transact(() => {
			doc!.getMap('pinnedData').delete(nodeId);
		});

		// Trigger hook for local changes (onDeepChange only fires for remote)
		void pinnedDataHook.trigger({ nodeId, data: undefined });
	}

	// --- Lifecycle ---

	async function connect(): Promise<void> {
		await crdt.connect();
	}

	function disconnect(): void {
		unsubscribeTransactionBatch?.();
		unsubscribeTransactionBatch = null;
		unsubscribePinnedData?.();
		unsubscribePinnedData = null;
		crdt.disconnect();
		doc = null;
	}

	// Auto-cleanup on scope dispose
	onScopeDispose(() => {
		disconnect();
	});

	function findNode(nodeId: string): WorkflowNode | undefined {
		const crdtNode = getCrdtNode(nodeId);
		if (!crdtNode) return undefined;
		return crdtNodeToWorkflowNode(nodeId, crdtNode);
	}

	return {
		workflowId: docId,
		instanceId,
		state,
		error: crdt.error,
		isReady,
		canUndo: crdt.canUndo,
		canRedo: crdt.canRedo,
		undo: crdt.undo,
		redo: crdt.redo,
		connect,
		disconnect,
		getNodes,
		getEdges,
		addNode,
		addNodes,
		addNodesAndEdges,
		removeNode,
		removeNodesAndEdges,
		updateNodePositions,
		updateNodeParams,
		updateNodeParamAtPath,
		setNodeDisabled,
		setNodeSetting,
		getNodeParametersMap,
		getNodeCrdtMap,
		addEdge,
		removeEdge,
		// Pinned data methods
		getPinnedData,
		setPinnedData,
		removePinnedData,
		onNodeAdded: nodeAddedHook.on,
		onNodeRemoved: nodeRemovedHook.on,
		onNodePositionChange: nodePositionHook.on,
		onNodeParamsChange: nodeParamsHook.on,
		onNodeHandlesChange: nodeHandlesHook.on,
		onNodeSizeChange: nodeSizeHook.on,
		onNodeSubtitleChange: nodeSubtitleHook.on,
		onNodeDisabledChange: nodeDisabledHook.on,
		onNodeNameChange: nodeNameHook.on,
		onEdgeAdded: edgeAddedHook.on,
		onEdgeRemoved: edgeRemovedHook.on,
		onEdgesChanged: edgesChangedHook.on,
		onPinnedDataChange: pinnedDataHook.on,
		findNode,
		get awareness(): CRDTAwareness<WorkflowAwarenessState> | null {
			return crdt.awareness as CRDTAwareness<WorkflowAwarenessState> | null;
		},
	};
}
