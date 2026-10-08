import type { IMenuItem } from '@n8n/design-system';
import { sublimeSearch } from '@n8n/utils/search/sublime-search';
import type { CommandBarItem, CommandBarSearchRequest, CommandBarSearchResult } from './types';

const COMMAND_SEARCH_KEYS = [
	{ key: 'title', weight: 1.3 },
	{ key: 'keywords', weight: 1 },
];

export function rankItems(items: readonly CommandBarItem[], query: string): CommandBarItem[] {
	const trimmed = query.trim();
	if (!trimmed) return [...items];
	return sublimeSearch(trimmed, items, COMMAND_SEARCH_KEYS).map(({ item }) => item);
}

export function paginate(
	items: readonly CommandBarItem[],
	{ offset, limit }: Pick<CommandBarSearchRequest, 'offset' | 'limit'>,
): CommandBarSearchResult {
	return {
		items: items.slice(offset, offset + limit),
		hasMore: offset + limit < items.length,
	};
}

export function toCommandBarIcon(icon: IMenuItem['icon']): CommandBarItem['icon'] {
	if (!icon) return undefined;
	if (typeof icon === 'string') return { type: 'icon', value: icon };
	return icon.type === 'emoji'
		? { type: 'emoji', value: icon.value }
		: { type: 'icon', value: icon.value };
}
