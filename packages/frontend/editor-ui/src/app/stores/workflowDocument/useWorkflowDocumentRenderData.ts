import { effectScope, type ComputedRef, type Ref, type ShallowReactive } from 'vue';
import { NodeHelpers, type INodeTypeDescription, type Workflow } from 'n8n-workflow';
import { structuralComputed } from '@n8n/composables/structuralComputed';
import isEqual from 'lodash/isEqual';
import type { CommunityNodeType } from '@n8n/api-types';
import type { INodeUi } from '@/Interface';
import type { CanvasConnectionPort } from '@/features/workflows/canvas/canvas.types';
import { mapLegacyEndpointsToCanvasConnectionPort } from '@/features/workflows/canvas/canvas.utils';
import { CHANGE_ACTION } from './types';
import type {
	NodeAddedPayload,
	NodeRemovedPayload,
	NodesSetPayload,
	useWorkflowDocumentNodes,
} from './useWorkflowDocumentNodes';

// --- Deps ---

export interface WorkflowDocumentRenderDataDeps {
	/** Source-of-truth node list, used for the initial reconciliation pass. */
	nodes: Ref<INodeUi[]>;
	getNodeById: (id: string) => INodeUi | undefined;
	workflowObject: Ref<Workflow>;
	getNodeType: (typeName: string, version?: number) => INodeTypeDescription | null;
	getCommunityNodeType: (typeName: string) => CommunityNodeType | undefined;
	onNodesChange: ReturnType<typeof useWorkflowDocumentNodes>['onNodesChange'];
	/**
	 * Per-node port maps. State ownership lives in useWorkflowDocumentNodes;
	 * this composable populates and maintains them in response to node-change
	 * events.
	 */
	nodeInputsByNodeId: ShallowReactive<Map<string, ComputedRef<CanvasConnectionPort[]>>>;
	nodeOutputsByNodeId: ShallowReactive<Map<string, ComputedRef<CanvasConnectionPort[]>>>;
}

// --- Composable ---

/**
 * Per-node canvas render data lifecycle manager.
 *
 * Owns the computation logic and lifecycle (effectScope, structuralComputed,
 * reconciliation on `onNodesChange`) for per-node input/output port maps.
 * The maps themselves are owned by `useWorkflowDocumentNodes` and provided
 * as deps — this composable mutates them as a side effect of subscribing to
 * node change events.
 *
 * Each node gets its own `structuralComputed` for inputs and outputs.
 * Lifecycle is O(1) per add/remove, zero cost on node updates. The
 * structuralComputed handles reactive re-evaluation (e.g. when workflowObject
 * or node type changes) and `isEqual` gates downstream propagation.
 *
 * Returns `{ render }` — a grouped accessor exposing the same map references
 * for consumers. Spread into the store as `store.render`.
 */
export function useWorkflowDocumentRenderData(deps: WorkflowDocumentRenderDataDeps) {
	const { nodeInputsByNodeId, nodeOutputsByNodeId } = deps;
	const nodePortScopes = new Map<string, () => void>();

	function resolveNodeContext(nodeId: string) {
		const node = deps.getNodeById(nodeId);
		if (!node) return null;

		const nodeTypeDescription =
			deps.getNodeType(node.type, node.typeVersion) ??
			deps.getCommunityNodeType(node.type)?.nodeDescription ??
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

	function addPortEntry(nodeId: string) {
		if (nodePortScopes.has(nodeId)) return;
		const scope = effectScope();
		scope.run(() => {
			nodeInputsByNodeId.set(
				nodeId,
				structuralComputed(() => computeNodeInputs(nodeId), isEqual),
			);
			nodeOutputsByNodeId.set(
				nodeId,
				structuralComputed(() => computeNodeOutputs(nodeId), isEqual),
			);
		});
		nodePortScopes.set(nodeId, () => scope.stop());
	}

	function removePortEntry(nodeId: string) {
		nodePortScopes.get(nodeId)?.();
		nodePortScopes.delete(nodeId);
		nodeInputsByNodeId.delete(nodeId);
		nodeOutputsByNodeId.delete(nodeId);
	}

	function reconcilePortEntries(nodeIds: string[]) {
		const nextIds = new Set(nodeIds);
		for (const oldId of nodePortScopes.keys()) {
			if (!nextIds.has(oldId)) removePortEntry(oldId);
		}
		for (const id of nodeIds) addPortEntry(id);
	}

	deps.onNodesChange((event) => {
		switch (event.action) {
			case CHANGE_ACTION.ADD: {
				const { node } = event.payload as NodeAddedPayload;
				addPortEntry(node.id);
				break;
			}
			case CHANGE_ACTION.DELETE: {
				const { id } = event.payload as NodeRemovedPayload;
				if (id) {
					removePortEntry(id);
				} else {
					// removeAllNodes fires DELETE with empty payload
					reconcilePortEntries([]);
				}
				break;
			}
			case CHANGE_ACTION.SET: {
				const { nodeIds } = event.payload as NodesSetPayload;
				reconcilePortEntries(nodeIds);
				break;
			}
		}
	});

	// Initial reconciliation for nodes that exist before event subscription
	reconcilePortEntries(deps.nodes.value.map((n) => n.id));

	return {
		render: {
			nodeInputsByNodeId,
			nodeOutputsByNodeId,
		},
	};
}
