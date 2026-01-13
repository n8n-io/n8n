import { reactive, computed, onScopeDispose, inject } from 'vue';
import type { CRDTAwareness, AwarenessChangeEvent, ChangeOrigin } from '@n8n/crdt/browser';
import type {
	AwarenessUser,
	AwarenessCursor,
	AwarenessActivity,
	DraggingNode,
	WorkflowAwarenessState,
	Collaborator,
	UseWorkflowAwarenessReturn,
} from '../types/awareness.types';
import { WorkflowAwarenessKey } from '../types/awareness.types';

export interface UseWorkflowAwarenessOptions {
	/** The CRDT awareness instance from useCRDTSync */
	awareness: CRDTAwareness<WorkflowAwarenessState> | null;
}

/**
 * Composable for managing workflow awareness (presence, cursors, selections, dragging).
 *
 * Awareness is ephemeral state that syncs between collaborators but is not persisted.
 * Use it for:
 * - Showing who is online
 * - Displaying cursor positions
 * - Highlighting selected nodes
 * - Real-time drag feedback (before committing to CRDT)
 *
 * @example
 * ```ts
 * const crdt = useCRDTSync({ docId: 'workflow-123' });
 * const awareness = useWorkflowAwareness({ awareness: crdt.awareness });
 *
 * // Set user info once connected
 * awareness.setUser({ id: 'user-1', name: 'Alice', color: '#ff5733' });
 *
 * // Update cursor on mouse move
 * canvas.onMouseMove((e) => awareness.updateCursor({ x: e.x, y: e.y }));
 *
 * // Update selection when nodes are selected
 * instance.onSelectionChange((nodes) => awareness.updateSelection(nodes.map(n => n.id)));
 *
 * // Update dragging during drag (ephemeral - no CRDT transaction)
 * instance.onNodeDrag((e) => {
 *   awareness.updateDragging(e.nodes.map(n => ({ nodeId: n.id, position: [n.position.x, n.position.y] })));
 * });
 *
 * // Clear dragging when done (commit to CRDT separately)
 * instance.onNodeDragStop(() => awareness.updateDragging([]));
 * ```
 */
export function useWorkflowAwareness(
	options: UseWorkflowAwarenessOptions,
): UseWorkflowAwarenessReturn {
	const { awareness } = options;

	// Reactive Map - mutations to entries don't trigger full re-renders
	const collaboratorsMap = reactive(new Map<number, Collaborator>());

	const isReady = computed(() => awareness !== null);
	const clientId = computed(() => awareness?.clientId ?? null);
	const collaboratorCount = computed(() => collaboratorsMap.size + (isReady.value ? 1 : 0));

	// Track unsubscribe function
	let unsubscribe: (() => void) | null = null;

	/**
	 * Handle awareness changes - mutate map in-place for efficiency.
	 */
	function handleAwarenessChange(event: AwarenessChangeEvent, _origin: ChangeOrigin): void {
		if (!awareness) return;

		const myClientId = awareness.clientId;
		const { added, updated, removed } = event;

		// Handle removed clients
		for (const cid of removed) {
			if (cid !== myClientId) {
				collaboratorsMap.delete(cid);
			}
		}

		// Handle added clients
		for (const cid of added) {
			if (cid === myClientId) continue;

			const state = awareness.getStates().get(cid);
			if (!state) continue;

			collaboratorsMap.set(cid, { clientId: cid, state: { ...state } });
		}

		// Handle updated clients - mutate state properties in-place
		for (const cid of updated) {
			if (cid === myClientId) continue;

			const state = awareness.getStates().get(cid);
			if (!state) {
				collaboratorsMap.delete(cid);
				continue;
			}

			const existing = collaboratorsMap.get(cid);
			if (existing) {
				// Mutate in-place - Vue tracks property changes on reactive Map values
				Object.assign(existing.state, state);
			} else {
				collaboratorsMap.set(cid, { clientId: cid, state: { ...state } });
			}
		}
	}

	/**
	 * Initialize collaborators from current awareness state.
	 */
	function initializeCollaborators(): void {
		if (!awareness) return;

		const states = awareness.getStates();
		const myClientId = awareness.clientId;

		collaboratorsMap.clear();
		for (const [cid, state] of states) {
			if (cid === myClientId) continue;
			if (!state) continue;
			collaboratorsMap.set(cid, { clientId: cid, state: { ...state } });
		}
	}

	// Subscribe to awareness changes if available
	if (awareness) {
		unsubscribe = awareness.onChange(handleAwarenessChange);
		// Initial update
		initializeCollaborators();
	}

	// --- Local state setters ---

	function setUser(user: AwarenessUser): void {
		if (!awareness) return;

		const currentState = awareness.getLocalState();
		awareness.setLocalState({
			user,
			cursor: currentState?.cursor ?? null,
			selection: currentState?.selection ?? { nodeIds: [] },
			activity: currentState?.activity ?? 'active',
			lastActive: Date.now(),
			dragging: currentState?.dragging ?? [],
		});
	}

	function updateCursor(cursor: AwarenessCursor | null): void {
		if (!awareness) return;
		awareness.setLocalStateField('cursor', cursor);
		awareness.setLocalStateField('lastActive', Date.now());
	}

	function updateSelection(nodeIds: string[]): void {
		if (!awareness) return;
		awareness.setLocalStateField('selection', { nodeIds });
		awareness.setLocalStateField('lastActive', Date.now());
	}

	function updateActivity(activity: AwarenessActivity): void {
		if (!awareness) return;
		awareness.setLocalStateField('activity', activity);
		awareness.setLocalStateField('lastActive', Date.now());
	}

	function markActive(): void {
		if (!awareness) return;
		awareness.setLocalStateField('activity', 'active');
		awareness.setLocalStateField('lastActive', Date.now());
	}

	function updateDragging(nodes: DraggingNode[]): void {
		if (!awareness) return;
		awareness.setLocalStateField('dragging', nodes);
		awareness.setLocalStateField('lastActive', Date.now());
	}

	/**
	 * Get ephemeral drag position for a node from any collaborator.
	 * Returns undefined if no one is dragging this node.
	 */
	function getDraggingPosition(nodeId: string): [number, number] | undefined {
		for (const collaborator of collaboratorsMap.values()) {
			const draggingNode = collaborator.state.dragging.find((d) => d.nodeId === nodeId);
			if (draggingNode) {
				return draggingNode.position;
			}
		}
		return undefined;
	}

	// Cleanup on scope dispose
	onScopeDispose(() => {
		unsubscribe?.();
	});

	return {
		clientId,
		collaborators: collaboratorsMap,
		collaboratorCount,
		isReady,
		setUser,
		updateCursor,
		updateSelection,
		updateActivity,
		markActive,
		updateDragging,
		getDraggingPosition,
	};
}

/**
 * Inject workflow awareness from parent provider.
 * Throws if not provided.
 */
export function useWorkflowAwarenessInject(): UseWorkflowAwarenessReturn {
	const awareness = inject(WorkflowAwarenessKey);
	if (!awareness) {
		throw new Error('useWorkflowAwarenessInject must be used within a workflow awareness provider');
	}
	return awareness;
}

/**
 * Inject workflow awareness, returning undefined if not provided.
 */
export function useWorkflowAwarenessOptional(): UseWorkflowAwarenessReturn | undefined {
	return inject(WorkflowAwarenessKey);
}
