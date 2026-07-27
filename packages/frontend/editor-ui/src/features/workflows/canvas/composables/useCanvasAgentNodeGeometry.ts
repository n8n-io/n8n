import type { Dimensions, NodeChange } from '@vue-flow/core';
import { onScopeDispose } from 'vue';
import type { INodeUi } from '@/Interface';
import { snapPositionToGridByCenter } from '@/app/utils/nodeViewUtils';
import { useAgentNodeCanvasGeometryStore } from '@/features/agents/agentNodeCanvasGeometry.store';
import { isAgentNodeV2 } from '@/features/agents/utils/agentNode';
import type { CanvasNodeMoveEvent } from '../canvas.types';

type NodesChangeSubscription = { off: () => void };

export interface UseCanvasAgentNodeGeometryDeps {
	canvasId: string;
	getNodeById: (id: string) => INodeUi | undefined;
	setNodePosition: (id: string, position: { x: number; y: number }) => void;
	onNodesChange: (handler: (changes: NodeChange[]) => void) => NodesChangeSubscription;
}

export function useCanvasAgentNodeGeometry(deps: UseCanvasAgentNodeGeometryDeps) {
	const geometryStore = useAgentNodeCanvasGeometryStore();

	function onCanvasNodesChange(changes: NodeChange[]) {
		for (const change of changes) {
			if (change.type !== 'dimensions' || !change.dimensions) continue;

			const node = deps.getNodeById(change.id);
			if (!node || !isAgentNodeV2(node)) continue;

			const previousHeight = geometryStore.getNodeHeight(deps.canvasId, change.id);
			geometryStore.setNodeHeight(deps.canvasId, change.id, change.dimensions.height);

			const pendingCenterY = geometryStore.consumePendingCenterY(deps.canvasId, change.id);
			const intendedCenterY =
				pendingCenterY ??
				(previousHeight !== undefined ? node.position[1] + previousHeight / 2 : undefined);
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
