import { ref, computed, onScopeDispose } from 'vue';
import { createEventHook } from '@vueuse/core';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import type { INodeUi } from '@/Interface';
import type { IConnections } from 'n8n-workflow';
import type {
	WorkflowDocument,
	WorkflowDocumentState,
	WorkflowNode,
	WorkflowEdge,
	NodePositionChange,
	NodeParamsChange,
	NodeHandlesChange,
	NodeSizeChange,
	NodeSubtitleChange,
	NodeDisabledChange,
	NodeNameChange,
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

	// Generate unique instance ID for this view (for Vue Flow and awareness)
	const instanceId = crypto.randomUUID();

	// Internal state
	const nodesCache = ref<WorkflowNode[]>([]);
	const edgesCache = ref<WorkflowEdge[]>([]);
	const state = ref<WorkflowDocumentState>('idle');
	const error = ref<string | null>(null);
	const isReady = computed(() => state.value === 'ready');

	// Undo/redo not supported in REST mode
	const canUndo = ref(false);
	const canRedo = ref(false);
	const undo = () => false;
	const redo = () => false;

	// Transform n8n INodeUi to WorkflowNode format
	function transformNode(node: INodeUi): WorkflowNode {
		return {
			id: node.id,
			position: [node.position[0], node.position[1]],
			name: node.name,
			type: node.type,
			typeVersion: node.typeVersion,
			parameters: node.parameters,
			disabled: node.disabled,
		};
	}

	/**
	 * Convert IConnections (n8n format, keyed by node name) to WorkflowEdge[] (Vue Flow format, keyed by node ID).
	 * IConnections structure:
	 * {
	 *   [sourceNodeName]: {
	 *     [connectionType]: [ // array indexed by output index
	 *       [{ node: targetNodeName, type: targetType, index: targetIndex }],
	 *       null,
	 *       [{ node: anotherTargetName, type: "main", index: 0 }]
	 *     ]
	 *   }
	 * }
	 */
	function transformConnections(connections: IConnections, nodes: INodeUi[]): WorkflowEdge[] {
		const edges: WorkflowEdge[] = [];

		// Build name → id lookup
		const nodeIdByName = new Map<string, string>();
		for (const node of nodes) {
			nodeIdByName.set(node.name, node.id);
		}

		// Iterate through all connections
		for (const [sourceNodeName, nodeConnections] of Object.entries(connections)) {
			const sourceId = nodeIdByName.get(sourceNodeName);
			if (!sourceId) continue;

			for (const [connectionType, outputIndexes] of Object.entries(nodeConnections)) {
				if (!outputIndexes) continue;

				outputIndexes.forEach((targetConnections, outputIndex) => {
					if (!targetConnections) return;

					for (const targetConnection of targetConnections) {
						const targetId = nodeIdByName.get(targetConnection.node);
						if (!targetId) continue;

						const sourceHandle = `outputs/${connectionType}/${outputIndex}`;
						const targetHandle = `inputs/${targetConnection.type}/${targetConnection.index}`;
						const edgeId = `[${sourceId}/${sourceHandle}][${targetId}/${targetHandle}]`;

						edges.push({
							id: edgeId,
							source: sourceId,
							target: targetId,
							sourceHandle,
							targetHandle,
						});
					}
				});
			}
		}

		return edges;
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

			// Transform connections to WorkflowEdge format
			edgesCache.value = transformConnections(workflow.connections, workflow.nodes);

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
		edgesCache.value = [];
		error.value = null;
	}

	// --- Data Access ---

	function getNodes(): WorkflowNode[] {
		return nodesCache.value;
	}

	function getEdges(): WorkflowEdge[] {
		return edgesCache.value;
	}

	// --- Edge Mutations (local only - not saved to server) ---

	function addEdge(edge: WorkflowEdge): void {
		edgesCache.value = [...edgesCache.value, edge];
	}

	function removeEdge(edgeId: string): void {
		edgesCache.value = edgesCache.value.filter((e) => e.id !== edgeId);
	}

	// --- Mutations (local only - not saved to server) ---

	function addNode(node: WorkflowNode): void {
		nodesCache.value = [...nodesCache.value, node];
	}

	function addNodes(nodes: WorkflowNode[]): void {
		nodesCache.value = [...nodesCache.value, ...nodes];
	}

	function addNodesAndEdges(nodes: WorkflowNode[], edges: WorkflowEdge[]): void {
		nodesCache.value = [...nodesCache.value, ...nodes];
		edgesCache.value = [...edgesCache.value, ...edges];
	}

	function removeNode(nodeId: string): void {
		nodesCache.value = nodesCache.value.filter((n) => n.id !== nodeId);
	}

	function removeNodesAndEdges(
		nodeIds: string[],
		edgeIds: string[],
		reconnections: WorkflowEdge[],
	): void {
		// Add reconnection edges first, then remove old edges and nodes
		edgesCache.value = [
			...edgesCache.value.filter((e) => !edgeIds.includes(e.id)),
			...reconnections,
		];
		nodesCache.value = nodesCache.value.filter((n) => !nodeIds.includes(n.id));
	}

	function updateNodePositions(updates: NodePositionChange[]): void {
		if (updates.length === 0) return;

		const updated = [...nodesCache.value];
		for (const { nodeId, position } of updates) {
			const idx = updated.findIndex((n) => n.id === nodeId);
			if (idx !== -1) {
				updated[idx] = { ...updated[idx], position };
			}
		}
		nodesCache.value = updated;
	}

	function updateNodeParams(nodeId: string, params: Record<string, unknown>): void {
		const idx = nodesCache.value.findIndex((n) => n.id === nodeId);
		if (idx !== -1) {
			const updated = [...nodesCache.value];
			updated[idx] = { ...updated[idx], parameters: params };
			nodesCache.value = updated;
		}
	}

	function setNodeDisabled(nodeId: string, disabled: boolean): void {
		const idx = nodesCache.value.findIndex((n) => n.id === nodeId);
		if (idx !== -1) {
			const updated = [...nodesCache.value];
			updated[idx] = { ...updated[idx], disabled };
			nodesCache.value = updated;
		}
	}

	function findNode(nodeId: string): WorkflowNode | undefined {
		return nodesCache.value.find((n) => n.id === nodeId);
	}

	// Event hooks for remote changes (never fire for REST - single user mode)
	const nodeAddedHook = createEventHook<WorkflowNode>();
	const nodeRemovedHook = createEventHook<string>();
	const nodePositionHook = createEventHook<NodePositionChange>();
	const nodeParamsHook = createEventHook<NodeParamsChange>();
	const nodeHandlesHook = createEventHook<NodeHandlesChange>();
	const nodeSizeHook = createEventHook<NodeSizeChange>();
	const nodeSubtitleHook = createEventHook<NodeSubtitleChange>();
	const nodeDisabledHook = createEventHook<NodeDisabledChange>();
	const nodeNameHook = createEventHook<NodeNameChange>();
	const edgeAddedHook = createEventHook<WorkflowEdge>();
	const edgeRemovedHook = createEventHook<string>();
	const edgesChangedHook = createEventHook<undefined>(); // Fires for ALL edge changes

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
		instanceId,
		state,
		error,
		isReady,
		canUndo,
		canRedo,
		undo,
		redo,
		connect,
		disconnect,
		getNodes,
		getEdges,
		addNode,
		addNodes,
		addNodesAndEdges,
		removeNode,
		removeNodesAndEdges,
		updateNodePositions,
		updateNodeParams,
		setNodeDisabled,
		addEdge,
		removeEdge,
		onNodeAdded: nodeAddedHook.on,
		onNodeRemoved: nodeRemovedHook.on,
		onNodePositionChange: nodePositionHook.on,
		onNodeParamsChange: nodeParamsHook.on,
		onNodeHandlesChange: nodeHandlesHook.on,
		onNodeSizeChange: nodeSizeHook.on,
		onNodeSubtitleChange: nodeSubtitleHook.on,
		onNodeDisabledChange: nodeDisabledHook.on,
		onNodeNameChange: nodeNameHook.on,
		onEdgeAdded: edgeAddedHook.on,
		onEdgeRemoved: edgeRemovedHook.on,
		onEdgesChanged: edgesChangedHook.on,
		findNode,
		// No awareness for REST documents (single user mode)
		awareness: null,
	};
}
