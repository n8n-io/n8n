import { computed, shallowRef } from 'vue';

/**
 * Minimum shape a resource needs to participate in list selection. The
 * `resourceType:id` pair is what makes a selection key unique, so workflows and
 * folders that happen to share an id never collide.
 */
export type SelectableResource = { resourceType: string; id: string };

export const DEFAULT_RESOURCE_SELECTION_LIMIT = 100;

type ResourcesListSelectionOptions = {
	maxSelected?: number;
};

const selectionKey = (item: SelectableResource) => `${item.resourceType}:${item.id}`;

/**
 * Generic multi-selection for resource lists. Selection is keyed by
 * `resourceType:id`, so it can span paginated pages. Callers should `clear()`
 * whenever the underlying list projection changes (search, filters, project/tab,
 * folder route, refresh, ...).
 */
export function useResourcesListSelection<T extends SelectableResource>(
	options: ResourcesListSelectionOptions = {},
) {
	const { maxSelected = DEFAULT_RESOURCE_SELECTION_LIMIT } = options;
	// A Map keeps the full item around (not just its key) so consumers can act on
	// the selection without re-resolving items from the list. shallowRef avoids
	// deep-unwrapping the generic item type; reassigning the map drives reactivity.
	const selected = shallowRef(new Map<string, T>());

	// Reassigning the ref is the simplest way to guarantee reactivity for Map
	// mutations across Vue versions.
	const commit = (next: Map<string, T>) => {
		selected.value = next;
	};

	const selectedItems = computed<T[]>(() => Array.from(selected.value.values()) as T[]);
	const selectedKeys = computed(() => new Set(selected.value.keys()));
	const selectedCount = computed(() => selected.value.size);
	const hasSelection = computed(() => selected.value.size > 0);
	const isLimitReached = computed(() => selectedCount.value >= maxSelected);

	const isSelected = (item: SelectableResource) => selected.value.has(selectionKey(item));
	const canSelect = (item: T) => isSelected(item) || selectedCount.value < maxSelected;

	/**
	 * Add or remove a single item. When `value` is omitted the state is flipped.
	 * Returns `false` when a select is blocked by the selection limit, `true`
	 * otherwise.
	 */
	const toggleItem = (item: T, value?: boolean): boolean => {
		const key = selectionKey(item);
		const shouldSelect = value ?? !selected.value.has(key);
		if (shouldSelect && !canSelect(item)) return false;
		const next = new Map(selected.value);
		if (shouldSelect) {
			next.set(key, item);
		} else {
			next.delete(key);
		}
		commit(next);
		return true;
	};

	/** Whether every item on the given page is currently selected. */
	const isPageChecked = (pageItems: T[]) =>
		pageItems.length > 0 && pageItems.every((item) => selected.value.has(selectionKey(item)));

	/** Whether the page is partially - but not fully - selected. */
	const isPageIndeterminate = (pageItems: T[]) => {
		const selectedOnPage = pageItems.filter((item) =>
			selected.value.has(selectionKey(item)),
		).length;
		return selectedOnPage > 0 && selectedOnPage < pageItems.length;
	};

	/**
	 * Select or deselect every item on the page. When `value` is omitted it
	 * mirrors a tri-state checkbox: a fully-checked page clears, otherwise selects.
	 */
	const togglePage = (pageItems: T[], value?: boolean) => {
		const shouldSelect = value ?? !isPageChecked(pageItems);
		const next = new Map(selected.value);
		for (const item of pageItems) {
			const key = selectionKey(item);
			if (shouldSelect) {
				if (!next.has(key) && next.size >= maxSelected) continue;
				next.set(key, item);
			} else {
				next.delete(key);
			}
		}
		commit(next);
	};

	const clear = () => {
		if (selected.value.size === 0) return;
		commit(new Map());
	};

	return {
		selectionKey,
		selectedItems,
		selectedKeys,
		selectedCount,
		hasSelection,
		isLimitReached,
		isSelected,
		canSelect,
		toggleItem,
		isPageChecked,
		isPageIndeterminate,
		togglePage,
		clear,
	};
}
