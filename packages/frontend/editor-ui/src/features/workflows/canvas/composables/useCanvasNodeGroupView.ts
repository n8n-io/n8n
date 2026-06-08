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
	const expandedIds = ref<Set<string>>(new Set());

	function applySetExpanded(id: string, value: boolean) {
		if (value) {
			expandedIds.value.add(id);
		} else {
			expandedIds.value.delete(id);
		}
	}

	function setCollapsed(id: string, value: boolean) {
		applySetExpanded(id, !value);
	}

	function toggleCollapsed(id: string) {
		applySetExpanded(id, !expandedIds.value.has(id));
	}

	function collapseAll() {
		expandedIds.value.clear();
	}

	function expandAll() {
		for (const group of deps.allGroups.value) {
			expandedIds.value.add(group.id);
		}
	}

	const isGroupCollapsed = (id: string) => !expandedIds.value.has(id);

	// Default collapse state per change action: SET (workflow load /
	// replacement) collapses every group; ADD (new group) starts expanded;
	// DELETE removes the id; UPDATE leaves collapse state alone.
	const unsubscribe = deps.onNodeGroupsChange((event) => {
		if (event.action === CHANGE_ACTION.SET) {
			expandedIds.value.clear();
		} else if (event.action === CHANGE_ACTION.ADD) {
			applySetExpanded(event.payload.group.id, true);
		} else if (event.action === CHANGE_ACTION.DELETE) {
			applySetExpanded(event.payload.id, false);
		}
	});

	// `onNodeGroupsChange` returns an unsubscribe; release it with the
	// surrounding scope so handlers don't outlive their owner.
	if (getCurrentScope() && typeof unsubscribe === 'function') {
		onScopeDispose(unsubscribe as GroupChangeUnsubscribe);
	}

	return {
		expandedIds: computed(() => expandedIds.value),
		isGroupCollapsed,
		toggleCollapsed,
		setCollapsed,
		collapseAll,
		expandAll,
	};
}
