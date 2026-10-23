import type { AssistantMentionItem } from '../assistantAtMentions.types';

const MATCH_RANK = {
	exact: 0,
	prefix: 1,
	tokenPrefix: 2,
	substring: 3,
	description: 4,
} as const;

// A run of characters that are neither letters nor digits, in any script.
const TOKEN_SEPARATOR = /[^\p{L}\p{N}]+/u;

function getMatchRank(item: AssistantMentionItem, normalizedQuery: string): number | undefined {
	const normalizedName = item.label.trim().toLocaleLowerCase();
	if (normalizedName === normalizedQuery) {
		return MATCH_RANK.exact;
	}
	if (normalizedName.startsWith(normalizedQuery)) {
		return MATCH_RANK.prefix;
	}

	const tokens = normalizedName.split(TOKEN_SEPARATOR).filter(Boolean);
	if (tokens.some((token) => token.startsWith(normalizedQuery))) {
		return MATCH_RANK.tokenPrefix;
	}
	if (normalizedName.includes(normalizedQuery)) {
		return MATCH_RANK.substring;
	}
	if (item.description?.toLocaleLowerCase().includes(normalizedQuery)) {
		return MATCH_RANK.description;
	}

	return undefined;
}

export function searchMentionItems(
	items: readonly AssistantMentionItem[],
	query: string,
	limit: number,
): AssistantMentionItem[] {
	const normalizedQuery = query.trim().toLocaleLowerCase();
	if (normalizedQuery === '' || limit <= 0) return [];

	// Array#sort is stable, so items with the same rank keep their source order.
	const ranked = items
		.flatMap((item) => {
			const rank = getMatchRank(item, normalizedQuery);
			return rank === undefined ? [] : [{ item, rank }];
		})
		.sort((left, right) => left.rank - right.rank);

	// The same key can come from several providers. Keep its best-ranked item.
	const bestItemByKey = new Map<string, AssistantMentionItem>();
	for (const { item } of ranked) {
		if (!bestItemByKey.has(item.key)) {
			bestItemByKey.set(item.key, item);
		}
	}

	return [...bestItemByKey.values()].slice(0, limit);
}
