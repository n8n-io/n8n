import type { AiModelSelectorMenuItem, AiModelSelectorMenuItemData } from './types';

const MAX_SEARCH_RESULTS_PER_PROVIDER = 10;

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
	getMoreResultsLabel: (providerLabel: string) => string,
): Array<AiModelSelectorMenuItem<TData>> {
	const query = searchQuery.trim().toLowerCase();
	if (!query) return menu;

	return menu.flatMap<AiModelSelectorMenuItem<TData>>((providerItem) => {
		const results = collectMatchingItems(providerItem, query, []);
		if (results.length <= MAX_SEARCH_RESULTS_PER_PROVIDER) return results;

		return [
			...results.slice(0, MAX_SEARCH_RESULTS_PER_PROVIDER),
			{
				...providerItem,
				label: getMoreResultsLabel(providerItem.label),
				children: results.slice(MAX_SEARCH_RESULTS_PER_PROVIDER),
				divided: false,
			},
		];
	});
}
