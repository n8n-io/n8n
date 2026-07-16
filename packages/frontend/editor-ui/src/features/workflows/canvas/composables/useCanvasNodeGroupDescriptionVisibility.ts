import { computed, ref, type InjectionKey } from 'vue';
import type { NodeGroupChangeEvent } from '@/app/stores/workflowDocument/useWorkflowDocumentNodeGroups';
import { CHANGE_ACTION } from '@/app/stores/workflowDocument/types';
import { LOCAL_STORAGE_CANVAS_GROUP_DESCRIPTION_PINNED } from '@/app/constants/localStorage';
import { useCanvasGroupIdStorage } from './useCanvasGroupIdStorage';
import { useNodeGroupsSubscription } from './useNodeGroupsSubscription';

export interface UseCanvasNodeGroupDescriptionVisibilityDeps {
	workflowId: () => string;
	getCurrentGroupIds: () => string[];
	onNodeGroupsChange: (handler: (event: NodeGroupChangeEvent) => void) => { off: () => void };
}

export type CanvasNodeGroupDescriptionVisibility = ReturnType<
	typeof useCanvasNodeGroupDescriptionVisibility
>;

export const NodeGroupDescriptionVisibilityKey: InjectionKey<CanvasNodeGroupDescriptionVisibility> =
	Symbol('nodeGroupDescriptionVisibility');

/**
 * Tracks which collapsed groups have their description pinned open below the
 * header. This is canvas view state — it does not dirty the document and is
 * not serialized with the workflow. It is persisted per workflow to
 * localStorage so a reload restores the descriptions the user had pinned.
 */
export function useCanvasNodeGroupDescriptionVisibility(
	deps: UseCanvasNodeGroupDescriptionVisibilityDeps,
) {
	const visibleIds = ref<Set<string>>(new Set());
	const storage = useCanvasGroupIdStorage(LOCAL_STORAGE_CANVAS_GROUP_DESCRIPTION_PINNED);

	function persist() {
		storage.write(deps.workflowId(), [...visibleIds.value]);
	}

	function isVisible(id: string): boolean {
		return visibleIds.value.has(id);
	}

	function setVisible(id: string, value: boolean) {
		if (isVisible(id) === value) return;
		const next = new Set(visibleIds.value);
		if (value) {
			next.add(id);
		} else {
			next.delete(id);
		}
		visibleIds.value = next;
		persist();
	}

	function toggleVisible(id: string) {
		setVisible(id, !isVisible(id));
	}

	function removeDeleted(id: string) {
		setVisible(id, false);
	}

	// Load the persisted set for the current workflow, dropping ids whose group
	// no longer exists.
	function restore(presentIds: Set<string>) {
		const stored = storage.read(deps.workflowId());
		visibleIds.value = new Set(stored.filter((id) => presentIds.has(id)));
	}

	function handleNodeGroupsChange(event: NodeGroupChangeEvent) {
		if (event.action === CHANGE_ACTION.SET) {
			restore(new Set(event.payload.groups.map((group) => group.id)));
		} else if (event.action === CHANGE_ACTION.UPDATE) {
			// A description cleared to empty has nothing left to pin open.
			if (!event.payload.group.description?.trim()) {
				removeDeleted(event.payload.group.id);
			}
		} else if (event.action === CHANGE_ACTION.DELETE) {
			removeDeleted(event.payload.id);
		}
	}

	const { reinitialize } = useNodeGroupsSubscription({
		onNodeGroupsChange: deps.onNodeGroupsChange,
		onChange: handleNodeGroupsChange,
		onRebind: () => restore(new Set(deps.getCurrentGroupIds())),
	});

	return {
		visibleIds: computed(() => visibleIds.value),
		isVisible,
		setVisible,
		toggleVisible,
		removeDeleted,
		restore,
		reinitialize,
	};
}
