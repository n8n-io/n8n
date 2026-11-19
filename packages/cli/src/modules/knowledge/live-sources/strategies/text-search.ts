import { MAX_SEARCH_LINE_CHARS } from '../../retrieval/retrieval-schemas';

const MIN_TERM_CHARS = 2;
const MAX_TERMS = 12;
// Function words of a question. They match too much: the Notion title filter
// is a substring match, so "not" alone would match every row titled "Note …".
const STOP_WORDS = new Set([
	'a',
	'about',
	'all',
	'an',
	'and',
	'any',
	'are',
	'as',
	'at',
	'be',
	'but',
	'by',
	'can',
	'did',
	'do',
	'does',
	'for',
	'from',
	'had',
	'has',
	'have',
	'how',
	'i',
	'if',
	'in',
	'into',
	'is',
	'it',
	'its',
	'me',
	'my',
	'no',
	'not',
	'of',
	'on',
	'or',
	'our',
	'page',
	'say',
	'says',
	'should',
	'than',
	'that',
	'the',
	'their',
	'there',
	'these',
	'they',
	'this',
	'those',
	'titled',
	'to',
	'was',
	'we',
	'were',
	'what',
	'when',
	'where',
	'which',
	'who',
	'will',
	'with',
	'you',
	'your',
]);

/** Splits a text into lowercase tokens for the index. Stop words stay: the ranking weighs them down. */
export function tokenizeText(text: string): string[] {
	const tokens: string[] = [];
	for (const raw of text.toLowerCase().split(/[^\p{L}\p{N}_-]+/u)) {
		const token = raw.replace(/^[-_]+|[-_]+$/g, '');
		if (token.length >= MIN_TERM_CHARS) tokens.push(token);
	}
	return tokens;
}

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
		const score = countTerms(line, terms);
		if (score === 0) continue;
		matches.push({ line: index + 1, score, snippet: cutSnippet(line) });
	}
	matches.sort((a, b) => b.score - a.score || a.line - b.line);
	return matches.slice(0, limit);
}

/** The number of distinct terms the text contains. */
export function countTerms(text: string, terms: readonly string[]): number {
	const lower = text.toLowerCase();
	let count = 0;
	for (const term of terms) {
		if (lower.includes(term)) count += 1;
	}
	return count;
}

/** True when the title contains at least one term. */
export function titleMatches(title: string, terms: readonly string[]): boolean {
	return countTerms(title, terms) > 0;
}

export function cutSnippet(line: string): string {
	const trimmed = line.trim();
	return trimmed.length > MAX_SEARCH_LINE_CHARS
		? `${trimmed.slice(0, MAX_SEARCH_LINE_CHARS)}…`
		: trimmed;
}
