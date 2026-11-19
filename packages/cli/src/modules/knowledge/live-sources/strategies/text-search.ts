import { MAX_SEARCH_LINE_CHARS } from '../../retrieval/retrieval-schemas';

const MIN_TERM_CHARS = 2;
const MAX_TERMS = 12;
const STOP_WORDS = new Set([
	'a',
	'an',
	'and',
	'are',
	'as',
	'at',
	'be',
	'by',
	'do',
	'does',
	'for',
	'from',
	'how',
	'in',
	'is',
	'it',
	'of',
	'on',
	'or',
	'the',
	'to',
	'we',
	'what',
	'when',
	'where',
	'which',
	'who',
	'with',
]);

/** Splits a query into lowercase search terms without stop words and duplicates. */
export function tokenizeQuery(query: string): string[] {
	const terms = new Set<string>();
	for (const raw of query.toLowerCase().split(/[^\p{L}\p{N}_-]+/u)) {
		const term = raw.replace(/^[-_]+|[-_]+$/g, '');
		if (term.length < MIN_TERM_CHARS || STOP_WORDS.has(term)) continue;
		terms.add(term);
		if (terms.size >= MAX_TERMS) break;
	}
	return [...terms];
}

export interface LineMatch {
	/** 1-based line number. */
	line: number;
	/** Number of distinct terms the line contains. */
	score: number;
	/** The line, cut to the search line cap. */
	snippet: string;
}

/**
 * Finds the lines of a text that contain the most query terms. Returns at most
 * `limit` matches, best first, then in document order.
 */
export function searchLines(text: string, terms: readonly string[], limit: number): LineMatch[] {
	if (terms.length === 0 || limit <= 0) return [];
	const matches: LineMatch[] = [];
	const lines = text.split('\n');
	for (const [index, line] of lines.entries()) {
		const lower = line.toLowerCase();
		let score = 0;
		for (const term of terms) {
			if (lower.includes(term)) score += 1;
		}
		if (score === 0) continue;
		matches.push({ line: index + 1, score, snippet: cutSnippet(line) });
	}
	matches.sort((a, b) => b.score - a.score || a.line - b.line);
	return matches.slice(0, limit);
}

/** True when the title contains at least one term. */
export function titleMatches(title: string, terms: readonly string[]): boolean {
	const lower = title.toLowerCase();
	return terms.some((term) => lower.includes(term));
}

export function cutSnippet(line: string): string {
	const trimmed = line.trim();
	return trimmed.length > MAX_SEARCH_LINE_CHARS
		? `${trimmed.slice(0, MAX_SEARCH_LINE_CHARS)}…`
		: trimmed;
}
