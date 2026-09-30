import type { NodeChange } from '@vue-flow/core';
import { onScopeDispose } from 'vue';
import type { INodeUi } from '@/Interface';
import { useAgentNodeCanvasGeometryStore } from '@/features/agents/agentNodeCanvasGeometry.store';
import { getAgentNodeHandleOffset, isAgentNodeV2 } from '@/features/agents/utils/agentNode';

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

			// A card that is still loading its content has no meaningful size yet.
			const contentKey = geometryStore.getNodeContentKey(deps.canvasId, change.id);
			if (contentKey === undefined) continue;

			const previous = geometryStore.getNodeMeasurement(deps.canvasId, change.id);
			geometryStore.setNodeMeasurement(deps.canvasId, change.id, {
				height: change.dimensions.height,
				contentKey,
			});

			// Keep the handle on its axis only when the card shows new content (agent
			// picked or edited). Size changes under the same content are load-time
			// rendering settling (fonts, icons, model names): the saved position
			// already fits the loaded card, so moving it would misalign it and dirty
			// the workflow.
			const pendingCenterY = geometryStore.consumePendingCenterY(deps.canvasId, change.id);
			const handleY =
				pendingCenterY ??
				(previous && previous.contentKey !== contentKey
					? node.position[1] + getAgentNodeHandleOffset(previous.height)
					: undefined);
			if (handleY === undefined) continue;

			const nextY = handleY - getAgentNodeHandleOffset(change.dimensions.height);
			if (nextY === node.position[1]) continue;

			deps.setNodePosition(change.id, { x: node.position[0], y: nextY });
		}
	}

	const subscription = deps.onNodesChange(onCanvasNodesChange);
	onScopeDispose(() => {
		subscription.off();
		geometryStore.clearCanvas(deps.canvasId);
	});
}
