import type { WebSearchResponse } from '@n8n/instance-ai';

interface SearxngResult {
	url: string;
	title: string;
	content: string;
	publishedDate?: string;
}

interface SearxngApiResponse {
	results?: SearxngResult[];
}

/**
 * Execute a web search using a SearXNG instance.
 *
 * Domain filtering uses `site:` / `-site:` query syntax (same as Brave),
 * which SearXNG passes through to underlying search engines.
 *
 * SearXNG has no server-side `count` parameter — results are sliced client-side.
 */
export async function searxngSearch(
	baseUrl: string,
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

	// Normalize trailing slash
	const normalizedUrl = baseUrl.replace(/\/+$/, '');

	const params = new URLSearchParams({
		q: searchQuery,
		format: 'json',
		pageno: '1',
	});

	const response = await fetch(`${normalizedUrl}/search?${params}`, {
		headers: {
			Accept: 'application/json',
		},
	});

	if (!response.ok) {
		throw new Error(`SearXNG search failed: ${response.status} ${response.statusText}`);
	}

	const data = (await response.json()) as SearxngApiResponse;
	const maxResults = options.maxResults ?? 5;

	return {
		query,
		results: (data.results ?? []).slice(0, maxResults).map((r) => ({
			title: r.title,
			url: r.url,
			snippet: r.content,
			...(r.publishedDate ? { publishedDate: r.publishedDate } : {}),
		})),
	};
}
