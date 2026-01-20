import { nextTick, onScopeDispose } from 'vue';
import type { Node, Edge, VueFlowStore, ValidConnectionFunc } from '@vue-flow/core';
import type { WorkflowDocument, WorkflowNode, WorkflowEdge } from '../types/workflowDocument.types';
import { useConnectionValidation } from './useConnectionValidation';

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
 */
function toVueFlowEdge(edge: WorkflowEdge): Edge {
	return {
		id: edge.id,
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
 *
 * @example
 * ```ts
 * const doc = useCrdtWorkflowDoc({ docId: 'workflow-123' });
 * const instance = useVueFlow('workflow-123');
 *
 * // Wire up document sync and get initial nodes/edges
 * const { initialNodes, initialEdges } = useCanvasSync({ doc, instance });
 *
 * // Pass initial data to VueFlow
 * // <VueFlow :id="doc.workflowId" :nodes="initialNodes" :edges="initialEdges" />
 * ```
 */
export function useCanvasSync(options: UseCanvasSyncOptions): UseCanvasSyncResult {
	const { doc, instance } = options;

	// --- Connection validation ---
	const { isValidConnection } = useConnectionValidation({ doc });

	// --- Initial data for Vue Flow ---
	const initialNodes = doc.getNodes().map(toVueFlowNode);
	const initialEdges = doc.getEdges().map(toVueFlowEdge);

	// --- Local → Document: Nodes ---

	// Wire drag stop to commit positions to CRDT document
	const unsubDragStop = instance.onNodeDragStop((event) => {
		// Commit final positions to CRDT document (single transaction)
		const updates = event.nodes.map((node) => ({
			nodeId: node.id,
			position: [node.position.x, node.position.y] as [number, number],
		}));
		doc.updateNodePositions(updates);
	});

	// Handle all node changes - apply to Vue Flow first, then sync to CRDT
	// With :apply-default="false", we must manually call applyNodeChanges
	const unsubNodesChange = instance.onNodesChange((changes) => {
		// Apply changes to Vue Flow state first
		instance.applyNodeChanges(changes);

		// Then sync relevant changes to CRDT document
		for (const change of changes) {
			if (change.type === 'remove') {
				doc.removeNode(change.id);
			}
		}
	});

	// --- Local → Document: Edges ---

	// Wire connection creation to CRDT document
	// Note: isValidConnection on VueFlow already prevents invalid connections
	const unsubConnect = instance.onConnect((connection) => {
		const edgeId = createEdgeId(
			connection.source,
			connection.target,
			connection.sourceHandle,
			connection.targetHandle,
		);

		const sourceHandle = connection.sourceHandle ?? 'outputs/main/0';
		const targetHandle = connection.targetHandle ?? 'inputs/main/0';

		// Add to Vue Flow for immediate local rendering
		instance.addEdges([
			{
				id: edgeId,
				source: connection.source,
				target: connection.target,
				sourceHandle,
				targetHandle,
			},
		]);

		// Add to CRDT for persistence and remote sync
		doc.addEdge({
			id: edgeId,
			source: connection.source,
			target: connection.target,
			sourceHandle,
			targetHandle,
		});
	});

	// Handle all edge changes - apply to Vue Flow first, then sync to CRDT
	// With :apply-default="false", we must manually call applyEdgeChanges
	const unsubEdgesChange = instance.onEdgesChange((changes) => {
		// Apply changes to Vue Flow state first
		instance.applyEdgeChanges(changes);

		// Then sync relevant changes to CRDT document
		for (const change of changes) {
			if (change.type === 'remove') {
				doc.removeEdge(change.id);
			}
		}
	});

	// --- Remote → Vue Flow: Nodes ---

	const { off: offNodeAdded } = doc.onNodeAdded((node) => {
		instance.addNodes([toVueFlowNode(node)]);
	});

	const { off: offNodeRemoved } = doc.onNodeRemoved((nodeId) => {
		instance.removeNodes([nodeId]);
	});

	const { off: offNodePosition } = doc.onNodePositionChange(({ nodeId, position }) => {
		instance.updateNode(nodeId, { position: { x: position[0], y: position[1] } });
	});

	// Handle changes require calling updateNodeInternals to recalculate handle positions
	// See: https://vueflow.dev/guide/handle.html#dynamic-handle-positions-adding-removing-handles-dynamically
	const { off: offNodeHandles } = doc.onNodeHandlesChange(({ nodeId }) => {
		// Wait for Vue to update the DOM with new handles before recalculating positions
		void nextTick(() => {
			instance.updateNodeInternals([nodeId]);
		});
	});

	// Size changes update node width/height and recalculate internals
	const { off: offNodeSize } = doc.onNodeSizeChange(({ nodeId, size }) => {
		// Update node dimensions in Vue Flow
		instance.updateNode(nodeId, { width: size[0], height: size[1] });
		// Wait for Vue to update the DOM before recalculating handle positions
		void nextTick(() => {
			instance.updateNodeInternals([nodeId]);
		});
	});

	// --- Remote → Vue Flow: Edges ---

	const { off: offEdgeAdded } = doc.onEdgeAdded((edge) => {
		instance.addEdges([toVueFlowEdge(edge)]);
	});

	const { off: offEdgeRemoved } = doc.onEdgeRemoved((edgeId) => {
		instance.removeEdges([edgeId]);
	});

	// --- Cleanup ---

	onScopeDispose(() => {
		unsubDragStop.off();
		unsubNodesChange.off();
		unsubConnect.off();
		unsubEdgesChange.off();
		offNodeAdded();
		offNodeRemoved();
		offNodePosition();
		offNodeHandles();
		offNodeSize();
		offEdgeAdded();
		offEdgeRemoved();
	});

	return { initialNodes, initialEdges, isValidConnection };
}
