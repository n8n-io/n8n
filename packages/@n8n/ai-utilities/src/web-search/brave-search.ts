import type { WebSearchOptions, WebSearchResponse } from './types';

const BRAVE_SEARCH_PATH = '/res/v1/web/search';
const BRAVE_SEARCH_URL = `https://api.search.brave.com${BRAVE_SEARCH_PATH}`;

/** Brave rate-limits per second — retry so a burst of searches doesn't fail the caller. */
const MAX_ATTEMPTS = 3;
const RETRY_BASE_MS = 250;

interface BraveWebResult {
	title: string;
	url: string;
	description: string;
	age?: string;
}

interface BraveSearchApiResponse {
	web?: {
		results?: BraveWebResult[];
	};
}

export interface BraveSearchOptions extends WebSearchOptions {
	proxyConfig?: {
		apiUrl: string;
		getAuthHeaders: () => Promise<Record<string, string>>;
	};
}

/**
 * Execute a web search using the Brave Search API.
 *
 * Domain filtering uses Brave's native `site:` query syntax:
 *   includeDomains: ["docs.stripe.com"] -> query becomes "stripe webhooks (site:docs.stripe.com)"
 *   excludeDomains: ["reddit.com"]      -> query appends " -site:reddit.com"
 */
export async function braveSearch(
	apiKey: string,
	query: string,
	options: BraveSearchOptions,
): Promise<WebSearchResponse> {
	let searchQuery = query;

	if (options.includeDomains?.length) {
		const siteFilter = options.includeDomains.map((d) => `site:${d}`).join(' OR ');
		searchQuery = `${query} (${siteFilter})`;
	}

	if (options.excludeDomains?.length) {
		searchQuery += options.excludeDomains.map((d) => ` -site:${d}`).join('');
	}

	const params = new URLSearchParams({
		q: searchQuery,
		count: String(options.maxResults ?? 5),
	});

	const proxyConfig = options.proxyConfig;
	const baseUrl = proxyConfig ? `${proxyConfig.apiUrl}${BRAVE_SEARCH_PATH}` : BRAVE_SEARCH_URL;
	const proxyHeaders = proxyConfig ? await proxyConfig.getAuthHeaders() : undefined;
	const headers: Record<string, string> = {
		Accept: 'application/json',
		'Accept-Encoding': 'gzip',
		...(proxyHeaders ?? { 'X-Subscription-Token': apiKey }),
	};

	const runSearch = async () =>
		await fetch(`${baseUrl}?${params}`, {
			headers,
			...(options.abortSignal ? { signal: options.abortSignal } : {}),
		});
	const isRetryable = (status: number) => status === 429 || status >= 500;
	/** Abort-aware so a cancelled run doesn't sit out the delay; the retried fetch
	 *  then rejects on the aborted signal. */
	const backoff = async (ms: number) =>
		await new Promise<void>((resolve) => {
			const signal = options.abortSignal;
			if (signal?.aborted) {
				resolve();
				return;
			}
			const timer = setTimeout(() => {
				signal?.removeEventListener('abort', onAbort);
				resolve();
			}, ms);
			function onAbort() {
				clearTimeout(timer);
				resolve();
			}
			signal?.addEventListener('abort', onAbort, { once: true });
		});

	let response = await runSearch();
	for (
		let attempt = 1;
		attempt < MAX_ATTEMPTS && !response.ok && isRetryable(response.status);
		attempt++
	) {
		await backoff(RETRY_BASE_MS * 2 ** (attempt - 1));
		response = await runSearch();
	}

	if (!response.ok) {
		throw new Error(`Brave search failed: ${response.status} ${response.statusText}`);
	}

	const data = (await response.json()) as BraveSearchApiResponse;

	return {
		query,
		results: (data.web?.results ?? []).map((r) => ({
			title: r.title,
			url: r.url,
			snippet: r.description,
			...(r.age ? { publishedDate: r.age } : {}),
		})),
	};
}
