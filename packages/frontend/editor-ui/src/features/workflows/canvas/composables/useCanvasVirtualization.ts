import type { Dimensions, ViewportTransform, XYPosition } from '@vue-flow/core';
import { throttledRef } from '@vueuse/core';
import type { ComputedRef, Ref } from 'vue';
import { computed } from 'vue';
import type { CanvasVirtualization, ViewportCullingFrame } from '../canvas.types';

export const VIRTUALIZATION_MIN_NODES = 100;
export const VIRTUALIZATION_MIN_NODE_SCREEN_PX = 25;
const VIRTUALIZATION_THROTTLE_MS = 200;

/**
 * Viewport rect in canvas coordinates, expanded by half a viewport per side.
 * Same viewport->canvas math as ensureNodesAreVisible in WorkflowCanvas.vue.
 */
export function computeCullingFrame(
	viewport: ViewportTransform,
	dimensions: Dimensions,
): ViewportCullingFrame {
	const { x, y, zoom } = viewport;
	const width = dimensions.width / zoom;
	const height = dimensions.height / zoom;
	return {
		zoom,
		rect: {
			x: -x / zoom - width / 2,
			y: -y / zoom - height / 2,
			width: width * 2,
			height: height * 2,
		},
	};
}

/**
 * Plain AABB-vs-rect disjoint test. Unmeasured nodes (dimensions 0x0) degrade
 * to a point test, which is correct enough pre-measurement.
 */
export function isOutsideRect(
	rect: ViewportCullingFrame['rect'],
	position: XYPosition,
	dimensions: Dimensions,
): boolean {
	return (
		position.x + dimensions.width < rect.x ||
		position.x > rect.x + rect.width ||
		position.y + dimensions.height < rect.y ||
		position.y > rect.y + rect.height
	);
}

export function useCanvasVirtualization({
	viewport,
	dimensions,
	defaultNodeCount,
}: {
	viewport: Ref<ViewportTransform>;
	dimensions: Ref<Dimensions>;
	defaultNodeCount: ComputedRef<number>;
}): CanvasVirtualization {
	// Rect and zoom are throttled together in one object so per-node reads never
	// mix a fresh zoom with a stale rect. Leading + trailing (vueuse default).
	const frame = throttledRef(
		computed(() => computeCullingFrame(viewport.value, dimensions.value)),
		VIRTUALIZATION_THROTTLE_MS,
	);
	const active = computed(() => defaultNodeCount.value >= VIRTUALIZATION_MIN_NODES);
	return { active, frame };
}
