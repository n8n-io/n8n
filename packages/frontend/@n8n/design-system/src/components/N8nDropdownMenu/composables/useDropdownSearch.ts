import { computed, ref, toValue, type MaybeRefOrGetter } from 'vue';

import type { DropdownMenuItemProps } from '../DropdownMenu.types';

type SearchField = string | null | undefined;

interface UseDropdownSearchOptions<T, D> {
	/**
	 * Return matching leaf items as a flat list instead of preserving the nested menu structure.
	 * Prefer this for searchable nested menus, so users can select a result directly instead of
	 * navigating through matching parent folders.
	 */
	flatList?: boolean;

	/**
	 * Text values to match against for each item. Defaults to the item's `label`.
	 * Add fields like `data.fullName` when the displayed label is shortened or incomplete.
	 */
	searchFields?: (item: DropdownMenuItemProps<T, D>) => SearchField[];

	/**
	 * Whether an item can appear as a search result. Use this to exclude disabled items,
	 * loading rows, action rows, or non-selectable group/container items.
	 */
	isSearchable?: (item: DropdownMenuItemProps<T, D>) => boolean;

	/**
	 * When a parent item matches the query, include all of its searchable children.
	 * Set to `false` if children should still match their own search fields independently.
	 */
	includeChildrenWhenParentMatches?: boolean;

	/**
	 * Customize each returned result. Receives the matching item and its path from root to item.
	 * Use this to remove dividers, add breadcrumb labels, or attach path metadata to `data`.
	 */
	mapResult?: (
		item: DropdownMenuItemProps<T, D>,
		path: Array<DropdownMenuItemProps<T, D>>,
	) => DropdownMenuItemProps<T, D>;
}

function defaultSearchFields<T, D>(item: DropdownMenuItemProps<T, D>): SearchField[] {
	return [item.label];
}

function normalizeSearchValue(value: string) {
	return value
		.toLowerCase()
		.normalize('NFKD')
		.replace(/[\u0300-\u036f]/g, '')
		.replace(/[^a-z0-9]/g, '');
}

function fieldMatches(field: SearchField, query: string, normalizedQuery: string) {
	if (!field) return false;

	const normalizedField = field.toLowerCase();

	return (
		normalizedField.includes(query) ||
		(normalizedQuery !== '' && normalizeSearchValue(normalizedField).includes(normalizedQuery))
	);
}

function itemMatches<T, D>(
	item: DropdownMenuItemProps<T, D>,
	query: string,
	normalizedQuery: string,
	searchFields: (item: DropdownMenuItemProps<T, D>) => SearchField[],
) {
	return searchFields(item).some((field) => fieldMatches(field, query, normalizedQuery));
}

function defaultMapResult<T, D>(item: DropdownMenuItemProps<T, D>) {
	return item;
}

function filterNestedItems<T, D>(
	items: Array<DropdownMenuItemProps<T, D>>,
	query: string,
	options: Required<UseDropdownSearchOptions<T, D>>,
	parentMatched = false,
): Array<DropdownMenuItemProps<T, D>> {
	const normalizedQuery = normalizeSearchValue(query);

	return items.flatMap((item) => {
		const children = item.children ?? [];
		const matches =
			parentMatched || itemMatches(item, query, normalizedQuery, options.searchFields);

		if (children.length === 0) {
			return matches && options.isSearchable(item) ? [options.mapResult(item, [item])] : [];
		}

		const filteredChildren = filterNestedItems(
			children,
			query,
			options,
			matches && options.includeChildrenWhenParentMatches,
		);

		if (matches && options.isSearchable(item)) {
			return [
				{
					...options.mapResult(item, [item]),
					children: filteredChildren,
				},
			];
		}

		return filteredChildren.length > 0 ? [{ ...item, children: filteredChildren }] : [];
	});
}

function flattenItems<T, D>(
	items: Array<DropdownMenuItemProps<T, D>>,
	query: string,
	options: Required<UseDropdownSearchOptions<T, D>>,
	path: Array<DropdownMenuItemProps<T, D>> = [],
	parentMatched = false,
): Array<DropdownMenuItemProps<T, D>> {
	const normalizedQuery = normalizeSearchValue(query);

	return items.flatMap((item) => {
		const currentPath = [...path, item];
		const children = item.children ?? [];
		const matches =
			parentMatched || itemMatches(item, query, normalizedQuery, options.searchFields);

		if (children.length === 0) {
			return matches && options.isSearchable(item) ? [options.mapResult(item, currentPath)] : [];
		}

		return flattenItems(
			children,
			query,
			options,
			currentPath,
			matches && options.includeChildrenWhenParentMatches,
		);
	});
}

export function useDropdownSearch<T = string, D = never>(
	items: MaybeRefOrGetter<Array<DropdownMenuItemProps<T, D>>>,
	options: UseDropdownSearchOptions<T, D> = {},
) {
	const search = ref('');
	const resolvedOptions: Required<UseDropdownSearchOptions<T, D>> = {
		flatList: options.flatList ?? false,
		searchFields: options.searchFields ?? defaultSearchFields,
		isSearchable: options.isSearchable ?? (() => true),
		includeChildrenWhenParentMatches: options.includeChildrenWhenParentMatches ?? true,
		mapResult: options.mapResult ?? defaultMapResult,
	};

	const filteredItems = computed(() => {
		const query = search.value.trim().toLowerCase();
		const sourceItems = toValue(items);

		if (!query) return sourceItems;

		return resolvedOptions.flatList
			? flattenItems(sourceItems, query, resolvedOptions)
			: filterNestedItems(sourceItems, query, resolvedOptions);
	});

	const handleSearch = (query: string) => {
		search.value = query;
	};

	return { search, filteredItems, handleSearch };
}
