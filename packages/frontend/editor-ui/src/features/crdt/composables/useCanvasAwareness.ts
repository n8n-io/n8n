import { onScopeDispose } from 'vue';
import type { VueFlowStore } from '@vue-flow/core';
import type {
	UseWorkflowAwarenessReturn,
	DraggingNode,
	CollaboratorDraggingChange,
} from '../types/awareness.types';

export interface UseCanvasAwarenessOptions {
	/** The Vue Flow store instance */
	instance: VueFlowStore;
	/** The workflow awareness instance */
	awareness: UseWorkflowAwarenessReturn;
}

/**
 * Canvas awareness adapter - bridges Vue Flow with ephemeral awareness state.
 *
 * Handles all awareness-related sync between Vue Flow and collaborators:
 * - Cursor position broadcasting (via pane mouse events)
 * - Selection broadcasting (via node selection changes)
 * - Local drag position broadcasting (ephemeral, during drag)
 * - Remote drag position receiving (updates Vue Flow nodes in real-time)
 *
 * This composable handles ephemeral/transient state only.
 * For persistent document sync, use useCanvasSync.
 *
 * @example
 * ```ts
 * const instance = useVueFlow('workflow-123');
 * const awareness = useWorkflowAwareness({ awareness: doc.awareness });
 *
 * // Wire up awareness sync
 * useCanvasAwareness({ instance, awareness });
 * ```
 */
export function useCanvasAwareness(options: UseCanvasAwarenessOptions): void {
	const { instance, awareness } = options;

	// --- Cursor tracking ---
	// Track mouse position in flow coordinates and broadcast to awareness

	const unsubPaneMouseMove = instance.onPaneMouseMove((event) => {
		if (!awareness.isReady.value) return;

		// Convert screen coordinates to flow coordinates (accounts for pan/zoom)
		const flowCoords = instance.screenToFlowCoordinate({
			x: event.clientX,
			y: event.clientY,
		});

		awareness.updateCursor({
			x: flowCoords.x,
			y: flowCoords.y,
		});
	});

	const unsubPaneMouseLeave = instance.onPaneMouseLeave(() => {
		awareness.updateCursor(null);
	});

	// --- Selection tracking ---
	// Listen for selection changes and sync to awareness

	const unsubNodesChange = instance.onNodesChange((changes) => {
		// Filter for selection changes only
		const selectionChanges = changes.filter((c) => c.type === 'select');
		if (selectionChanges.length === 0) return;
		if (!awareness.isReady.value) return;

		// Get current selected node IDs from Vue Flow
		const selectedNodeIds = instance.getSelectedNodes.value.map((n) => n.id);
		awareness.updateSelection(selectedNodeIds);
	});

	// --- Local drag broadcasting ---
	// Broadcast ephemeral positions during drag

	const unsubDrag = instance.onNodeDrag((event) => {
		if (!awareness.isReady.value) return;

		const draggingNodes: DraggingNode[] = event.nodes.map((node) => ({
			nodeId: node.id,
			position: [node.position.x, node.position.y],
		}));
		awareness.updateDragging(draggingNodes);
	});

	const unsubDragStop = instance.onNodeDragStop(() => {
		// Clear awareness dragging state (document commit is handled by useCanvasSync)
		awareness.updateDragging([]);
	});

	// --- Remote drag receiving ---
	// When another user drags a node, update Vue Flow position in real-time

	const { off: offDraggingChange } = awareness.onDraggingChange(
		(event: CollaboratorDraggingChange) => {
			// Note: NodePositionChange requires `from` in the type, but Vue Flow's
			// applyChanges() implementation doesn't use it - only `position` is read.
			const changes = event.nodes.map((node) => ({
				type: 'position' as const,
				id: node.nodeId,
				position: { x: node.position[0], y: node.position[1] },
				from: { x: 0, y: 0 }, // Required by type but unused by implementation
			}));
			instance.applyNodeChanges(changes);
		},
	);

	// --- Cleanup ---

	onScopeDispose(() => {
		unsubPaneMouseMove.off();
		unsubPaneMouseLeave.off();
		unsubNodesChange.off();
		unsubDrag.off();
		unsubDragStop.off();
		offDraggingChange();
	});
}
