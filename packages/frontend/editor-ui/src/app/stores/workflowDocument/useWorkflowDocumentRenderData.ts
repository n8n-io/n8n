import { effectScope, markRaw, shallowReactive, type ComputedRef, type Raw, type Ref } from 'vue';
import isEqual from 'lodash/isEqual';
import { NodeHelpers, type Workflow } from 'n8n-workflow';
import { structuralComputed } from '@n8n/composables/structuralComputed';
import type { INodeUi } from '@/Interface';
import type { CanvasConnectionPort } from '@/features/workflows/canvas/canvas.types';
import { mapLegacyEndpointsToCanvasConnectionPort } from '@/features/workflows/canvas/canvas.utils';
import { useNodeTypesStore } from '../nodeTypes.store';
import { CHANGE_ACTION } from './types';
import type {
	NodesChangeEvent,
	NodeAddedPayload,
	NodeRemovedPayload,
	NodesSetPayload,
} from './useWorkflowDocumentNodes';

/**
 * Per-node render-data slot. Each field is its own ComputedRef so that
 * consumers subscribe atomically — updating one field does not invalidate
 * consumers of other fields. ComputedRef is used (vs writable Ref) both for
 * the read-only contract and for lazy + cached evaluation.
 */
export type NodeRenderData = {
	inputs: ComputedRef<CanvasConnectionPort[]>;
	outputs: ComputedRef<CanvasConnectionPort[]>;
};

export interface WorkflowDocumentRenderDataDeps {
	getNodeById: (id: string) => INodeUi | undefined;
	onNodesChange: (handler: (event: NodesChangeEvent) => void) => { off: () => void };
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

	function resolveNodeContext(nodeId: string) {
		const node = deps.getNodeById(nodeId);
		if (!node) return null;

		const nodeTypeDescription =
			nodeTypesStore.getNodeType(node.type, node.typeVersion) ??
			nodeTypesStore.communityNodeType(node.type)?.nodeDescription ??
			null;

		const workflowObjectNode = deps.workflowObject.value.getNode(node.name);
		if (!workflowObjectNode || !nodeTypeDescription) return null;

		return { node, nodeTypeDescription, workflowObjectNode };
	}

	function computeNodeInputs(nodeId: string): CanvasConnectionPort[] {
		const ctx = resolveNodeContext(nodeId);
		if (!ctx) return [];

		return mapLegacyEndpointsToCanvasConnectionPort(
			NodeHelpers.getNodeInputs(
				deps.workflowObject.value,
				ctx.workflowObjectNode,
				ctx.nodeTypeDescription,
			),
			ctx.nodeTypeDescription.inputNames ?? [],
		);
	}

	function computeNodeOutputs(nodeId: string): CanvasConnectionPort[] {
		const ctx = resolveNodeContext(nodeId);
		if (!ctx) return [];

		return mapLegacyEndpointsToCanvasConnectionPort(
			NodeHelpers.getNodeOutputs(
				deps.workflowObject.value,
				ctx.workflowObjectNode,
				ctx.nodeTypeDescription,
			),
			ctx.nodeTypeDescription.outputNames ?? [],
		);
	}

	function createNodeEntry(nodeId: string): {
		renderData: Raw<NodeRenderData>;
		dispose: () => void;
	} {
		const scope = effectScope();
		let renderData!: Raw<NodeRenderData>;

		scope.run(() => {
			// Lazy: only runs when a consumer reads `.value`. Cached: returns the
			// same array reference on structurally-equal results, so unrelated
			// workflow churn never invalidates this node's input/output consumers.
			const inputs = structuralComputed(() => computeNodeInputs(nodeId), isEqual);
			const outputs = structuralComputed(() => computeNodeOutputs(nodeId), isEqual);

			// `markRaw` keeps Vue/Pinia's reactivity transforms from descending into
			// this object — critical so the inner `ComputedRef`s survive as Refs
			// (not auto-unwrapped) when the store is consumed downstream.
			renderData = markRaw({ inputs, outputs });
		});

		return { renderData, dispose: () => scope.stop() };
	}

	function addNodeEntry(nodeId: string) {
		if (nodeEntries.has(nodeId)) return;
		const entry = createNodeEntry(nodeId);
		nodeEntries.set(nodeId, { dispose: entry.dispose });
		nodes.set(nodeId, entry.renderData);
	}

	function removeNodeEntry(nodeId: string) {
		nodeEntries.get(nodeId)?.dispose();
		nodeEntries.delete(nodeId);
		nodes.delete(nodeId);
	}

	/** Full reconciliation — adds missing entries, removes stale ones. */
	function reconcileEntries(nodeIds: string[]) {
		const nextIds = new Set(nodeIds);

		for (const oldId of nodeEntries.keys()) {
			if (!nextIds.has(oldId)) {
				removeNodeEntry(oldId);
			}
		}

		for (const newId of nodeIds) {
			addNodeEntry(newId);
		}
	}

	// Event-driven reconciliation — O(1) per add/remove, zero cost on
	// node updates (parameter changes, position drags, etc.).
	deps.onNodesChange((event) => {
		switch (event.action) {
			case CHANGE_ACTION.ADD: {
				const { node } = event.payload as NodeAddedPayload;
				addNodeEntry(node.id);
				break;
			}
			case CHANGE_ACTION.DELETE: {
				const { id } = event.payload as NodeRemovedPayload;
				if (id) {
					removeNodeEntry(id);
				} else {
					// removeAllNodes fires DELETE with empty payload
					reconcileEntries([]);
				}
				break;
			}
			case CHANGE_ACTION.SET: {
				const { nodeIds } = event.payload as NodesSetPayload;
				reconcileEntries(nodeIds);
				break;
			}
		}
	});

	// -----------------------------------------------------------------------
	// Connections (future)
	// -----------------------------------------------------------------------

	return {
		render: {
			nodes,
		},
	};
}
