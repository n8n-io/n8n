export interface WebSearchResult {
	title: string;
	url: string;
	snippet: string;
	publishedDate?: string;
}

export interface WebSearchResponse {
	query: string;
	results: WebSearchResult[];
}

export interface WebSearchOptions {
	maxResults?: number;
	includeDomains?: string[];
	excludeDomains?: string[];
}
