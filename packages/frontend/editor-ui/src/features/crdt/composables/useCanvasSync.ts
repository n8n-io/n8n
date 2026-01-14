import { onScopeDispose } from 'vue';
import type { Node, VueFlowStore } from '@vue-flow/core';
import type { WorkflowDocument, WorkflowNode } from '../types/workflowDocument.types';

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
}

/**
 * Canvas sync adapter - bridges WorkflowDocument with Vue Flow.
 *
 * Handles persistent document sync:
 * - Initial nodes returned for VueFlow :nodes prop
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
 * // Wire up document sync and get initial nodes
 * const initialNodes = useCanvasSync({ doc, instance });
 *
 * // Pass initial nodes to VueFlow
 * // <VueFlow :id="doc.workflowId" :nodes="initialNodes" fit-view-on-init />
 * ```
 */
export function useCanvasSync(options: UseCanvasSyncOptions): Node[] {
	const { doc, instance } = options;

	// --- Initial nodes for Vue Flow ---
	const initialNodes = doc.getNodes().map(toVueFlowNode);

	// --- Local → Document ---

	// Wire drag stop to commit positions to CRDT document
	const unsubDragStop = instance.onNodeDragStop((event) => {
		// Commit final positions to CRDT document (single transaction)
		const updates = event.nodes.map((node) => ({
			nodeId: node.id,
			position: [node.position.x, node.position.y] as [number, number],
		}));
		doc.updateNodePositions(updates);
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
		unsubDragStop.off();
		unsubNodesChange.off();
		offNodeAdded();
		offNodeRemoved();
		offNodePosition();
	});

	return initialNodes;
}
