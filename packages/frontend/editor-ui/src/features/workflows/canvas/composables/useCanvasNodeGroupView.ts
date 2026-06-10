import { getCurrentScope, onScopeDispose, ref, type InjectionKey } from 'vue';
import type { NodeGroupChangeEvent } from '@/app/stores/workflowDocument/useWorkflowDocumentNodeGroups';
import { CHANGE_ACTION } from '@/app/stores/workflowDocument/types';

export interface UseCanvasNodeGroupViewDeps {
	onNodeGroupsChange: (handler: (event: NodeGroupChangeEvent) => void) => { off: () => void };
}

export type CanvasNodeGroupView = ReturnType<typeof useCanvasNodeGroupView>;

export const NodeGroupViewKey: InjectionKey<CanvasNodeGroupView> = Symbol('nodeGroupView');

/**
 * Canvas view-state for group collapse/expand. Lives separately from the
 * workflow document store because collapse is not workflow data — it does
 * not dirty the document, does not enter undo, and is not serialized.
 */
export function useCanvasNodeGroupView(deps: UseCanvasNodeGroupViewDeps) {
	const expandedIds = ref<Set<string>>(new Set());

	function setExpanded(id: string, value: boolean) {
		if (value) {
			expandedIds.value.add(id);
		} else {
			expandedIds.value.delete(id);
		}
	}

	const isGroupCollapsed = (id: string) => !expandedIds.value.has(id);

	function toggleCollapsed(id: string) {
		setExpanded(id, isGroupCollapsed(id));
	}

	// Default collapse state per change action: SET (workflow load /
	// replacement) collapses every group; ADD (new group) starts expanded;
	// DELETE removes the id; UPDATE leaves collapse state alone.
	const subscription = deps.onNodeGroupsChange((event) => {
		if (event.action === CHANGE_ACTION.SET) {
			expandedIds.value.clear();
		} else if (event.action === CHANGE_ACTION.ADD) {
			setExpanded(event.payload.group.id, true);
		} else if (event.action === CHANGE_ACTION.DELETE) {
			setExpanded(event.payload.id, false);
		}
	});

	// Release the subscription with the surrounding scope so the handler
	// doesn't outlive its owner.
	if (getCurrentScope()) {
		onScopeDispose(() => subscription.off());
	}

	return {
		isGroupCollapsed,
		toggleCollapsed,
	};
}
