import { computed, ref, type ComputedRef } from 'vue';
import { useI18n } from '@n8n/i18n';
import type { AiModelSelectorMenuItem, AiModelSelectorMenuItemData } from '@n8n/design-system';

const MAX_SEARCH_RESULTS_PER_PROVIDER = 10;

/** Shared truncation length for model names shown in menu items. */
export const MAX_MODEL_NAME_CHARS = 45;

function isSearchableItem(item: AiModelSelectorMenuItem): boolean {
	return (item.id.includes('::model::') || item.id.includes('::freeCredits::')) && !item.disabled;
}

function collectMatchingItems<TData extends AiModelSelectorMenuItemData>(
	item: AiModelSelectorMenuItem<TData>,
	query: string,
	parts: string[],
	parentMatched = false,
): Array<AiModelSelectorMenuItem<TData>> {
	const children = item.children ?? [];
	const currentParts = [...parts, item.label];
	const labelMatched = item.label.toLowerCase().includes(query);
	const isMatched = parentMatched || labelMatched;

	if (children.length === 0) {
		const searchText = `${item.data?.fullName ?? item.label}`.toLowerCase();
		if (!isSearchableItem(item) || (!isMatched && !searchText.includes(query))) return [];
		return [
			{
				...item,
				divided: false,
				data: item.data
					? { ...item.data, parts: currentParts, descriptionTooltipTeleported: true }
					: undefined,
			},
		];
	}

	return children.flatMap((child) => collectMatchingItems(child, query, currentParts, isMatched));
}

/**
 * Filters a model selector menu by search query, flattening matches into
 * breadcrumb items ("Provider > Model") and grouping overflow per provider
 * under a "more results" sub-menu.
 */
export function filterAiModelSelectorMenu<TData extends AiModelSelectorMenuItemData>(
	menu: Array<AiModelSelectorMenuItem<TData>>,
	searchQuery: string,
): Array<AiModelSelectorMenuItem<TData>> {
	const query = searchQuery.trim().toLowerCase();
	if (!query) return menu;

	const i18n = useI18n();

	return menu.flatMap<AiModelSelectorMenuItem<TData>>((providerItem) => {
		const results = collectMatchingItems(providerItem, query, []);
		if (results.length <= MAX_SEARCH_RESULTS_PER_PROVIDER) return results;

		return [
			...results.slice(0, MAX_SEARCH_RESULTS_PER_PROVIDER),
			{
				...providerItem,
				label: i18n.baseText('agents.modelSelector.moreModels', {
					interpolate: { provider: providerItem.label },
				}),
				children: results.slice(MAX_SEARCH_RESULTS_PER_PROVIDER),
				divided: false,
			},
		];
	});
}

/**
 * Owns the search-box state for a model selector menu: tracks the query,
 * ignores input while disabled, and returns the filtered menu.
 */
export function useAiModelSelectorMenu<TData extends AiModelSelectorMenuItemData>(
	menu: ComputedRef<Array<AiModelSelectorMenuItem<TData>>>,
	isDisabled: () => boolean,
) {
	const searchQuery = ref('');

	function handleSearch(query: string) {
		if (isDisabled()) return;
		searchQuery.value = query;
	}

	const filteredMenu = computed(() => filterAiModelSelectorMenu(menu.value, searchQuery.value));

	return { filteredMenu, handleSearch };
}
