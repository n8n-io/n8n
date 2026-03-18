import type { WebSearchResponse } from '@n8n/instance-ai';

const BRAVE_SEARCH_URL = 'https://api.search.brave.com/res/v1/web/search';

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

/**
 * Execute a web search using the Brave Search API.
 *
 * Domain filtering uses Brave's native `site:` query syntax:
 *   includeDomains: ["docs.stripe.com"] → query becomes "stripe webhooks (site:docs.stripe.com)"
 *   excludeDomains: ["reddit.com"]      → query appends " -site:reddit.com"
 */
export async function braveSearch(
	apiKey: string,
	query: string,
	options: {
		maxResults?: number;
		includeDomains?: string[];
		excludeDomains?: string[];
	},
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

	const response = await fetch(`${BRAVE_SEARCH_URL}?${params}`, {
		headers: {
			Accept: 'application/json',
			'Accept-Encoding': 'gzip',
			'X-Subscription-Token': apiKey,
		},
	});

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
