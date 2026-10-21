import { computed, ref, watch, type Ref } from 'vue';

import {
	applyPreview,
	clearSelection,
	initialSelectionState,
	resolveInclusion,
	selectAll,
	toggleContainer,
	toggleSelection,
	type Inclusion,
	type ResourceKey,
	type SelectionGraph,
	type SelectionState,
} from '../promotionPreview.selection';

const noInclusion: Inclusion = { included: new Set(), reasons: new Map() };

/** The selection on the preview page. */
export function usePromotionSelection(graph: Ref<SelectionGraph | null>) {
	const selection = ref<SelectionState>(initialSelectionState);
	/** Selected keys that the last refresh no longer lists, so the page can say why they left. */
	const dropped = ref<ResourceKey[]>([]);

	watch(
		graph,
		(current) => {
			// A new project or direction starts with the default selection.
			if (!current) {
				selection.value = initialSelectionState;
				dropped.value = [];
				return;
			}
			const result = applyPreview(selection.value, current);
			selection.value = result.state;
			dropped.value = result.dropped;
		},
		{ immediate: true },
	);

	const selected = computed(() => selection.value.selected);
	const inclusion = computed(() =>
		graph.value ? resolveInclusion(graph.value, selected.value) : noInclusion,
	);

	function toggle(key: ResourceKey) {
		if (graph.value) selection.value = toggleSelection(selection.value, graph.value, key);
	}

	function toggleAllInside(containerKey: ResourceKey) {
		if (graph.value) selection.value = toggleContainer(selection.value, graph.value, containerKey);
	}

	return {
		selected,
		inclusion,
		dropped,
		toggle,
		toggleAllInside,
		selectAll: () => {
			if (graph.value) selection.value = selectAll(graph.value);
		},
		clear: () => {
			selection.value = clearSelection();
		},
	};
}
