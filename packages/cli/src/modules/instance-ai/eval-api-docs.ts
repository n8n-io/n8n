/**
 * API documentation fetcher for eval mock generation.
 *
 * Uses Context7 to fetch real API documentation at runtime so the
 * Phase 2 LLM can generate accurate mock responses for any service.
 * Results are cached per query to avoid redundant fetches.
 */

import { Logger } from '@n8n/backend-common';
import { Container } from '@n8n/di';

const CONTEXT7_BASE_URL = 'https://context7.com/api/v2';
const FETCH_TIMEOUT_MS = 10_000;

const docsCache = new Map<string, string>();

async function resolveLibraryId(serviceName: string): Promise<string | undefined> {
	const cacheKey = `lib:${serviceName}`;
	if (docsCache.has(cacheKey)) return docsCache.get(cacheKey);

	try {
		const url = `${CONTEXT7_BASE_URL}/libs/search?libraryName=${encodeURIComponent(serviceName + ' API')}&query=REST+API+endpoints+response+format`;
		const res = await fetch(url, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
		if (!res.ok) return undefined;

		const results = (await res.json()) as Array<{ id: string; trust_score?: number }>;
		const best = results.sort((a, b) => (b.trust_score ?? 0) - (a.trust_score ?? 0))[0];
		if (best?.id) {
			docsCache.set(cacheKey, best.id);
			return best.id;
		}
	} catch (error) {
		Container.get(Logger).debug(
			`[EvalMock] Context7 library search failed for "${serviceName}": ${error instanceof Error ? error.message : String(error)}`,
		);
	}
	return undefined;
}

/**
 * Fetch API documentation for a specific endpoint from Context7.
 * Returns plain text ready for LLM consumption, or a fallback message if unavailable.
 */
export async function fetchApiDocs(serviceName: string, endpointQuery: string): Promise<string> {
	const cacheKey = `docs:${serviceName}:${endpointQuery}`;
	if (docsCache.has(cacheKey)) return docsCache.get(cacheKey)!;

	const libraryId = await resolveLibraryId(serviceName);
	if (!libraryId) return 'No documentation available.';

	try {
		const url = `${CONTEXT7_BASE_URL}/context?libraryId=${encodeURIComponent(libraryId)}&query=${encodeURIComponent(endpointQuery)}&type=txt`;
		const res = await fetch(url, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
		if (!res.ok) return 'No documentation available.';

		const text = await res.text();
		const truncated = text.length > 2000 ? text.slice(0, 2000) + '\n...(truncated)' : text;
		docsCache.set(cacheKey, truncated);
		return truncated;
	} catch (error) {
		Container.get(Logger).debug(
			`[EvalMock] Context7 docs fetch failed for "${serviceName}": ${error instanceof Error ? error.message : String(error)}`,
		);
		return 'No documentation available.';
	}
}
