export interface FetchedPage {
	url: string;
	finalUrl: string;
	title: string;
	content: string;
	truncated: boolean;
	contentLength: number;
	safetyFlags?: {
		jsRenderingSuspected?: boolean;
		loginRequired?: boolean;
	};
}

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

export interface WebResearchService {
	search?(
		query: string,
		options?: {
			maxResults?: number;
			includeDomains?: string[];
			excludeDomains?: string[];
		},
	): Promise<WebSearchResponse>;

	fetchUrl(
		url: string,
		options?: {
			maxContentLength?: number;
			maxResponseBytes?: number;
			timeoutMs?: number;
			authorizeUrl?: (url: string) => Promise<void>;
		},
	): Promise<FetchedPage>;
}
