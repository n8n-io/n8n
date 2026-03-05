import { computed } from 'vue';
import { createEventHook } from '@vueuse/core';
import type { INodeUi } from '@/Interface';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import { CHANGE_ACTION } from './types';
import type { ChangeEvent } from './types';

// --- Event types ---

export type NodeAddedPayload = { node: INodeUi };
export type NodeRemovedPayload = { name: string; id: string };

export type NodesChangeEvent = ChangeEvent<NodeAddedPayload> | ChangeEvent<NodeRemovedPayload>;

// --- Composable ---

// TODO: Inject workflowsStore as a dep once the facade owns its own refs (Phase C).
// Direct import is an intentional deviation during the delegation/migration phase.
export function useWorkflowDocumentNodes() {
	const workflowsStore = useWorkflowsStore();

	const onNodesChange = createEventHook<NodesChangeEvent>();
	// eslint-disable-next-line @typescript-eslint/no-invalid-void-type
	const onStateDirty = createEventHook<void>();

	// -----------------------------------------------------------------------
	// Apply methods — CRDT entry point in Phase C. Today they just delegate.
	// -----------------------------------------------------------------------

	function applySetNodes(nodes: INodeUi[]) {
		workflowsStore.setNodes(nodes);
	}

	function applyAddNode(node: INodeUi) {
		workflowsStore.addNode(node);
		void onNodesChange.trigger({
			action: CHANGE_ACTION.ADD,
			payload: { node },
		});
		void onStateDirty.trigger();
	}

	function applyRemoveNode(node: INodeUi) {
		workflowsStore.removeNode(node);
		void onNodesChange.trigger({
			action: CHANGE_ACTION.DELETE,
			payload: { name: node.name, id: node.id },
		});
		void onStateDirty.trigger();
	}

	function applyRemoveNodeById(id: string) {
		const node = workflowsStore.getNodeById(id);
		workflowsStore.removeNodeById(id);
		void onNodesChange.trigger({
			action: CHANGE_ACTION.DELETE,
			payload: { name: node?.name ?? '', id },
		});
		void onStateDirty.trigger();
	}

	// -----------------------------------------------------------------------
	// Read API
	// -----------------------------------------------------------------------

	const allNodes = computed<INodeUi[]>(() => workflowsStore.allNodes);

	const nodesByName = computed<Record<string, INodeUi>>(() => workflowsStore.nodesByName);

	function getNodeById(id: string): INodeUi | undefined {
		return workflowsStore.getNodeById(id);
	}

	function getNodeByName(name: string): INodeUi | null {
		return workflowsStore.getNodeByName(name);
	}

	function getNodes(): INodeUi[] {
		return workflowsStore.getNodes();
	}

	function getNodesByIds(ids: string[]): INodeUi[] {
		return workflowsStore.getNodesByIds(ids);
	}

	// -----------------------------------------------------------------------
	// Write API
	// -----------------------------------------------------------------------

	function setNodes(nodes: INodeUi[]): void {
		applySetNodes(nodes);
	}

	function addNode(node: INodeUi): void {
		applyAddNode(node);
	}

	function removeNode(node: INodeUi): void {
		applyRemoveNode(node);
	}

	function removeNodeById(id: string): void {
		applyRemoveNodeById(id);
	}

	return {
		// Read
		allNodes,
		nodesByName,
		getNodeById,
		getNodeByName,
		getNodes,
		getNodesByIds,

		// Write
		setNodes,
		addNode,
		removeNode,
		removeNodeById,

		// Events
		onNodesChange: onNodesChange.on,
		onStateDirty: onStateDirty.on,
	};
}
