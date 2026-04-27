import type {
	IExecuteFunctions,
	ILoadOptionsFunctions,
	IHookFunctions,
	IWebhookFunctions,
	IPollFunctions,
	IHttpRequestOptions,
} from 'n8n-workflow';

export type NodeContext =
	| IExecuteFunctions
	| ILoadOptionsFunctions
	| IHookFunctions
	| IWebhookFunctions
	| IPollFunctions;

export interface PaginationOptions {
	strategy: 'offset' | 'cursor' | 'link-header' | 'token';

	/** Dot-path to items array in response (e.g. 'records', 'data.items'). Empty string for root array. */
	itemsPath: string;

	/** Items per page. Default: 100 */
	pageSize?: number;

	/** Safety limit to prevent infinite loops. Default: 1000 */
	maxPages?: number;

	// --- Offset-specific (Airtable-style: offset is a token in response) ---

	/** Dot-path to offset token in response body. Default: 'offset' */
	offsetResponsePath?: string;

	/** Query param name for offset token. Default: 'offset' */
	offsetQueryParam?: string;

	/** Query param name for page size. Default: 'pageSize' */
	pageSizeParam?: string;

	// --- Cursor-specific (Slack-style) ---

	/** Dot-path to next cursor in response. Default: 'response_metadata.next_cursor' */
	cursorPath?: string;

	/** Query param name for cursor. Default: 'cursor' */
	cursorQueryParam?: string;

	/** Query param name for page size in cursor pagination. Default: 'limit' */
	limitParam?: string;

	// --- Link-header specific (GitHub-style) ---

	/** Query param name for items per page. Default: 'per_page' */
	perPageParam?: string;

	// --- Token-specific (GraphQL endCursor/hasNextPage) ---

	/** Dot-path to endCursor in response. */
	tokenPath?: string;

	/** Dot-path to hasNextPage boolean in response. */
	hasMorePath?: string;
}

export interface RateLimitOptions {
	/** Maximum retry attempts on 429. Default: 3 */
	maxRetries?: number;

	/** Header name containing retry delay in seconds. Default: 'retry-after' */
	retryAfterHeader?: string;

	/** Initial backoff delay in ms when no retry-after header. Default: 1000 */
	initialDelay?: number;

	/** Multiplier for exponential backoff. Default: 2 */
	backoffMultiplier?: number;
}

export interface ResolvedRateLimitOptions {
	maxRetries: number;
	retryAfterHeader: string;
	initialDelay: number;
	backoffMultiplier: number;
}

export interface FullResponse<T = unknown> {
	body: T;
	headers: Record<string, string>;
	statusCode: number;
}

/** Function that executes a single HTTP request and returns the response. */
export type RequestExecutor = <T = unknown>(options: IHttpRequestOptions) => Promise<T>;
