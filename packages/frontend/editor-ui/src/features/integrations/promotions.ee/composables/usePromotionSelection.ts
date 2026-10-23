import { computed, ref, watch, type Ref } from 'vue';

import {
	applyPreview,
	clearSelection,
	initialSelectionState,
	resolveInclusion,
	selectAll,
	toggleContainer,
	toggleSelection,
	type DisabledKeys,
	type Inclusion,
	type ResourceKey,
	type SelectionGraph,
	type SelectionState,
} from '../promotionPreview.selection';

const noInclusion: Inclusion = { included: new Set(), reasons: new Map() };

/**
 * The selection on the preview page. `disabled` holds the blocked workflows. The selection does
 * not change while `locked`, for example while the operation runs.
 */
export function usePromotionSelection(
	graph: Ref<SelectionGraph | null>,
	{ disabled, locked }: { disabled: Ref<DisabledKeys>; locked: Ref<boolean> },
) {
	const selection = ref<SelectionState>(initialSelectionState);
	/** Selected keys that the last refresh no longer lists, so the page can say why they left. */
	const dropped = ref<ResourceKey[]>([]);

	// The preview and its blockers load together, so one update applies both.
	watch(
		[graph, disabled],
		([current, currentDisabled]) => {
			// A new project or direction starts with the default selection.
			if (!current) {
				selection.value = initialSelectionState;
				dropped.value = [];
				return;
			}
			const result = applyPreview(selection.value, current, currentDisabled);
			selection.value = result.state;
			dropped.value = result.dropped;
		},
		{ immediate: true },
	);

	const selected = computed(() => selection.value.selected);
	const inclusion = computed(() =>
		graph.value ? resolveInclusion(graph.value, selected.value) : noInclusion,
	);

	function update(change: (current: SelectionGraph) => SelectionState) {
		if (graph.value && !locked.value) selection.value = change(graph.value);
	}

	return {
		selected,
		inclusion,
		dropped,
		toggle: (key: ResourceKey) =>
			update((current) => toggleSelection(selection.value, current, key, disabled.value)),
		toggleAllInside: (containerKey: ResourceKey) =>
			update((current) => toggleContainer(selection.value, current, containerKey, disabled.value)),
		selectAll: () => update((current) => selectAll(selection.value, current, disabled.value)),
		clear: () => update(() => clearSelection()),
	};
}
