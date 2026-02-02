import { reactive, computed, onScopeDispose, inject } from 'vue';
import { createEventHook } from '@vueuse/core';
import type { CRDTAwareness, AwarenessChangeEvent, ChangeOrigin } from '@n8n/crdt';
import type {
	AwarenessUser,
	AwarenessCursor,
	AwarenessActivity,
	DraggingNode,
	WorkflowAwarenessState,
	Collaborator,
	UseWorkflowAwarenessReturn,
	CollaboratorDraggingChange,
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

	// Reactive reverse index: nodeId -> users selecting it
	// Imperatively maintained - only updates when selections change, not on cursor moves
	const nodeIdToSelectingUsers = reactive(new Map<string, AwarenessUser[]>());

	/**
	 * Update the selection index when a user's selection changes.
	 * Only mutates the Map for nodes that actually changed.
	 */
	function updateSelectionIndex(
		user: AwarenessUser,
		oldNodeIds: string[],
		newNodeIds: string[],
	): void {
		// Remove user from old selections
		for (const nodeId of oldNodeIds) {
			if (newNodeIds.includes(nodeId)) continue; // Still selected, skip
			const users = nodeIdToSelectingUsers.get(nodeId);
			if (users) {
				const filtered = users.filter((u) => u.id !== user.id);
				if (filtered.length === 0) {
					nodeIdToSelectingUsers.delete(nodeId);
				} else {
					nodeIdToSelectingUsers.set(nodeId, filtered);
				}
			}
		}

		// Add user to new selections
		for (const nodeId of newNodeIds) {
			if (oldNodeIds.includes(nodeId)) continue; // Already tracked, skip
			const users = nodeIdToSelectingUsers.get(nodeId) ?? [];
			nodeIdToSelectingUsers.set(nodeId, [...users, user]);
		}
	}

	/**
	 * Check if two string arrays have the same elements (order-insensitive).
	 */
	function arraysEqual(a: string[], b: string[]): boolean {
		if (a.length !== b.length) return false;
		const setA = new Set(a);
		return b.every((item) => setA.has(item));
	}

	const isReady = computed(() => awareness !== null);
	const clientId = computed(() => awareness?.clientId ?? null);
	const collaboratorCount = computed(() => collaboratorsMap.size + (isReady.value ? 1 : 0));

	// Event hooks for awareness changes
	const collaboratorJoinHook = createEventHook<Collaborator>();
	const collaboratorLeaveHook = createEventHook<Collaborator>();
	const draggingChangeHook = createEventHook<CollaboratorDraggingChange>();

	// Track unsubscribe function
	let unsubscribe: (() => void) | null = null;

	/**
	 * Handle awareness changes - mutate map in-place for efficiency.
	 */
	function handleAwarenessChange(event: AwarenessChangeEvent, _origin: ChangeOrigin): void {
		if (!awareness) return;

		const myClientId = awareness.clientId;
		const { added, updated, removed } = event;

		// Early return: skip entirely when only our own state changed
		// This happens frequently during drag/cursor moves and has no effect on collaborators map
		const hasOtherClients =
			added.some((cid) => cid !== myClientId) ||
			updated.some((cid) => cid !== myClientId) ||
			removed.some((cid) => cid !== myClientId);

		if (!hasOtherClients) return;

		// Handle removed clients
		for (const cid of removed) {
			if (cid === myClientId) continue;

			const existing = collaboratorsMap.get(cid);
			if (existing) {
				// Remove from selection index before deleting
				updateSelectionIndex(existing.state.user, existing.state.selection.nodeIds, []);
				collaboratorsMap.delete(cid);
				void collaboratorLeaveHook.trigger(existing);
			}
		}

		// Handle added clients
		for (const cid of added) {
			if (cid === myClientId) continue;

			const state = awareness.getStates().get(cid);
			if (!state) continue;

			const collaborator: Collaborator = { clientId: cid, state: { ...state } };
			collaboratorsMap.set(cid, collaborator);
			// Add to selection index
			updateSelectionIndex(state.user, [], state.selection.nodeIds);
			void collaboratorJoinHook.trigger(collaborator);
		}

		// Handle updated clients - mutate state properties in-place
		for (const cid of updated) {
			if (cid === myClientId) continue;

			const state = awareness.getStates().get(cid);
			if (!state) {
				const existing = collaboratorsMap.get(cid);
				if (existing) {
					// Remove from selection index before deleting
					updateSelectionIndex(existing.state.user, existing.state.selection.nodeIds, []);
					collaboratorsMap.delete(cid);
					void collaboratorLeaveHook.trigger(existing);
				}
				continue;
			}

			const existing = collaboratorsMap.get(cid);
			if (existing) {
				// Update selection index only if selection changed (not on cursor moves)
				const oldNodeIds = existing.state.selection.nodeIds;
				const newNodeIds = state.selection.nodeIds;
				if (!arraysEqual(oldNodeIds, newNodeIds)) {
					updateSelectionIndex(existing.state.user, oldNodeIds, newNodeIds);
				}

				// Mutate in-place - Vue tracks property changes on reactive Map values
				Object.assign(existing.state, state);

				// Emit dragging change for imperative Vue Flow updates
				void draggingChangeHook.trigger({
					collaborator: existing,
					nodes: state.dragging,
				});
			} else {
				const collaborator: Collaborator = { clientId: cid, state: { ...state } };
				collaboratorsMap.set(cid, collaborator);
				// Add to selection index
				updateSelectionIndex(state.user, [], state.selection.nodeIds);
				void collaboratorJoinHook.trigger(collaborator);
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
		nodeIdToSelectingUsers.clear();
		for (const [cid, state] of states) {
			if (cid === myClientId) continue;
			if (!state) continue;
			collaboratorsMap.set(cid, { clientId: cid, state: { ...state } });
			// Populate selection index
			updateSelectionIndex(state.user, [], state.selection.nodeIds);
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
		nodeIdToSelectingUsers,
		onCollaboratorJoin: collaboratorJoinHook.on,
		onCollaboratorLeave: collaboratorLeaveHook.on,
		onDraggingChange: draggingChangeHook.on,
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
