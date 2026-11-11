/**
 * Ranking for the tool catalog's `find_tools`. BM25 over each tool's name and
 * description, with the name weighted above the description, plus a regular
 * expression filter. Pure functions, so the tool catalog can stay free of scoring.
 */

import { createContext, runInContext } from 'node:vm';

export interface SearchableTool {
	readonly name: string;
	readonly description: string;
}

const NAME_WEIGHT = 3;
const K1 = 1.2;
const B = 0.75;

export const MAX_PATTERN_LENGTH = 200;

/**
 * Most time a `pattern` filter can run. A short pattern with nested quantifiers can
 * backtrack for seconds, and a regular expression blocks the event loop while it runs.
 */
export const PATTERN_TIMEOUT_MS = 100;

const MATCH_SCRIPT =
	"texts.map(([name, description]) => { const regex = new RegExp(pattern, 'i'); return regex.test(name) || regex.test(description); })";

function isTimeoutError(error: unknown): boolean {
	return (
		typeof error === 'object' &&
		error !== null &&
		'code' in error &&
		error.code === 'ERR_SCRIPT_EXECUTION_TIMEOUT'
	);
}

/** Lowercase words, with camelCase, snake_case, kebab-case and dotted names split. */
export function tokenize(value: string): string[] {
	return value
		.replace(/([a-z0-9])([A-Z])/g, '$1 $2')
		.toLowerCase()
		.split(/[^\p{L}\p{N}]+/u)
		.filter((token) => token.length > 0);
}

function documentTokens(tool: SearchableTool): string[] {
	const nameTokens = tokenize(tool.name);
	const repeatedName = Array.from({ length: NAME_WEIGHT }, () => nameTokens).flat();
	return [...repeatedName, ...tokenize(tool.description)];
}

/** Tools that match `query`, best first. Ties keep name order, so results are stable. */
export function rankTools<T extends SearchableTool>(tools: readonly T[], query: string): T[] {
	const queryTokens = [...new Set(tokenize(query))];
	if (queryTokens.length === 0 || tools.length === 0) return [];

	const documents = tools.map((tool) => {
		const tokens = documentTokens(tool);
		const counts = new Map<string, number>();
		for (const token of tokens) counts.set(token, (counts.get(token) ?? 0) + 1);
		return { tool, length: tokens.length, counts };
	});
	const averageLength = documents.reduce((sum, doc) => sum + doc.length, 0) / documents.length;
	const documentFrequency = new Map<string, number>();
	for (const token of queryTokens) {
		documentFrequency.set(token, documents.filter((doc) => doc.counts.has(token)).length);
	}

	return documents
		.map((doc) => {
			let score = 0;
			for (const token of queryTokens) {
				const frequency = doc.counts.get(token) ?? 0;
				if (frequency === 0) continue;
				const matching = documentFrequency.get(token) ?? 0;
				const idf = Math.log(1 + (documents.length - matching + 0.5) / (matching + 0.5));
				const norm = frequency + K1 * (1 - B + (B * doc.length) / (averageLength || 1));
				score += (idf * frequency * (K1 + 1)) / norm;
			}
			return { tool: doc.tool, score };
		})
		.filter(({ score }) => score > 0)
		.sort(
			(left, right) => right.score - left.score || left.tool.name.localeCompare(right.tool.name),
		)
		.map(({ tool }) => tool);
}

/** Tools whose name or description matches `pattern`, case-insensitive. Throws on a bad pattern. */
export function filterTools<T extends SearchableTool>(tools: readonly T[], pattern: string): T[] {
	if (pattern.length > MAX_PATTERN_LENGTH) {
		throw new Error(
			`Pattern is too long (max ${MAX_PATTERN_LENGTH} characters). Use a shorter pattern or a query.`,
		);
	}
	try {
		new RegExp(pattern, 'i');
	} catch (error) {
		const reason = error instanceof Error ? error.message : String(error);
		throw new Error(`Invalid pattern "${pattern}": ${reason}`);
	}
	// The match runs in a separate context only so that a timeout can stop it. This is the
	// approach of `safeRegex` in n8n-workflow, which this SDK does not depend on. One timeout
	// covers all tools, not each test.
	const context = createContext({
		pattern,
		texts: tools.map((tool) => [tool.name, tool.description]),
	});
	let matches: unknown;
	try {
		matches = runInContext(MATCH_SCRIPT, context, { timeout: PATTERN_TIMEOUT_MS });
	} catch (error) {
		if (!isTimeoutError(error)) throw error;
		throw new Error(
			`Pattern "${pattern}" took too long to match. Use a simpler pattern or a query.`,
		);
	}
	if (!Array.isArray(matches)) return [];
	const matched: unknown[] = matches;
	return tools.filter((_, index) => matched[index] === true);
}
