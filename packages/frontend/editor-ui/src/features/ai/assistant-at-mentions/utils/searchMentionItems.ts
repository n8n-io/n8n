import type { AssistantMentionItem } from '../assistantAtMentions.types';

const MATCH_RANK = {
	exact: 0,
	prefix: 1,
	tokenPrefix: 2,
	substring: 3,
	description: 4,
} as const;

function getMatchRank(item: AssistantMentionItem, normalizedQuery: string): number | undefined {
	const normalizedName = item.label.trim().toLocaleLowerCase();
	if (normalizedName === normalizedQuery) return MATCH_RANK.exact;
	if (normalizedName.startsWith(normalizedQuery)) return MATCH_RANK.prefix;

	const tokens = normalizedName.split(/[^\p{L}\p{N}]+/u).filter(Boolean);
	if (tokens.some((token) => token.startsWith(normalizedQuery))) return MATCH_RANK.tokenPrefix;
	if (normalizedName.includes(normalizedQuery)) return MATCH_RANK.substring;
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

	const ranked = items
		.map((item, index) => ({ item, index, rank: getMatchRank(item, normalizedQuery) }))
		.filter(
			(candidate): candidate is { item: AssistantMentionItem; index: number; rank: number } =>
				candidate.rank !== undefined,
		)
		.sort((left, right) => left.rank - right.rank || left.index - right.index);

	const seenKeys = new Set<string>();
	const results: AssistantMentionItem[] = [];
	for (const { item } of ranked) {
		if (seenKeys.has(item.key)) continue;
		seenKeys.add(item.key);
		results.push(item);
		if (results.length === limit) break;
	}

	return results;
}
