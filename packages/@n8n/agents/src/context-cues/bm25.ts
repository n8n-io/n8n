/**
 * BM25 ranking of context cues, for runs without an embedding model.
 * Scores are normalized to 0–1 against a bound that does not grow with
 * cue length, so one threshold works for short and long cues.
 */

const K1 = 1.2;
const B = 0.75;
/** A match needs this many distinct shared terms, so one rare word cannot fire a cue. */
const MIN_MATCHED_TERMS = 2;
/**
 * A step that shares this many of a cue's strongest terms scores 1. Capping
 * the bound keeps long cues from needing every one of their terms to match.
 */
const FULL_MATCH_TERMS = 6;

const DEFAULT_STOPWORDS = (
	'a an and are as at be by for from has have if in into is it its of on or that the then this ' +
	'to was when with without not no do does use uses using every each one only must never'
).split(' ');

/** Lowercase terms, with camelCase, snake_case and dotted names split. */
export function tokenizeForBm25(value: string, stopwords: ReadonlySet<string>): string[] {
	return value
		.replace(/([a-z0-9])([A-Z])/g, '$1 $2')
		.toLowerCase()
		.split(/[^a-z0-9]+/)
		.filter((token) => token.length > 1 && !stopwords.has(token));
}

interface Bm25Document<K> {
	key: K;
	length: number;
	counts: Map<string, number>;
	selfScore: number;
}

export interface Bm25Index<K> {
	/** Normalized score (0–1) for each document with enough shared terms. */
	score(query: string): Map<K, number>;
}

export function createBm25Index<K>(
	entries: ReadonlyArray<{ key: K; text: string }>,
	extraStopwords: readonly string[] = [],
): Bm25Index<K> {
	const stopwords = new Set([...DEFAULT_STOPWORDS, ...extraStopwords]);
	const documents = entries.map(({ key, text }) => {
		const tokens = tokenizeForBm25(text, stopwords);
		const counts = new Map<string, number>();
		for (const token of tokens) counts.set(token, (counts.get(token) ?? 0) + 1);
		return { key, length: tokens.length, counts, selfScore: 0 };
	});
	const averageLength =
		documents.reduce((sum, doc) => sum + doc.length, 0) / (documents.length || 1);
	const documentFrequency = new Map<string, number>();
	for (const doc of documents) {
		for (const token of doc.counts.keys()) {
			documentFrequency.set(token, (documentFrequency.get(token) ?? 0) + 1);
		}
	}

	const termScore = (doc: Bm25Document<K>, term: string) => {
		const frequency = doc.counts.get(term) ?? 0;
		if (frequency === 0) return 0;
		const df = documentFrequency.get(term) ?? 0;
		const idf = Math.log(1 + (documents.length - df + 0.5) / (df + 0.5));
		const norm = frequency + K1 * (1 - B + (B * doc.length) / (averageLength || 1));
		return (idf * frequency * (K1 + 1)) / norm;
	};

	const rawScore = (doc: Bm25Document<K>, terms: Iterable<string>) => {
		let score = 0;
		let matched = 0;
		for (const term of terms) {
			const value = termScore(doc, term);
			if (value === 0) continue;
			matched++;
			score += value;
		}
		return { score, matched };
	};

	// The upper bound is the score of the document's strongest few terms.
	for (const doc of documents) {
		doc.selfScore = [...doc.counts.keys()]
			.map((term) => termScore(doc, term))
			.sort((a, b) => b - a)
			.slice(0, FULL_MATCH_TERMS)
			.reduce((sum, value) => sum + value, 0);
	}

	return {
		score(query) {
			const terms = new Set(tokenizeForBm25(query, stopwords));
			const scores = new Map<K, number>();
			for (const doc of documents) {
				const { score, matched } = rawScore(doc, terms);
				if (matched < MIN_MATCHED_TERMS || doc.selfScore === 0) continue;
				scores.set(doc.key, Math.min(1, score / doc.selfScore));
			}
			return scores;
		},
	};
}
