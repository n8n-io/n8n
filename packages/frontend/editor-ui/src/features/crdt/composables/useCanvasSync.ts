import { onScopeDispose } from 'vue';
import type { Node, VueFlowStore } from '@vue-flow/core';
import type { WorkflowDocument, WorkflowNode } from '../types/workflowDocument.types';
import type { UseWorkflowAwarenessReturn, DraggingNode } from '../types/awareness.types';

/**
 * Transform WorkflowNode to Vue Flow Node format.
 * Only includes what Vue Flow needs: id, position, label.
 */
function toVueFlowNode(node: WorkflowNode): Node {
	return {
		id: node.id,
		type: 'crdt-node',
		position: { x: node.position[0], y: node.position[1] },
		data: { label: node.name },
	};
}

export interface UseCanvasSyncOptions {
	/** The workflow document */
	doc: WorkflowDocument;
	/** The Vue Flow store instance */
	instance: VueFlowStore;
	/** Optional awareness for real-time drag updates */
	awareness?: UseWorkflowAwarenessReturn;
}

/**
 * Canvas sync adapter - bridges WorkflowDocument with Vue Flow.
 *
 * Handles:
 * - Initial nodes returned for VueFlow :nodes prop
 * - Local changes: Vue Flow events → document mutations
 * - Remote changes: document events → Vue Flow updates
 * - Ephemeral drag updates via awareness (optional)
 *
 * Only cares about positions and add/remove - parameters are hidden from Vue Flow.
 *
 * @example
 * ```ts
 * const doc = useCrdtWorkflowDoc({ docId: 'workflow-123' });
 * const instance = useVueFlow('workflow-123');
 * const awareness = useWorkflowAwareness({ awareness: doc.awareness });
 *
 * // Wire up sync and get initial nodes
 * const initialNodes = useCanvasSync({ doc, instance, awareness });
 *
 * // Pass initial nodes to VueFlow
 * // <VueFlow :id="doc.workflowId" :nodes="initialNodes" fit-view-on-init />
 * ```
 */
export function useCanvasSync(options: UseCanvasSyncOptions): Node[] {
	const { doc, instance, awareness } = options;

	// --- Initial nodes for Vue Flow ---
	const initialNodes = doc.getNodes().map(toVueFlowNode);

	// --- Local → Document ---

	// Wire drag events to broadcast ephemeral positions via awareness
	const unsubDrag = instance.onNodeDrag((event) => {
		if (!awareness) return;

		const draggingNodes: DraggingNode[] = event.nodes.map((node) => ({
			nodeId: node.id,
			position: [node.position.x, node.position.y],
		}));
		awareness.updateDragging(draggingNodes);
	});

	// Wire drag stop to commit positions to CRDT and clear awareness dragging
	const unsubDragStop = instance.onNodeDragStop((event) => {
		// Clear awareness dragging state
		awareness?.updateDragging([]);

		// Commit final positions to CRDT document
		for (const node of event.nodes) {
			doc.updateNodePosition(node.id, [node.position.x, node.position.y]);
		}
	});

	// Wire node removal events to document
	const unsubNodesChange = instance.onNodesChange((changes) => {
		for (const change of changes) {
			if (change.type === 'remove') {
				doc.removeNode(change.id);
			}
		}
	});

	// --- Remote → Vue Flow ---

	const { off: offNodeAdded } = doc.onNodeAdded((node) => {
		instance.addNodes([toVueFlowNode(node)]);
	});

	const { off: offNodeRemoved } = doc.onNodeRemoved((nodeId) => {
		instance.removeNodes([nodeId]);
	});

	const { off: offNodePosition } = doc.onNodePositionChange(({ nodeId, position }) => {
		instance.updateNode(nodeId, { position: { x: position[0], y: position[1] } });
	});

	// --- Cleanup ---

	onScopeDispose(() => {
		unsubDrag.off();
		unsubDragStop.off();
		unsubNodesChange.off();
		offNodeAdded();
		offNodeRemoved();
		offNodePosition();
	});

	return initialNodes;
}
