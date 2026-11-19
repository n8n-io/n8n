import { Service } from '@n8n/di';

import type { LiveEntry } from '../live-source-provider';
import type {
	LiveRetrievalStrategy,
	LiveSearchContext,
	RankedSearchMatch,
} from './live-retrieval-strategy';
import { countTerms, searchLines, titleMatches, tokenizeQuery } from './text-search';

/** Matches per picked item, so one long document cannot fill the result. */
const MAX_MATCHES_PER_ITEM = 3;
/** The rank of a match that the provider's own search returned. It matched the title. */
const PROVIDER_MATCH_SCORE = 1;

/**
 * The floor of the PoC: the provider's own search over the picked containers,
 * plus an in-process term search over the text of the picked single items.
 * Nothing is stored between runs.
 */
@Service()
export class NativeRetrievalStrategy implements LiveRetrievalStrategy {
	readonly id = 'native';

	async search(
		context: LiveSearchContext,
		query: string,
		limit: number,
	): Promise<RankedSearchMatch[]> {
		const matches: RankedSearchMatch[] = [];
		const terms = tokenizeQuery(query);
		const hasContainer = context.scope.some((entry) => entry.kind === 'container');
		if (hasContainer && context.provider.capabilities.nativeContainerSearch) {
			const found = await context.provider.search(context.ctx, context.scope, query, limit);
			for (const match of found) {
				// The provider matched somewhere; the query terms in the title and the
				// snippet tell how well, so "FAQ: webhooks" ranks below "queue consumer region".
				const overlap = Math.max(
					countTerms(match.entry.title, terms),
					countTerms(match.snippet, terms),
				);
				matches.push({ ...match, score: Math.max(PROVIDER_MATCH_SCORE, overlap) });
			}
		}

		matches.push(...(await this.searchPickedItems(context, terms)));

		// The entries the run already knows match by title without a call. The
		// provider's search can miss them, and a listed child is not a picked item.
		const seen = new Set(matches.map((match) => match.entry.id));
		for (const entry of context.scope) {
			if (seen.has(entry.id) || entry.kind === 'container') continue;
			const overlap = countTerms(entry.title, terms);
			if (overlap > 0) matches.push({ entry, snippet: entry.title, score: overlap });
		}
		return matches;
	}

	/** The in-process term search over the text of the picked single items, read once per run. */
	async searchPickedItems(
		context: LiveSearchContext,
		terms: readonly string[],
	): Promise<RankedSearchMatch[]> {
		const matches: RankedSearchMatch[] = [];
		for (const item of context.pickedItems) {
			matches.push(...(await this.searchItem(context, item, terms)));
		}
		return matches;
	}

	private async searchItem(
		context: LiveSearchContext,
		item: LiveEntry,
		terms: readonly string[],
	): Promise<RankedSearchMatch[]> {
		const document = await context.readDocument(item);
		const entry: LiveEntry = { ...item, updatedAt: document.updatedAt ?? item.updatedAt };
		const lineMatches = searchLines(document.text, terms, MAX_MATCHES_PER_ITEM);
		if (lineMatches.length === 0) {
			if (!titleMatches(item.title, terms)) return [];
			return [{ entry, snippet: item.title, score: PROVIDER_MATCH_SCORE }];
		}
		return lineMatches.map((match) => ({
			entry,
			snippet: match.snippet,
			lineRange: { start: match.line, end: match.line },
			// A title match counts on top of the line matches.
			score: match.score + (titleMatches(item.title, terms) ? 1 : 0),
		}));
	}
}
