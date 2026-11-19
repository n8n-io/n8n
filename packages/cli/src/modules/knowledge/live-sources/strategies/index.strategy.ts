import { Service } from '@n8n/di';

import { LiveIndexService } from '../live-index.service';
import type { LiveEntry } from '../live-source-provider';
import type {
	LiveRetrievalStrategy,
	LiveSearchContext,
	RankedSearchMatch,
} from './live-retrieval-strategy';
import { NativeRetrievalStrategy } from './native.strategy';
import { tokenizeQuery } from './text-search';

/** The rank of the best index match, on the scale of the native term counts. */
const INDEX_TOP_SCORE = 4;

export function liveIndexKey(agentId: string, sourceId: string): string {
	return `${agentId}:${sourceId}`;
}

/**
 * BM25 over the cards of the picked containers, plus the native in-process
 * search over the picked items. Reads stay live. A source whose terms forbid
 * a stored copy, and a source without an index yet, fall back to `native`;
 * the first search of a source starts its build.
 */
@Service()
export class IndexRetrievalStrategy implements LiveRetrievalStrategy {
	readonly id = 'index';

	constructor(
		private readonly indexService: LiveIndexService,
		private readonly nativeStrategy: NativeRetrievalStrategy,
	) {}

	async search(
		context: LiveSearchContext,
		query: string,
		limit: number,
	): Promise<RankedSearchMatch[]> {
		if (!context.provider.capabilities.persistableContent) {
			return await this.nativeStrategy.search(context, query, limit);
		}
		const key = liveIndexKey(context.agentId, context.source.id);
		if (!this.indexService.isReady(key)) {
			this.indexService.scheduleBuild({
				key,
				ctx: context.ctx,
				source: context.source,
				provider: context.provider,
			});
			return await this.nativeStrategy.search(context, query, limit);
		}

		const terms = tokenizeQuery(query);
		// The requested scope can be narrower than the index: keep the cards in it or below it.
		const canon = (id: string) => context.provider.normalizeItemId?.(id) ?? id;
		const scopeIds = new Set(context.scope.map((entry) => canon(entry.id)));
		const inScope = (entry: LiveEntry) =>
			scopeIds.has(canon(entry.id)) ||
			this.indexService.ancestorIds(key, entry).some((id) => scopeIds.has(canon(id)));
		const matches = this.indexService
			.search(key, terms, limit * 2)
			.filter(({ entry }) => inScope(entry))
			.slice(0, limit);
		const best = matches[0]?.score ?? 1;
		const ranked = matches.map((match) => ({
			...match,
			score: 1 + ((INDEX_TOP_SCORE - 1) * match.score) / best,
		}));

		// The picked single items are searched in full, as the native strategy does.
		const itemMatches = await this.nativeStrategy.searchPickedItems(context, terms);
		const indexed = new Set(ranked.map((match) => canon(match.entry.id)));
		return [...ranked, ...itemMatches.filter((match) => !indexed.has(canon(match.entry.id)))];
	}
}
