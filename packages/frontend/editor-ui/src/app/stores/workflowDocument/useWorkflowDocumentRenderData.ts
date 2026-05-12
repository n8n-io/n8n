import {
	effectScope,
	markRaw,
	shallowReactive,
	watch,
	type ComputedRef,
	type Raw,
	type Ref,
} from 'vue';
import isEqual from 'lodash/isEqual';
import { NodeHelpers, type Workflow } from 'n8n-workflow';
import { structuralComputed } from '@n8n/composables/structuralComputed';
import type { INodeUi } from '@/Interface';
import type { CanvasConnectionPort } from '@/features/workflows/canvas/canvas.types';
import { mapLegacyEndpointsToCanvasConnectionPort } from '@/features/workflows/canvas/canvas.utils';
import { useNodeTypesStore } from '../nodeTypes.store';

/**
 * Per-node render-data slot. Each field is its own ComputedRef so that
 * consumers subscribe atomically — updating one field does not invalidate
 * consumers of other fields. ComputedRef is used (vs writable Ref) both for
 * the read-only contract and for lazy + cached evaluation.
 */
export type NodeRenderData = {
	inputs: ComputedRef<CanvasConnectionPort[]>;
};

export interface WorkflowDocumentRenderDataDeps {
	allNodes: ComputedRef<INodeUi[]>;
	workflowObject: Ref<Workflow>;
}

/**
 * Render-data registry for the canvas. Owns derived, expensive-to-compute
 * per-entity state and exposes it as a Map of per-field Refs, so consumers
 * only re-render when the specific field they read actually changes.
 *
 * Today it covers nodes (`render.nodes`). Connections will land under
 * `render.connections` next, following the same pattern.
 */
export function useWorkflowDocumentRenderData(deps: WorkflowDocumentRenderDataDeps) {
	const nodeTypesStore = useNodeTypesStore();

	// -----------------------------------------------------------------------
	// Nodes
	// -----------------------------------------------------------------------

	// Map values are `Raw<NodeRenderData>` so Vue 3.5's `UnwrapRefSimple` does
	// not descend into the values and auto-unwrap the inner `ComputedRef`.
	// Without this, downstream consumers would see `inputs: CanvasConnectionPort[]`
	// instead of `inputs: ComputedRef<CanvasConnectionPort[]>` after passing
	// through Pinia's state-type transforms.
	const nodes = shallowReactive(new Map<string, Raw<NodeRenderData>>());
	const nodeEntries = new Map<string, { dispose: () => void }>();

	function computeNodeInputs(nodeId: string): CanvasConnectionPort[] {
		const node = deps.allNodes.value.find((n) => n.id === nodeId);
		if (!node) return [];

		const nodeTypeDescription =
			nodeTypesStore.getNodeType(node.type, node.typeVersion) ??
			nodeTypesStore.communityNodeType(node.type)?.nodeDescription ??
			null;

		const workflowObjectNode = deps.workflowObject.value.getNode(node.name);
		if (!workflowObjectNode || !nodeTypeDescription) return [];

		return mapLegacyEndpointsToCanvasConnectionPort(
			NodeHelpers.getNodeInputs(deps.workflowObject.value, workflowObjectNode, nodeTypeDescription),
			nodeTypeDescription.inputNames ?? [],
		);
	}

	function createNodeEntry(nodeId: string): {
		renderData: Raw<NodeRenderData>;
		dispose: () => void;
	} {
		const scope = effectScope();
		let renderData!: Raw<NodeRenderData>;

		scope.run(() => {
			// Lazy: only runs when a consumer reads `inputs.value`. Cached: returns
			// the same array reference on structurally-equal results, so unrelated
			// workflow churn never invalidates this node's input consumers.
			const inputs = structuralComputed(() => computeNodeInputs(nodeId), isEqual);

			// `markRaw` keeps Vue/Pinia's reactivity transforms from descending into
			// this object — critical so the inner `ComputedRef` survives as a Ref
			// (not auto-unwrapped) when the store is consumed downstream.
			renderData = markRaw({ inputs });
		});

		return { renderData, dispose: () => scope.stop() };
	}

	// Single reconciliation watcher driven by the set of node IDs.
	// Handles bulk hydrate (`setNodes`), incremental `addNode`, and
	// `removeNode` uniformly — no need to wire onto onNodesChange.
	watch(
		() => deps.allNodes.value.map((n) => n.id),
		(newIds, oldIds) => {
			const nextIds = new Set(newIds);

			// Remove gone
			for (const oldId of oldIds ?? []) {
				if (!nextIds.has(oldId)) {
					nodeEntries.get(oldId)?.dispose();
					nodeEntries.delete(oldId);
					nodes.delete(oldId);
				}
			}

			// Add new
			for (const newId of newIds) {
				if (!nodeEntries.has(newId)) {
					const entry = createNodeEntry(newId);
					nodeEntries.set(newId, { dispose: entry.dispose });
					nodes.set(newId, entry.renderData);
				}
			}
		},
		{ immediate: true },
	);

	// -----------------------------------------------------------------------
	// Connections (future)
	// -----------------------------------------------------------------------

	return {
		render: {
			nodes,
		},
	};
}
