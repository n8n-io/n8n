import type { WebSearchOptions, WebSearchResponse } from './types';

const BRAVE_SEARCH_PATH = '/res/v1/web/search';
const BRAVE_SEARCH_URL = `https://api.search.brave.com${BRAVE_SEARCH_PATH}`;

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

	const response = await fetch(`${baseUrl}?${params}`, { headers });

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
