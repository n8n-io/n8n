import { computed, onScopeDispose } from 'vue';
import { createEventHook } from '@vueuse/core';
import type { CRDTDoc, CRDTMap, DeepChange } from '@n8n/crdt/browser';
import { isMapChange } from '@n8n/crdt/browser';
import { useCRDTSync } from './useCRDTSync';
import type {
	WorkflowDocument,
	WorkflowNode,
	WorkflowEdge,
	NodePositionChange,
	NodeParamsChange,
} from '../types/workflowDocument.types';

export interface UseCrdtWorkflowDocOptions {
	/** Document/workflow ID */
	docId: string;
	/** Auto-connect on creation. Default: true */
	immediate?: boolean;
}

/**
 * CRDT-backed workflow document implementation.
 *
 * Provides raw workflow data from a CRDT document with real-time sync.
 * Implements WorkflowDocument interface - no Vue Flow types here.
 *
 * @example
 * ```ts
 * const doc = useCrdtWorkflowDoc({ docId: 'workflow-123' });
 *
 * // Wait for ready
 * await doc.connect();
 *
 * // Read nodes
 * const nodes = doc.getNodes();
 *
 * // Update position (syncs to other users)
 * doc.updateNodePosition('node-1', [100, 200]);
 * ```
 */
export function useCrdtWorkflowDoc(options: UseCrdtWorkflowDocOptions): WorkflowDocument {
	const { docId, immediate = true } = options;

	// Use existing CRDT sync composable
	const crdt = useCRDTSync({ docId, immediate });

	// Map CRDT state to WorkflowDocumentState (disconnected → idle)
	const state = computed(() => (crdt.state.value === 'disconnected' ? 'idle' : crdt.state.value));
	const isReady = computed(() => state.value === 'ready');

	// CRDT doc reference (not reactive - it's a class instance)
	let doc: CRDTDoc | null = null;

	// Event hooks for remote changes (VueUse pattern - auto-cleanup on scope dispose)
	const nodeAddedHook = createEventHook<WorkflowNode>();
	const nodeRemovedHook = createEventHook<string>();
	const nodePositionHook = createEventHook<NodePositionChange>();
	const nodeParamsHook = createEventHook<NodeParamsChange>();

	// Cleanup function for nodes map subscription
	let unsubscribeNodesChange: (() => void) | null = null;

	// --- Helpers ---

	function getCrdtNode(nodeId: string): CRDTMap<unknown> | undefined {
		if (!doc) return undefined;
		return doc.getMap('nodes').get(nodeId) as CRDTMap<unknown> | undefined;
	}

	function crdtNodeToWorkflowNode(id: string, crdtNode: CRDTMap<unknown>): WorkflowNode {
		const position = crdtNode.get('position') as [number, number] | undefined;
		const name = crdtNode.get('name') as string | undefined;
		const type = crdtNode.get('type') as string | undefined;
		const parameters = crdtNode.get('parameters') as Record<string, unknown> | undefined;

		return {
			id,
			position: position ?? [0, 0],
			name: name ?? id,
			type: type ?? 'unknown',
			parameters: parameters ?? {},
		};
	}

	// --- Change Handling ---

	function handleChanges(changes: DeepChange[], origin: 'local' | 'remote'): void {
		if (!doc) return;

		const nodesMap = doc.getMap('nodes');

		for (const change of changes) {
			if (!isMapChange(change)) continue;

			const [nodeId, ...rest] = change.path;
			if (typeof nodeId !== 'string') continue;

			if (rest.length === 0) {
				// Top-level node change (add/delete entire node)
				if (change.action === 'add') {
					// Add: trigger for both local + remote (local needs Vue Flow update)
					const crdtNode = nodesMap.get(nodeId) as CRDTMap<unknown> | undefined;
					if (crdtNode) {
						const node = crdtNodeToWorkflowNode(nodeId, crdtNode);
						void nodeAddedHook.trigger(node);
					}
				} else if (change.action === 'delete' && origin === 'remote') {
					// Delete: only remote (local already removed from Vue Flow)
					void nodeRemovedHook.trigger(nodeId);
				}
			} else if (origin === 'remote') {
				// Nested property changes: only remote (local UI already updated)
				const prop = rest[0];

				if (prop === 'position' && Array.isArray(change.value)) {
					const position = change.value as [number, number];
					void nodePositionHook.trigger({ nodeId, position });
				} else if (prop === 'parameters' && typeof change.value === 'object') {
					const params = change.value as Record<string, unknown>;
					void nodeParamsHook.trigger({ nodeId, params });
				}
			}
		}
	}

	// Handle CRDT document ready
	crdt.onReady((crdtDoc) => {
		doc = crdtDoc;

		const nodesMap = doc.getMap('nodes');

		// Subscribe to deep changes on nodes map
		// Local add needs Vue Flow update; remote changes need Vue Flow update
		unsubscribeNodesChange = nodesMap.onDeepChange((changes, origin) => {
			handleChanges(changes, origin);
		});
	});

	// --- Data Access ---

	function getNodes(): WorkflowNode[] {
		if (!doc) return [];

		const nodesMap = doc.getMap('nodes');
		const nodes: WorkflowNode[] = [];

		for (const [id, value] of nodesMap.entries()) {
			if (value && typeof value === 'object') {
				nodes.push(crdtNodeToWorkflowNode(id, value as CRDTMap<unknown>));
			}
		}

		return nodes;
	}

	function getEdges(): WorkflowEdge[] {
		// Future implementation
		return [];
	}

	// --- Mutations ---

	function addNode(node: WorkflowNode): void {
		if (!doc) return;

		doc.transact(() => {
			const nodesMap = doc!.getMap('nodes');
			const crdtNode = doc!.createMap();
			crdtNode.set('position', node.position);
			crdtNode.set('name', node.name);
			crdtNode.set('type', node.type);
			crdtNode.set('parameters', node.parameters);
			nodesMap.set(node.id, crdtNode);
		});
		// Hook triggers via onDeepChange subscription (handles both local + remote)
	}

	function removeNode(nodeId: string): void {
		if (!doc) return;

		doc.transact(() => {
			doc?.getMap('nodes').delete(nodeId);
		});
		// No hook trigger - Vue Flow already removed the node before calling this
	}

	function updateNodePosition(nodeId: string, position: [number, number]): void {
		if (!doc) return;

		doc.transact(() => {
			const crdtNode = getCrdtNode(nodeId);
			if (crdtNode) {
				crdtNode.set('position', position);
			}
		});
	}

	function updateNodeParams(nodeId: string, params: Record<string, unknown>): void {
		if (!doc) return;

		doc.transact(() => {
			const crdtNode = getCrdtNode(nodeId);
			if (crdtNode) {
				crdtNode.set('parameters', params);
			}
		});
	}

	// --- Lifecycle ---

	async function connect(): Promise<void> {
		await crdt.connect();
	}

	function disconnect(): void {
		unsubscribeNodesChange?.();
		unsubscribeNodesChange = null;
		crdt.disconnect();
		doc = null;
	}

	// Auto-cleanup on scope dispose
	onScopeDispose(() => {
		disconnect();
	});

	return {
		workflowId: docId,
		state,
		error: crdt.error,
		isReady,
		connect,
		disconnect,
		getNodes,
		getEdges,
		addNode,
		removeNode,
		updateNodePosition,
		updateNodeParams,
		onNodeAdded: nodeAddedHook.on,
		onNodeRemoved: nodeRemovedHook.on,
		onNodePositionChange: nodePositionHook.on,
		onNodeParamsChange: nodeParamsHook.on,
	};
}
