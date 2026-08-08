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

const FALLBACK_INSTRUCTIONS =
	'No API documentation was found for this endpoint. Generate the response based on your knowledge of this API. Follow standard REST conventions for the HTTP method: GET returns resource data, POST returns the created resource, PUT/PATCH returns the updated resource, DELETE returns 204 or confirmation.';

const docsCache = new Map<string, string>();

/** Track whether we've warned about context7 issues this session */
let context7WarningLogged = false;

async function resolveLibraryId(serviceName: string): Promise<string | undefined> {
	const cacheKey = `lib:${serviceName}`;
	if (docsCache.has(cacheKey)) return docsCache.get(cacheKey);

	try {
		const apiKey = process.env.CONTEXT7_API_KEY;
		const headers: Record<string, string> = {};
		if (apiKey) headers.Authorization = `Bearer ${apiKey}`;

		const url = `${CONTEXT7_BASE_URL}/libs/search?libraryName=${encodeURIComponent(serviceName + ' API')}&query=REST+API+endpoints+response+format`;
		const res = await fetch(url, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS), headers });

		if (!res.ok) {
			const body = await res.text().catch(() => '');
			if (body.includes('Quota') || body.includes('quota') || res.status === 429) {
				if (!context7WarningLogged) {
					Container.get(Logger).warn(
						'[EvalMock] Context7 quota exceeded — mock responses will rely on LLM training data. Set CONTEXT7_API_KEY for higher limits.',
					);
					context7WarningLogged = true;
				}
			}
			return undefined;
		}

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
 * Returns plain text ready for LLM consumption.
 * When docs aren't available, returns explicit fallback instructions
 * so the LLM knows to use its training data.
 */
export async function fetchApiDocs(serviceName: string, endpointQuery: string): Promise<string> {
	const cacheKey = `docs:${serviceName}:${endpointQuery}`;
	if (docsCache.has(cacheKey)) return docsCache.get(cacheKey)!;

	const libraryId = await resolveLibraryId(serviceName);
	if (!libraryId) return FALLBACK_INSTRUCTIONS;

	try {
		const apiKey = process.env.CONTEXT7_API_KEY;
		const headers: Record<string, string> = {};
		if (apiKey) headers.Authorization = `Bearer ${apiKey}`;

		const url = `${CONTEXT7_BASE_URL}/context?libraryId=${encodeURIComponent(libraryId)}&query=${encodeURIComponent(endpointQuery)}&type=txt`;
		const res = await fetch(url, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS), headers });

		if (!res.ok) {
			if (res.status === 429) {
				if (!context7WarningLogged) {
					Container.get(Logger).warn(
						'[EvalMock] Context7 quota exceeded — mock responses will rely on LLM training data. Set CONTEXT7_API_KEY for higher limits.',
					);
					context7WarningLogged = true;
				}
			}
			return FALLBACK_INSTRUCTIONS;
		}

		const text = await res.text();
		if (!text.trim()) return FALLBACK_INSTRUCTIONS;

		docsCache.set(cacheKey, text);
		return text;
	} catch (error) {
		Container.get(Logger).debug(
			`[EvalMock] Context7 docs fetch failed for "${serviceName}": ${error instanceof Error ? error.message : String(error)}`,
		);
		return FALLBACK_INSTRUCTIONS;
	}
}
