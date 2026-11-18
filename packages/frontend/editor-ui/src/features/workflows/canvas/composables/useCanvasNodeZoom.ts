import type { FitView } from '@vue-flow/core';
import { shallowRef, toValue, watch, type MaybeRefOrGetter } from 'vue';

/** How the view moves to the nodes: a smooth move that never zooms in past the default zoom. */
export const NODE_ZOOM_VIEW = { duration: 600, padding: 0.4, maxZoom: 1 };

type CanvasNodeZoomOptions = {
	/** False until the canvas made its first fit. A zoom before that would be overwritten. */
	isCanvasReady: MaybeRefOrGetter<boolean>;
	fitView: FitView;
	selectNodes: (ids: string[]) => void;
	onNodesInitialized: (listener: () => void) => unknown;
};

/**
 * Gives `zoomToNodes`, which selects nodes and moves the view to them with an animation.
 * A request that comes before the canvas is ready, or before the nodes have a size, waits.
 * It runs when the canvas is ready and one last time when the nodes get their size.
 * Only the newest request waits.
 */
export function useCanvasNodeZoom({
	isCanvasReady,
	fitView,
	selectNodes,
	onNodesInitialized,
}: CanvasNodeZoomOptions) {
	const waitingNodeIds = shallowRef<string[]>();

	/** Resolves to `false` when none of the nodes has a size on the canvas. */
	async function showNodes(ids: string[]): Promise<boolean> {
		selectNodes(ids);
		return await fitView({ nodes: ids, ...NODE_ZOOM_VIEW });
	}

	async function zoomToNodes(ids: string[]): Promise<void> {
		waitingNodeIds.value = ids;
		const isShown = toValue(isCanvasReady) && (await showNodes(ids));
		if (isShown && waitingNodeIds.value === ids) {
			waitingNodeIds.value = undefined;
		}
	}

	function zoomToWaitingNodes(): void {
		if (waitingNodeIds.value !== undefined) {
			void zoomToNodes(waitingNodeIds.value);
		}
	}

	/** Nodes that have no size after this try are not on the canvas, so the request ends. */
	function zoomToWaitingNodesForTheLastTime(): void {
		const ids = waitingNodeIds.value;
		if (ids !== undefined && toValue(isCanvasReady)) {
			waitingNodeIds.value = undefined;
			void showNodes(ids);
		}
	}

	watch(() => toValue(isCanvasReady), zoomToWaitingNodes);
	onNodesInitialized(zoomToWaitingNodesForTheLastTime);

	return { zoomToNodes };
}
