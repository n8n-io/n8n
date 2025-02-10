import { type CanvasNode } from '@/types';
import { getRectOfNodes, type Rect, type VueFlowStore } from '@vue-flow/core';
import { useThrottleFn } from '@vueuse/core';
import { type ComputedRef, onMounted, onUnmounted, ref } from 'vue';

/**
 * From a given node list, finds a node that the mouse cursor is within its hit box.
 * If more than one node meets this condition, returns the closest one.
 */
export function useCanvasNodeHover(
	nodesRef: ComputedRef<CanvasNode[]>,
	store: VueFlowStore,
	getHitBox: (rect: Rect) => Rect,
) {
	const id = ref<string | undefined>();

	const recalculate = useThrottleFn(
		(event: MouseEvent) => {
			const bounds = store.viewportRef.value?.getBoundingClientRect();

			if (!bounds) {
				return;
			}

			const eventCoord = store.project({
				x: event.clientX - bounds.x,
				y: event.clientY - bounds.y,
			});

			const nearbyNodes = nodesRef.value
				.flatMap((node) => {
					if (node.data?.disabled) {
						return [];
					}

					const vueFlowNode = store.nodeLookup.value.get(node.id);

					if (!vueFlowNode) {
						return [];
					}

					const nodeRect = getRectOfNodes([vueFlowNode]);
					const hitBox = getHitBox(nodeRect);

					if (
						hitBox.x > eventCoord.x ||
						eventCoord.x > hitBox.x + hitBox.width ||
						hitBox.y > eventCoord.y ||
						eventCoord.y > hitBox.y + hitBox.height
					) {
						return [];
					}

					const dx = nodeRect.x + nodeRect.width / 2 - eventCoord.x;
					const dy = nodeRect.y + nodeRect.height / 2 - eventCoord.y;

					return [
						{
							id: node.id,
							squareDistance: dx ** 2 + dy ** 2,
						},
					];
				})
				.toSorted((nodeA, nodeB) => nodeA.squareDistance - nodeB.squareDistance);

			id.value = nearbyNodes[0]?.id;
		},
		200,
		true,
		true,
	);

	onMounted(() => {
		store.vueFlowRef.value?.addEventListener('mousemove', recalculate);
	});

	onUnmounted(() => {
		store.vueFlowRef.value?.removeEventListener('mousemove', recalculate);
	});

	return { id };
}
