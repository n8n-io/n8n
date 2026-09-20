import type { NodeRegistry } from './node-registry';
import type { NodeOperation, OperationKind } from './types';

export interface Candidate {
	operation: NodeOperation;
	score: number;
	matched: string[];
}

export interface RetrievalOptions {
	kind?: OperationKind | readonly OperationKind[];
	integration?: string;
	limit?: number;
	/** Minimum score for a candidate to be listed. */
	minScore?: number;
}

const STOP_WORDS = new Set(
	`a an the to of in on and or for with it is be that this when then also every
	each into from as at by if we i my our`.split(/\s+/),
);

export function tokenize(text: string): string[] {
	return text
		.toLowerCase()
		.replace(/[^a-z0-9#/_.\s-]/g, ' ')
		.split(/\s+/)
		.map((token) => token.replace(/^[#/._-]+|[#/._-]+$/g, ''))
		.filter((token) => token.length > 1 && !STOP_WORDS.has(token));
}

/** Stable id from the first three tokens of `text`, e.g. `send-slack-message-2`. */
export const idFromText = (text: string, fallback: string, index: number): string =>
	`${tokenize(text).slice(0, 3).join('-') || fallback}-${index + 1}`;

function stem(token: string): string {
	return token.replace(/(ings?|ed|es|s)$/, '');
}

/**
 * Lexical candidate retrieval over the registry. Deterministic and cheap: it
 * narrows thousands of operations to a handful so the decision model only
 * ever scores a bounded, semantically named option set.
 */
export function retrieveCandidates(
	registry: NodeRegistry,
	query: string,
	options: RetrievalOptions = {},
): Candidate[] {
	const kinds =
		options.kind === undefined
			? undefined
			: new Set(Array.isArray(options.kind) ? options.kind : [options.kind]);
	return rankOperations(
		registry
			.list({ integration: options.integration })
			.filter((operation) => !kinds || kinds.has(operation.kind)),
		query,
		options,
	);
}

/** Use the same ranking for the static registry and installed operation catalogs. */
export function rankOperations<T extends Pick<NodeOperation, 'id' | 'integration' | 'keywords'>>(
	operations: readonly T[],
	query: string,
	options: Pick<RetrievalOptions, 'limit' | 'minScore'> = {},
): Array<{ operation: T; score: number; matched: string[] }> {
	const tokens = new Set(tokenize(query).map(stem));
	const phrases = query.toLowerCase();
	const results: Array<{ operation: T; score: number; matched: string[] }> = [];
	for (const operation of operations) {
		let score = 0;
		const matched: string[] = [];
		for (const keyword of operation.keywords) {
			const keywordTokens = tokenize(keyword).map(stem);
			if (keywordTokens.length === 0) continue;
			if (keywordTokens.length > 1) {
				if (phrases.includes(keyword.toLowerCase())) {
					score += 2 * keywordTokens.length;
					matched.push(keyword);
				}
				continue;
			}
			if (tokens.has(keywordTokens[0])) {
				score += keywordTokens[0] === stem(operation.integration) ? 3 : 1;
				matched.push(keyword);
			}
		}
		if (tokens.has(stem(operation.integration))) score += 2;
		if (score >= (options.minScore ?? 1)) results.push({ operation, score, matched });
	}
	results.sort((a, b) => b.score - a.score || a.operation.id.localeCompare(b.operation.id));
	return results.slice(0, options.limit ?? 5);
}

/** Turns candidates into a prior distribution keyed by operation id. */
export function candidatePrior(candidates: readonly Candidate[]): Record<string, number> {
	const prior: Record<string, number> = {};
	for (const candidate of candidates) prior[candidate.operation.id] = candidate.score;
	return prior;
}
