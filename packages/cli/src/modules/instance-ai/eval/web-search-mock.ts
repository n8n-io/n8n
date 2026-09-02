import type { Logger } from '@n8n/backend-common';

import { buildDateAnchors } from './date-anchors';
import { generateJson } from './mock-utils';

// ---------------------------------------------------------------------------
// Mock for the agent runtime's fallback `web_search` tool (the Brave/SearXNG
// path), injected via `AgentRuntimeInstrumentation.webSearch`. Results are
// LLM-generated and steered by the scenario — the web-search counterpart of
// the HTTP and MCP mocks. Provider-native web search never reaches this: it
// runs inside the real model call.
// ---------------------------------------------------------------------------

export interface WebSearchMockArgs {
	query: string;
	maxResults?: number;
	includeDomains?: string[];
	excludeDomains?: string[];
}

/** Mirrors `WebSearchResponse` from @n8n/ai-utilities — what the real tool returns. */
export interface WebSearchMockResult {
	query: string;
	results: Array<{ title: string; url: string; snippet: string; publishedDate?: string }>;
	note?: string;
}

export interface WebSearchMockOptions {
	agentInstructions: string;
	scenarioHints?: string;
	globalContext?: string;
	/** Data hint for the web_search tool from the scenario seed, when present. */
	searchHint?: string;
	onSearch: (args: WebSearchMockArgs, result: WebSearchMockResult) => void;
	logger: Logger;
}

const SEARCH_PROMPT = [
	'You simulate a web search API for an automated test of an AI agent. Design the result set the',
	'agent should receive for the given query, so the scenario can proceed the way the test intends.',
	'',
	'Rules:',
	'1. Respond ONLY with JSON: {"results": [{"title": "...", "url": "...", "snippet": "..."}]}.',
	'   Each result may include an optional "publishedDate" (ISO date). No prose, no fences.',
	'2. Results must look like real search hits: plausible domains, realistic titles, information-dense',
	'   snippets. Honor maxResults and include/exclude domain filters when given.',
	'3. When scenario hints mandate specific facts, values, or failures, the snippets must carry them',
	'   EXACTLY — the test asserts on them downstream.',
	'4. Stay consistent with prior searches this run: the same entities keep the same names, values,',
	'   and URLs.',
	'5. An empty results array is valid when the scenario calls for a fruitless search.',
].join('\n');

const MAX_PRIOR_SEARCH_CONTEXT_CHARS = 4000;

function validateSearchResults(parsed: unknown): WebSearchMockResult['results'] | undefined {
	if (parsed === null || typeof parsed !== 'object') return undefined;
	const results = (parsed as Record<string, unknown>).results;
	if (!Array.isArray(results)) return undefined;
	const valid: WebSearchMockResult['results'] = [];
	for (const entry of results) {
		if (entry === null || typeof entry !== 'object') continue;
		const hit = entry as Record<string, unknown>;
		if (typeof hit.title !== 'string' || typeof hit.url !== 'string') continue;
		valid.push({
			title: hit.title,
			url: hit.url,
			snippet: typeof hit.snippet === 'string' ? hit.snippet : '',
			...(typeof hit.publishedDate === 'string' ? { publishedDate: hit.publishedDate } : {}),
		});
	}
	return valid;
}

export function createWebSearchMock(
	options: WebSearchMockOptions,
): (args: WebSearchMockArgs) => Promise<WebSearchMockResult> {
	const { logger } = options;
	const cache = new Map<string, Promise<WebSearchMockResult>>();
	const priorSearches: string[] = [];

	return async (args) => {
		const cacheKey = JSON.stringify(args);
		let cached = cache.get(cacheKey);
		if (!cached) {
			cached = (async (): Promise<WebSearchMockResult> => {
				const sections = [
					`Simulate a web search for: ${JSON.stringify(args.query)}`,
					'',
					'## Search parameters',
					'',
					JSON.stringify(args, null, 1),
					'',
					'## Agent under test (its instructions)',
					'',
					options.agentInstructions.slice(0, 3000),
					...(options.scenarioHints
						? ['', '## Scenario hints (mandated facts/failures)', '', options.scenarioHints]
						: []),
					...(options.globalContext ? ['', '## Global context', '', options.globalContext] : []),
					...(options.searchHint ? ['', '## Web-search data hint', '', options.searchHint] : []),
					...(priorSearches.length > 0
						? ['', '## Prior searches this run (stay consistent with these)', '', ...priorSearches]
						: []),
					'',
					'## Date anchors',
					buildDateAnchors(new Date()),
				];
				const results = await generateJson(
					'eval-web-search',
					SEARCH_PROMPT,
					sections.join('\n'),
					validateSearchResults,
					logger,
				);
				if (!results) {
					logger.warn(`[EvalWebSearchMock] generation failed for query "${args.query}"`);
					return {
						query: args.query,
						results: [],
						note: 'Mock web-search generation failed — treat a scenario failure here as a framework issue, not agent behaviour.',
					};
				}
				// Enforce domain filters on the generated URLs like the real
				// provider would — but never at the cost of the scenario: when the
				// agent restricts to a real-world domain and the mock invented
				// scenario-domain URLs, dropping everything would starve the run
				// of its mandated facts, so an emptied result set falls back.
				const domainAllowed = (url: string): boolean => {
					let host: string;
					try {
						host = new URL(url).hostname;
					} catch {
						return false;
					}
					const matches = (domain: string) => host === domain || host.endsWith(`.${domain}`);
					if (args.excludeDomains?.some(matches)) return false;
					if (args.includeDomains?.length) return args.includeDomains.some(matches);
					return true;
				};
				let filtered = results.filter((hit) => domainAllowed(hit.url));
				if (filtered.length === 0 && results.length > 0) {
					logger.debug(
						`[EvalWebSearchMock] domain filters would empty the result set for "${args.query}" — serving unfiltered results to keep the scenario playable`,
					);
					filtered = results;
				}
				const capped =
					args.maxResults !== undefined ? filtered.slice(0, args.maxResults) : filtered;
				return { query: args.query, results: capped };
			})();
			cache.set(cacheKey, cached);
		}
		const result = await cached;
		// Carry titles, URLs, and snippet leads so later searches can stay
		// consistent with the facts already served, not just the headlines.
		const entry = `- search(${JSON.stringify(args.query).slice(0, 300)}) -> ${result.results
			.map((hit) => `${hit.title} <${hit.url}> ${hit.snippet.slice(0, 120)}`)
			.join(' | ')
			.slice(0, 900)}`;
		// Repeat (cache-hit) searches add no new information — don't duplicate them.
		if (
			!priorSearches.includes(entry) &&
			priorSearches.join('\n').length < MAX_PRIOR_SEARCH_CONTEXT_CHARS
		) {
			priorSearches.push(entry);
		}
		options.onSearch(args, result);
		return result;
	};
}
