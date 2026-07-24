import { computed, ref, type InjectionKey } from 'vue';
import type { IWorkflowGroup } from 'n8n-workflow';
import type { NodeGroupChangeEvent } from '@/app/stores/workflowDocument/useWorkflowDocumentNodeGroups';
import { CHANGE_ACTION } from '@/app/stores/workflowDocument/types';
import { LOCAL_STORAGE_CANVAS_GROUP_DESCRIPTION_PINNED } from '@/app/constants/localStorage';
import { useCanvasGroupIdStorage } from './useCanvasGroupIdStorage';
import { useNodeGroupsSubscription } from './useNodeGroupsSubscription';

export interface UseCanvasNodeGroupDescriptionVisibilityDeps {
	workflowId: () => string;
	getCurrentGroups: () => IWorkflowGroup[];
	onNodeGroupsChange: (handler: (event: NodeGroupChangeEvent) => void) => { off: () => void };
}

// Only a group that still exists and has text to show can stay pinned.
function hasDescription(group: Pick<IWorkflowGroup, 'description'>): boolean {
	return Boolean(group.description?.trim());
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

	// Bulk set for the "show/hide all descriptions" action — a single state
	// update and persist for the whole batch instead of one per id.
	function setVisibleForGroups(ids: string[], value: boolean) {
		const next = new Set(visibleIds.value);
		let changed = false;
		for (const id of ids) {
			if (value ? next.has(id) : !next.has(id)) continue;
			if (value) {
				next.add(id);
			} else {
				next.delete(id);
			}
			changed = true;
		}
		if (!changed) return;
		visibleIds.value = next;
		persist();
	}

	function removeDeleted(id: string) {
		setVisible(id, false);
	}

	// Load the persisted set for the current workflow, keeping only groups that
	// still exist and still have a description to show.
	function restore(groups: IWorkflowGroup[]) {
		const pinnable = new Set(groups.filter(hasDescription).map((group) => group.id));
		const stored = storage.read(deps.workflowId());
		visibleIds.value = new Set(stored.filter((id) => pinnable.has(id)));
	}

	function handleNodeGroupsChange(event: NodeGroupChangeEvent) {
		if (event.action === CHANGE_ACTION.SET) {
			restore(event.payload.groups);
		} else if (event.action === CHANGE_ACTION.UPDATE) {
			// A description cleared to empty has nothing left to pin open.
			if (!hasDescription(event.payload.group)) {
				removeDeleted(event.payload.group.id);
			}
		} else if (event.action === CHANGE_ACTION.DELETE) {
			removeDeleted(event.payload.id);
		}
	}

	const { reinitialize } = useNodeGroupsSubscription({
		onNodeGroupsChange: deps.onNodeGroupsChange,
		onChange: handleNodeGroupsChange,
		onRebind: () => restore(deps.getCurrentGroups()),
	});

	return {
		visibleIds: computed(() => visibleIds.value),
		isVisible,
		setVisible,
		toggleVisible,
		setVisibleForGroups,
		removeDeleted,
		restore,
		reinitialize,
	};
}
