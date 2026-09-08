import type { Dimensions, NodeChange } from '@vue-flow/core';
import { onScopeDispose } from 'vue';
import type { INodeUi } from '@/Interface';
import { snapPositionToGridByCenter } from '@/app/utils/nodeViewUtils';
import { useAgentNodeCanvasGeometryStore } from '@/features/agents/agentNodeCanvasGeometry.store';
import { isAgentNodeV2 } from '@/features/agents/utils/agentNode';
import type { CanvasNodeMoveEvent } from '../canvas.types';

type NodesChangeSubscription = { off: () => void };

type Position = { x: number; y: number };

export interface UseCanvasAgentNodeGeometryDeps {
	canvasId: string;
	getNodeById: (id: string) => INodeUi | undefined;
	setNodePosition: (id: string, position: Position) => void;
	onNodesChange: (handler: (changes: NodeChange[]) => void) => NodesChangeSubscription;
	/** The position the canvas was given for a node (document position plus group offset). */
	getSourcePosition: (id: string) => Position | undefined;
	/** The position Vue Flow renders a node at. */
	getRenderedNode: (id: string) => { position: Position; dragging: boolean } | undefined;
	setRenderedPosition: (id: string, position: Position) => void;
}

export function useCanvasAgentNodeGeometry(deps: UseCanvasAgentNodeGeometryDeps) {
	const geometryStore = useAgentNodeCanvasGeometryStore();

	// Vue Flow snaps a node's top-left to the grid when its wrapper mounts, but only
	// in its own copy of the position. The card's top-left is off the grid whenever
	// its center is on it, so the render lands a few px below the document position
	// and the connections tilt. Put the card back where the canvas placed it.
	function restoreRenderedPosition(id: string) {
		const source = deps.getSourcePosition(id);
		const rendered = deps.getRenderedNode(id);
		if (!source || !rendered || rendered.dragging) return;
		if (rendered.position.x === source.x && rendered.position.y === source.y) return;
		deps.setRenderedPosition(id, { x: source.x, y: source.y });
	}

	function onCanvasNodesChange(changes: NodeChange[]) {
		for (const change of changes) {
			if (change.type !== 'dimensions' || !change.dimensions) continue;

			const node = deps.getNodeById(change.id);
			if (!node || !isAgentNodeV2(node)) continue;

			restoreRenderedPosition(change.id);

			// A card that is still loading its content has no meaningful size yet.
			const contentKey = geometryStore.getNodeContentKey(deps.canvasId, change.id);
			if (contentKey === undefined) continue;

			const previous = geometryStore.getNodeMeasurement(deps.canvasId, change.id);
			geometryStore.setNodeMeasurement(deps.canvasId, change.id, {
				height: change.dimensions.height,
				contentKey,
			});

			// Keep the center only when the card shows new content (agent picked or
			// edited). Size changes under the same content are load-time rendering
			// settling (fonts, icons, model names): the saved position already fits
			// the loaded card, so moving it would misalign it and dirty the workflow.
			const pendingCenterY = geometryStore.consumePendingCenterY(deps.canvasId, change.id);
			const intendedCenterY =
				pendingCenterY ??
				(previous && previous.contentKey !== contentKey
					? node.position[1] + previous.height / 2
					: undefined);
			if (intendedCenterY === undefined) continue;

			const nextY = intendedCenterY - change.dimensions.height / 2;
			if (nextY === node.position[1]) continue;

			deps.setNodePosition(change.id, { x: node.position[0], y: nextY });
		}
	}

	const subscription = deps.onNodesChange(onCanvasNodesChange);
	onScopeDispose(() => {
		subscription.off();
		geometryStore.clearCanvas(deps.canvasId);
	});

	function snapDraggedNodeMoves(
		draggedNode: { id: string; dimensions: Dimensions },
		moves: CanvasNodeMoveEvent[],
		draggedNodes: Array<{ id: string; dimensions: Dimensions }> = [draggedNode],
	) {
		const draggedAgentNode = [draggedNode, ...draggedNodes].find(({ id, dimensions }) => {
			const { width, height } = dimensions;
			return (
				moves.some((move) => move.id === id) &&
				isAgentNodeV2(deps.getNodeById(id)) &&
				width > 0 &&
				height > 0
			);
		});
		if (!draggedAgentNode) return moves;

		const draggedMove = moves.find((move) => move.id === draggedAgentNode.id);
		if (!draggedMove) return moves;

		const { width, height } = draggedAgentNode.dimensions;
		const [x, y] = snapPositionToGridByCenter(
			[draggedMove.position.x, draggedMove.position.y],
			[width, height],
		);
		const offset = { x: x - draggedMove.position.x, y: y - draggedMove.position.y };
		if (offset.x === 0 && offset.y === 0) return moves;

		return moves.map((move) => ({
			...move,
			position: {
				x: move.position.x + offset.x,
				y: move.position.y + offset.y,
			},
		}));
	}

	return { snapDraggedNodeMoves };
}
