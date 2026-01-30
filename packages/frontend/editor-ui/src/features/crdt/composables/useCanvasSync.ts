import { nextTick, onScopeDispose } from 'vue';
import type {
	Node,
	Edge,
	VueFlowStore,
	ValidConnectionFunc,
	NodeRemoveChange,
	EdgeRemoveChange,
} from '@vue-flow/core';
import type { WorkflowDocument, WorkflowNode, WorkflowEdge } from '../types/workflowDocument.types';
import { useConnectionValidation, parseHandle } from './useConnectionValidation';
import { useVueFlowChangeBatcher, type ChangeBatch } from './useVueFlowChangeBatcher';

/**
 * Transform WorkflowNode to Vue Flow Node format.
 * Includes id, position, label, and size (width/height) from CRDT.
 */
function toVueFlowNode(node: WorkflowNode): Node {
	const vueFlowNode: Node = {
		id: node.id,
		type: 'crdt-node',
		position: { x: node.position[0], y: node.position[1] },
		data: { label: node.name },
	};

	// Add size if available from CRDT (server-computed)
	if (node.size) {
		vueFlowNode.width = node.size[0];
		vueFlowNode.height = node.size[1];
	}

	return vueFlowNode;
}

/**
 * Transform WorkflowEdge to Vue Flow Edge format.
 * Uses 'crdt-edge' type for custom edge rendering.
 * Connection type is derived from sourceHandle in CrdtEdge component.
 */
function toVueFlowEdge(edge: WorkflowEdge): Edge {
	return {
		id: edge.id,
		type: 'crdt-edge',
		source: edge.source,
		target: edge.target,
		sourceHandle: edge.sourceHandle,
		targetHandle: edge.targetHandle,
	};
}

/**
 * Create a deterministic edge ID from connection info.
 * Format: "[sourceId/sourceHandle][targetId/targetHandle]"
 */
function createEdgeId(
	source: string,
	target: string,
	sourceHandle: string | null | undefined,
	targetHandle: string | null | undefined,
): string {
	return `[${source}/${sourceHandle ?? ''}][${target}/${targetHandle ?? ''}]`;
}

/**
 * Edge data needed for reconnection calculation.
 */
interface EdgeData {
	id: string;
	source: string;
	target: string;
	sourceHandle?: string | null;
	targetHandle?: string | null;
}

/**
 * Calculate reconnection edges when deleting nodes.
 * When deleting a node between two connected nodes (A → B → C), creates edges to reconnect (A → C).
 *
 * IMPORTANT: This processes deletions SEQUENTIALLY to match production behavior.
 * Production code calls deleteNode() in a forEach loop, where reconnection edges
 * created in step N become inputs for step N+1.
 *
 * Algorithm (matches production useCanvasOperations.ts):
 * 1. Process each node deletion ONE AT A TIME
 * 2. For each node: find incoming/outgoing edges, create reconnections
 * 3. ADD reconnection edges to working edge set BEFORE processing next node
 * 4. REMOVE edges connected to deleted node from working set
 * 5. This allows chain deletions: A→B→C→D, delete B,C → creates A→D
 *
 * @param edges - All edges being removed (from Vue Flow change events)
 * @param deletedNodeIds - Set of node IDs being deleted
 * @param existingEdgeIds - Set of existing edge IDs to avoid duplicates (mutated)
 * @returns Array of new edges to create for reconnection
 */
