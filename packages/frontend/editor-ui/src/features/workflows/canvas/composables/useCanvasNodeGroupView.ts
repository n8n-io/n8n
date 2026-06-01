import { computed, getCurrentScope, onScopeDispose, ref, type ComputedRef, type Ref } from 'vue';
import type { IWorkflowGroup } from 'n8n-workflow';
import type { NodeGroupChangeEvent } from '@/app/stores/workflowDocument/useWorkflowDocumentNodeGroups';
import { CHANGE_ACTION } from '@/app/stores/workflowDocument/types';

export type GroupChangeUnsubscribe = () => void;

export interface UseCanvasNodeGroupViewDeps {
	allGroups: ComputedRef<IWorkflowGroup[]> | Ref<IWorkflowGroup[]>;
	onNodeGroupsChange: (
		handler: (event: NodeGroupChangeEvent) => unknown,
	) => GroupChangeUnsubscribe | unknown;
}

/**
 * Canvas view-state for group collapse/expand. Lives separately from the
 * workflow document store because collapse is not workflow data — it does
 * not dirty the document, does not enter undo, and is not serialized.
 */
export function useCanvasNodeGroupView(deps: UseCanvasNodeGroupViewDeps) {
	const collapsedIds = ref<Set<string>>(new Set(deps.allGroups.value.map((g) => g.id)));

	function applySetCollapsed(id: string, value: boolean) {
		if (collapsedIds.value.has(id) === value) return;
		const next = new Set(collapsedIds.value);
		if (value) next.add(id);
		else next.delete(id);
		collapsedIds.value = next;
	}

	function setCollapsed(id: string, value: boolean) {
		applySetCollapsed(id, value);
	}

	function toggleCollapsed(id: string) {
		applySetCollapsed(id, !collapsedIds.value.has(id));
	}

	function collapseAll() {
		collapsedIds.value = new Set(deps.allGroups.value.map((g) => g.id));
	}

	function expandAll() {
		collapsedIds.value = new Set();
	}

	const isGroupCollapsed = (id: string) => collapsedIds.value.has(id);

	// Default collapse state per change action: SET (workflow load /
	// replacement) collapses every group; ADD (new group) starts expanded;
	// DELETE removes the id; UPDATE leaves collapse state alone.
	const unsubscribe = deps.onNodeGroupsChange((event) => {
		if (event.action === CHANGE_ACTION.SET) {
			collapsedIds.value = new Set(event.payload.groups.map((g) => g.id));
		} else if (event.action === CHANGE_ACTION.ADD) {
			applySetCollapsed(event.payload.group.id, false);
		} else if (event.action === CHANGE_ACTION.DELETE) {
			applySetCollapsed(event.payload.id, false);
		}
	});

	// `onNodeGroupsChange` returns an unsubscribe; release it with the
	// surrounding scope so handlers don't outlive their owner.
	if (getCurrentScope() && typeof unsubscribe === 'function') {
		onScopeDispose(unsubscribe as GroupChangeUnsubscribe);
	}

	return {
		collapsedIds: computed(() => collapsedIds.value),
		isGroupCollapsed,
		toggleCollapsed,
		setCollapsed,
		collapseAll,
		expandAll,
	};
}
