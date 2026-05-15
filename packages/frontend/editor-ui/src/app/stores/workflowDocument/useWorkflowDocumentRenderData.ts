import type { ComputedRef, ShallowReactive } from 'vue';
import type { CanvasConnectionPort } from '@/features/workflows/canvas/canvas.types';

// --- Deps ---

export interface WorkflowDocumentRenderDataDeps {
	/**
	 * Per-node port maps. State and lifecycle are owned by
	 * useWorkflowDocumentNodes; this composable is a grouping façade that
	 * exposes them under a single `render` key for canvas consumers.
	 */
	nodeInputsByNodeId: ShallowReactive<Map<string, ComputedRef<CanvasConnectionPort[]>>>;
	nodeOutputsByNodeId: ShallowReactive<Map<string, ComputedRef<CanvasConnectionPort[]>>>;
}

// --- Composable ---

/**
 * Canvas render data grouping façade.
 *
 * Takes the per-node input/output port maps owned by
 * `useWorkflowDocumentNodes` and exposes them under a single `render`
 * key. Spread into the workflow document store so canvas consumers
 * access port data via `store.render`.
 *
 * No state, no lifecycle, no computation — those all live with the maps
 * in `useWorkflowDocumentNodes`.
 */
export function useWorkflowDocumentRenderData(deps: WorkflowDocumentRenderDataDeps) {
	return {
		render: {
			nodeInputsByNodeId: deps.nodeInputsByNodeId,
			nodeOutputsByNodeId: deps.nodeOutputsByNodeId,
		},
	};
}
