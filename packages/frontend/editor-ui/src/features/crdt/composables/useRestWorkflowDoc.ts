import { ref, computed, onScopeDispose } from 'vue';
import { createEventHook } from '@vueuse/core';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import type { INodeUi } from '@/Interface';
import type {
	WorkflowDocument,
	WorkflowDocumentState,
	WorkflowNode,
	WorkflowEdge,
	NodePositionChange,
	NodeParamsChange,
} from '../types/workflowDocument.types';

export interface UseRestWorkflowDocOptions {
	/** Workflow ID to fetch */
	workflowId: string;
	/** Auto-connect on creation. Default: true */
	immediate?: boolean;
}

/**
 * REST-backed workflow document implementation.
 *
 * Fetches workflow from the server via REST API.
 * Mutations are local-only (no save back to server).
 * Remote change events never fire (single user mode).
 *
 * @example
 * ```ts
 * const doc = useRestWorkflowDoc({ workflowId: 'workflow-123' });
 *
 * // Wait for data to load
 * await doc.connect();
 *
 * // Read nodes
 * const nodes = doc.getNodes();
 *
 * // Update position (local only - not saved to server)
 * doc.updateNodePosition('node-1', [100, 200]);
 * ```
 */
export function useRestWorkflowDoc(options: UseRestWorkflowDocOptions): WorkflowDocument {
	const { workflowId, immediate = true } = options;

	const workflowsStore = useWorkflowsStore();

	// Internal state
	const nodesCache = ref<WorkflowNode[]>([]);
	const state = ref<WorkflowDocumentState>('idle');
	const error = ref<string | null>(null);
	const isReady = computed(() => state.value === 'ready');

	// Transform n8n INodeUi to WorkflowNode format
	function transformNode(node: INodeUi): WorkflowNode {
		return {
			id: node.id,
			position: [node.position[0], node.position[1]],
			name: node.name,
			type: node.type,
			typeVersion: node.typeVersion,
			parameters: node.parameters,
		};
	}

	async function connect(): Promise<void> {
		if (state.value === 'ready' || state.value === 'connecting') {
			return;
		}

		state.value = 'connecting';
		error.value = null;

		try {
			// Fetch workflow from API
			const workflow = await workflowsStore.fetchWorkflow(workflowId);

			// Transform nodes to WorkflowNode format
			nodesCache.value = workflow.nodes.map(transformNode);

			state.value = 'ready';
		} catch (err) {
			state.value = 'error';
			error.value = err instanceof Error ? err.message : String(err);
			throw err;
		}
	}

	function disconnect(): void {
		state.value = 'idle';
		nodesCache.value = [];
		error.value = null;
	}

	// --- Data Access ---

	function getNodes(): WorkflowNode[] {
		return nodesCache.value;
	}

	function getEdges(): WorkflowEdge[] {
		// Future implementation
		return [];
	}

	// --- Mutations (local only - not saved to server) ---

	function addNode(node: WorkflowNode): void {
		nodesCache.value = [...nodesCache.value, node];
	}

	function addNodes(nodes: WorkflowNode[]): void {
		nodesCache.value = [...nodesCache.value, ...nodes];
	}

	function removeNode(nodeId: string): void {
		nodesCache.value = nodesCache.value.filter((n) => n.id !== nodeId);
	}

	function updateNodePosition(nodeId: string, position: [number, number]): void {
		const idx = nodesCache.value.findIndex((n) => n.id === nodeId);
		if (idx !== -1) {
			const updated = [...nodesCache.value];
			updated[idx] = { ...updated[idx], position };
			nodesCache.value = updated;
		}
	}

	function updateNodeParams(nodeId: string, params: Record<string, unknown>): void {
		const idx = nodesCache.value.findIndex((n) => n.id === nodeId);
		if (idx !== -1) {
			const updated = [...nodesCache.value];
			updated[idx] = { ...updated[idx], parameters: params };
			nodesCache.value = updated;
		}
	}

	// Event hooks for remote changes (never fire for REST - single user mode)
	const nodeAddedHook = createEventHook<WorkflowNode>();
	const nodeRemovedHook = createEventHook<string>();
	const nodePositionHook = createEventHook<NodePositionChange>();
	const nodeParamsHook = createEventHook<NodeParamsChange>();

	// Auto-cleanup on scope dispose
	onScopeDispose(() => {
		disconnect();
	});

	// Auto-connect if immediate
	if (immediate) {
		void connect();
	}

	return {
		workflowId,
		state,
		error,
		isReady,
		connect,
		disconnect,
		getNodes,
		getEdges,
		addNode,
		addNodes,
		removeNode,
		updateNodePosition,
		updateNodeParams,
		onNodeAdded: nodeAddedHook.on,
		onNodeRemoved: nodeRemovedHook.on,
		onNodePositionChange: nodePositionHook.on,
		onNodeParamsChange: nodeParamsHook.on,
	};
}