function getReconnectionEdges(
	edges: EdgeData[],
	deletedNodeIds: Set<string>,
	existingEdgeIds: Set<string>,
): WorkflowEdge[] {
	const allReconnectionEdges: WorkflowEdge[] = [];

	// Create a mutable working copy of edges that we update after each deletion
	let workingEdges = [...edges];

	// Process each deletion sequentially (matching production's forEach behavior)
	for (const nodeId of deletedNodeIds) {
		// Find edges going INTO this node (node is target)
		const incomingEdges = workingEdges.filter((edge) => edge.target === nodeId);

		// Find edges going OUT of this node (node is source)
		const outgoingEdges = workingEdges.filter((edge) => edge.source === nodeId);

		// Group incoming edges by (type, index) - collect ALL edges, not just first
		const incomingByTypeAndIndex = new Map<string, EdgeData[]>();
		for (const edge of incomingEdges) {
			const { type, index } = parseHandle(edge.targetHandle);
			const key = `${type}/${index}`;
			if (!incomingByTypeAndIndex.has(key)) {
				incomingByTypeAndIndex.set(key, []);
			}
			incomingByTypeAndIndex.get(key)!.push(edge);
		}

		// Group outgoing edges by (type, index) - collect ALL edges, not just first
		const outgoingByTypeAndIndex = new Map<string, EdgeData[]>();
		for (const edge of outgoingEdges) {
			const { type, index } = parseHandle(edge.sourceHandle);
			const key = `${type}/${index}`;
			if (!outgoingByTypeAndIndex.has(key)) {
				outgoingByTypeAndIndex.set(key, []);
			}
			outgoingByTypeAndIndex.get(key)!.push(edge);
		}

		// Collect reconnection edges for THIS node deletion
		const nodeReconnections: EdgeData[] = [];

		// Only connect input index 0 to output index 0 per type (matching production behavior)
		for (const [inKey, inEdges] of incomingByTypeAndIndex) {
			const [inType, inIndex] = inKey.split('/');
			if (inIndex !== '0') continue; // Only reconnect from input 0

			const outKey = `${inType}/0`; // Match to output 0 of same type
			const outEdges = outgoingByTypeAndIndex.get(outKey);
			if (!outEdges) continue;

			// Create connection for EACH incoming to EACH outgoing (nested loop like production)
			for (const inEdge of inEdges) {
				for (const outEdge of outEdges) {
					const newEdgeId = createEdgeId(
						inEdge.source,
						outEdge.target,
						inEdge.sourceHandle,
						outEdge.targetHandle,
					);

					// Skip if edge already exists
					if (existingEdgeIds.has(newEdgeId)) continue;

					const sourceHandle = inEdge.sourceHandle ?? 'outputs/main/0';
					const targetHandle = outEdge.targetHandle ?? 'inputs/main/0';

					const newEdge: WorkflowEdge = {
						id: newEdgeId,
						source: inEdge.source,
						target: outEdge.target,
						sourceHandle,
						targetHandle,
					};

					// Only add to final results if both endpoints will exist after all deletions
					// (intermediate reconnections are still added to workingEdges for chain processing)
					if (!deletedNodeIds.has(inEdge.source) && !deletedNodeIds.has(outEdge.target)) {
						allReconnectionEdges.push(newEdge);
					}

					// Always add to working edges for chain deletion processing
					nodeReconnections.push({
						id: newEdgeId,
						source: inEdge.source,
						target: outEdge.target,
						sourceHandle,
						targetHandle,
					});

					// Track this edge to avoid duplicates
					existingEdgeIds.add(newEdgeId);
				}
			}
		}

		// Update working edges for next iteration:
		// 1. Remove edges connected to this deleted node
		workingEdges = workingEdges.filter((edge) => edge.source !== nodeId && edge.target !== nodeId);
		// 2. Add reconnection edges so they're available for next node's deletion
		workingEdges.push(...nodeReconnections);
	}

	return allReconnectionEdges;
}

export interface UseCanvasSyncOptions {
	/** The workflow document */
	doc: WorkflowDocument;
	/** The Vue Flow store instance */
	instance: VueFlowStore;
}

/** Return type for useCanvasSync */
export interface UseCanvasSyncResult {
	initialNodes: Node[];
	initialEdges: Edge[];
	/** Validation function for Vue Flow's :is-valid-connection prop */
	isValidConnection: ValidConnectionFunc;
}

/**
 * Canvas sync adapter - bridges WorkflowDocument with Vue Flow.
 *
 * Handles persistent document sync:
 * - Initial nodes and edges returned for VueFlow :nodes/:edges props
 * - Local changes: Vue Flow events → document mutations
 * - Remote changes: document events → Vue Flow updates
 *
 * Only cares about positions and add/remove - parameters are hidden from Vue Flow.
 * For ephemeral awareness sync (cursors, selections, live drag), use useCanvasAwareness.
 */
