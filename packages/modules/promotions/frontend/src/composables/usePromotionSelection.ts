import { computed, ref, shallowRef, watch, type Ref } from 'vue';

import {
	applyPreview,
	clearSelection,
	initialSelectionState,
	resolveInclusion,
	selectAll,
	toggleContainer,
	toggleKeys,
	toggleSelection,
	type DisabledKeys,
	type Inclusion,
	type ResourceKey,
	type SelectionGraph,
	type SelectionState,
} from '../promotionPreview.selection';

const noInclusion: Inclusion = { included: new Set(), reasons: new Map() };

/** A selection that another page hands over, such as a project page to the changes view. */
export type SelectionSeed = {
	selected: readonly ResourceKey[];
	/** Items that "Include it" added, with the project of each. */
	extra: ReadonlyMap<ResourceKey, string>;
};

/**
 * The selection on the preview page. `disabled` holds the resources that users cannot add. The
 * selection does not change while `locked`, for example while the operation runs. `seed` gives
 * the first selection of a page that continues the selection of another page.
 */
export function usePromotionSelection(
	graph: Ref<SelectionGraph | null>,
	{
		disabled,
		locked,
		seed,
	}: {
		disabled: Ref<DisabledKeys>;
		locked: Ref<boolean>;
		seed?: (graph: SelectionGraph) => SelectionSeed | null;
	},
) {
	const selection = ref<SelectionState>(initialSelectionState);
	/**
	 * Items that the user included and that have no checkbox of their own, such as a credential
	 * of another project. The value is the project of the item.
	 */
	const extra = shallowRef<ReadonlyMap<ResourceKey, string>>(new Map());
	/** Selected keys that the last refresh no longer lists, so the page can say why they left. */
	const dropped = ref<ResourceKey[]>([]);
	let seeded = false;

	// The preview and its blockers load together, so one update applies both.
	watch(
		[graph, disabled],
		([current, currentDisabled]) => {
			// A new project or direction starts with the default selection.
			if (!current) {
				selection.value = initialSelectionState;
				extra.value = new Map();
				dropped.value = [];
				seeded = false;
				return;
			}
			const first = seeded ? null : (seed?.(current) ?? null);
			seeded = true;
			if (first) {
				const selected = first.selected.filter(
					(key) => current.resources.get(key)?.selectable === true && !currentDisabled.has(key),
				);
				selection.value = { mode: 'custom', selected: new Set(selected) };
				extra.value = new Map();
				dropped.value = [];
				for (const [key, projectId] of first.extra) include(key, projectId);
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
		graph.value ? resolveInclusion(graph.value, selected.value, extra.value.keys()) : noInclusion,
	);
	/** Everything that the user put in the operation: the selection and the included items. */
	const chosen = computed(
		(): ReadonlySet<ResourceKey> => new Set([...selected.value, ...extra.value.keys()]),
	);

	function update(change: (current: SelectionGraph) => SelectionState) {
		if (graph.value && !locked.value) selection.value = change(graph.value);
	}

	function removeExtra(key: ResourceKey) {
		const next = new Map(extra.value);
		next.delete(key);
		extra.value = next;
	}

	/** Adds one item to the operation: "Include it". A selectable item joins the selection. */
	function include(key: ResourceKey, projectId: string) {
		const current = graph.value;
		if (!current || locked.value) return;
		if (current.resources.get(key)?.selectable) {
			if (selection.value.selected.has(key) || disabled.value.has(key)) return;
			selection.value = {
				mode: 'custom',
				selected: new Set([...selection.value.selected, key]),
			};
			return;
		}
		extra.value = new Map([...extra.value, [key, projectId]]);
	}

	/** Removes one item from the operation, however it got there. */
	function exclude(key: ResourceKey) {
		if (locked.value) return;
		if (extra.value.has(key)) removeExtra(key);
		if (selection.value.selected.has(key)) {
			const next = new Set(selection.value.selected);
			next.delete(key);
			selection.value = { mode: 'custom', selected: next };
		}
	}

	return {
		selected,
		extra,
		chosen,
		inclusion,
		dropped,
		include,
		exclude,
		toggle: (key: ResourceKey) => {
			if (extra.value.has(key)) {
				if (!locked.value) removeExtra(key);
				return;
			}
			update((current) => toggleSelection(selection.value, current, key, disabled.value));
		},
		toggleAllInside: (containerKey: ResourceKey) =>
			update((current) => toggleContainer(selection.value, current, containerKey, disabled.value)),
		/** Selects or clears a set of keys together, such as the changes of one project. */
		toggleKeys: (keys: readonly ResourceKey[]) =>
			update(() => toggleKeys(selection.value, keys, disabled.value)),
		selectAll: () => update((current) => selectAll(selection.value, current, disabled.value)),
		clear: () => {
			if (!locked.value) extra.value = new Map();
			update(() => clearSelection());
		},
	};
}
