import { computed, ref, type InjectionKey } from 'vue';

export type CanvasNodeGroupDescriptionVisibility = ReturnType<
	typeof useCanvasNodeGroupDescriptionVisibility
>;

export const NodeGroupDescriptionVisibilityKey: InjectionKey<CanvasNodeGroupDescriptionVisibility> =
	Symbol('nodeGroupDescriptionVisibility');

/**
 * Tracks which collapsed groups have their description pinned open below the
 * header. This is canvas view state — it does not dirty the document and is
 * not serialized with the workflow.
 */
export function useCanvasNodeGroupDescriptionVisibility() {
	const visibleIds = ref<Set<string>>(new Set());

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
	}

	function toggleVisible(id: string) {
		setVisible(id, !isVisible(id));
	}

	function removeDeleted(id: string) {
		setVisible(id, false);
	}

	// Drop ids whose group no longer exists (e.g. after switching documents).
	function restore(presentIds: Set<string>) {
		visibleIds.value = new Set([...visibleIds.value].filter((id) => presentIds.has(id)));
	}

	return {
		visibleIds: computed(() => visibleIds.value),
		isVisible,
		setVisible,
		toggleVisible,
		removeDeleted,
		restore,
	};
}