export function useCanvasSync(options: UseCanvasSyncOptions): UseCanvasSyncResult {
	const { doc, instance } = options;

	// --- Connection validation ---
	const { isValidConnection } = useConnectionValidation({ doc });

	// --- Initial data for Vue Flow ---
	const initialNodes = doc.getNodes().map(toVueFlowNode);
	const initialEdges = doc.getEdges().map(toVueFlowEdge);

	// --- Local Change Batcher: Collects Vue Flow events into a single batch ---
	const batcher = useVueFlowChangeBatcher({ instance });

	batcher.onChangeBatch((batch: ChangeBatch) => {
		handleChangeBatch(batch);
	});

	/**
	 * Handle a batch of Vue Flow changes.
	 * Applies changes to Vue Flow state, calculates reconnections, and syncs to CRDT.
	 */
	function handleChangeBatch(batch: ChangeBatch): void {
		const { nodeChanges, edgeChanges } = batch;

		// Apply all changes to Vue Flow state first
		instance.applyNodeChanges(nodeChanges);
		instance.applyEdgeChanges(edgeChanges);

		// Extract removals for CRDT sync
		const nodeRemovals = nodeChanges.filter((c): c is NodeRemoveChange => c.type === 'remove');
		const edgeRemovals = edgeChanges.filter((c): c is EdgeRemoveChange => c.type === 'remove');

		// Handle deletions with reconnection logic
		if (nodeRemovals.length > 0 && edgeRemovals.length > 0) {
			handleNodeDeletionWithReconnections(nodeRemovals, edgeRemovals);
		} else if (nodeRemovals.length > 0) {
			for (const removal of nodeRemovals) {
				doc.removeNode(removal.id);
			}
		} else if (edgeRemovals.length > 0) {
			for (const removal of edgeRemovals) {
				doc.removeEdge(removal.id);
			}
		}
	}

	/**
	 * Handle node deletions that may require reconnection edges.
	 * All CRDT mutations are wrapped in a single transaction for atomic undo/redo.
	 */
	function handleNodeDeletionWithReconnections(
		nodeRemovals: NodeRemoveChange[],
		edgeRemovals: EdgeRemoveChange[],
	): void {
		const deletedNodeIds = new Set(nodeRemovals.map((r) => r.id));
		const existingEdgeIds = new Set(edgeRemovals.map((e) => e.id));

		// Extract edge data for reconnection calculation
		const edgeData: EdgeData[] = edgeRemovals.map((e) => ({
			id: e.id,
			source: e.source,
			target: e.target,
			sourceHandle: e.sourceHandle,
			targetHandle: e.targetHandle,
		}));

		// Calculate reconnection edges
		const reconnections = getReconnectionEdges(edgeData, deletedNodeIds, existingEdgeIds);

		// Update CRDT in a single atomic transaction
		doc.removeNodesAndEdges(
			nodeRemovals.map((r) => r.id),
			edgeRemovals.map((e) => e.id),
			reconnections,
		);

		// Update Vue Flow: add reconnection edges
		if (reconnections.length > 0) {
			instance.addEdges(reconnections.map(toVueFlowEdge));
		}
	}

	// --- Local → Document: Position updates ---
	const unsubDragStop = instance.onNodeDragStop((event) => {
		const updates = event.nodes.map((node) => ({
			nodeId: node.id,
			position: [node.position.x, node.position.y] as [number, number],
		}));
		doc.updateNodePositions(updates);
	});

	// --- Local → Document: Connection creation ---
	// Only add to CRDT - Vue Flow update happens via onEdgeAdded event
	const unsubConnect = instance.onConnect((connection) => {
		const edgeId = createEdgeId(
			connection.source,
			connection.target,
			connection.sourceHandle,
			connection.targetHandle,
		);

		const sourceHandle = connection.sourceHandle ?? 'outputs/main/0';
		const targetHandle = connection.targetHandle ?? 'inputs/main/0';

		// Add to CRDT only - Vue Flow will be updated via onEdgeAdded event
		doc.addEdge({
			id: edgeId,
			source: connection.source,
			target: connection.target,
			sourceHandle,
			targetHandle,
		});
	});

	// --- Remote/Undo → Vue Flow: Node events ---
	// These fire when CRDT changes come from remote users or undo/redo.
	// Node and edge events are already batched at the CRDT layer (onTransactionBatch),
	// so nodes are guaranteed to be added before edges within the same transaction.
	const { off: offNodeAdded } = doc.onNodeAdded((node) => {
		instance.addNodes([toVueFlowNode(node)]);
	});

	const { off: offNodeRemoved } = doc.onNodeRemoved((nodeId) => {
		instance.removeNodes([nodeId]);
	});

	const { off: offNodePosition } = doc.onNodePositionChange(({ nodeId, position }) => {
		instance.updateNode(nodeId, { position: { x: position[0], y: position[1] } });
	});

	const { off: offNodeHandles } = doc.onNodeHandlesChange(({ nodeId }) => {
		void nextTick(() => {
			instance.updateNodeInternals([nodeId]);
		});
	});

	const { off: offNodeSize } = doc.onNodeSizeChange(({ nodeId, size }) => {
		instance.updateNode(nodeId, { width: size[0], height: size[1] });
		void nextTick(() => {
			instance.updateNodeInternals([nodeId]);
		});
	});

	const { off: offNodeName } = doc.onNodeNameChange(({ nodeId, name }) => {
		instance.updateNodeData(nodeId, { label: name });
	});

	// --- All Origins → Vue Flow: Edge events ---
	// These fire for ALL origins (local, remote, undoRedo) after node events within the same transaction.
	// Use nextTick to ensure Vue has rendered the nodes before adding edges.
	const { off: offEdgeAdded } = doc.onEdgeAdded((edge) => {
		void nextTick(() => {
			instance.addEdges([toVueFlowEdge(edge)]);
		});
	});

	const { off: offEdgeRemoved } = doc.onEdgeRemoved((edgeId) => {
		void nextTick(() => {
			instance.removeEdges([edgeId]);
		});
	});

	// --- Cleanup ---
	onScopeDispose(() => {
		unsubDragStop.off();
		unsubConnect.off();
		offNodeAdded();
		offNodeRemoved();
		offNodePosition();
		offNodeHandles();
		offNodeSize();
		offNodeName();
		offEdgeAdded();
		offEdgeRemoved();
	});

	return { initialNodes, initialEdges, isValidConnection };
}
