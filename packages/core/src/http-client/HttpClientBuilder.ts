import { NodeApiError } from 'n8n-workflow';
import type {
	JsonObject,
	IHttpRequestOptions,
	IHttpRequestMethods,
	IDataObject,
} from 'n8n-workflow';

import { paginate } from './pagination';
import { withRetry } from './rate-limiter';
import type {
	NodeContext,
	PaginationOptions,
	RateLimitOptions,
	ResolvedRateLimitOptions,
} from './types';

const DEFAULT_RATE_LIMIT: ResolvedRateLimitOptions = {
	maxRetries: 3,
	retryAfterHeader: 'retry-after',
	initialDelay: 1000,
	backoffMultiplier: 2,
};

/**
 * Fluent builder for HTTP requests that handles authentication,
 * pagination, rate limiting, and body cleanup.
 *
 * Usage:
 * ```typescript
 * const data = await httpClient(this)
 *   .baseUrl('https://api.example.com')
 *   .endpoint('/users')
 *   .method('GET')
 *   .query({ active: true })
 *   .withAuthentication('exampleApi')
 *   .withPagination({ strategy: 'cursor', itemsPath: 'users', cursorPath: 'next' })
 *   .withRateLimiting()
 *   .executeAll();
 * ```
 */
export class HttpClientBuilder {
	private context: NodeContext;

	private config: IHttpRequestOptions;

	private credentialType?: string;

	private paginationOpts?: PaginationOptions;

	private rateLimitOpts?: ResolvedRateLimitOptions;

	constructor(context: NodeContext) {
		this.context = context;
		this.config = { url: '', method: 'GET' };
	}

	baseUrl(url: string): this {
		this.config.baseURL = url;
		return this;
	}

	endpoint(path: string): this {
		this.config.url = path;
		return this;
	}

	method(m: IHttpRequestMethods): this {
		this.config.method = m;
		return this;
	}

	body(data: IDataObject): this {
		this.config.body = data;
		return this;
	}

	query(params: IDataObject): this {
		this.config.qs = { ...(this.config.qs as IDataObject), ...params };
		return this;
	}

	headers(h: IDataObject): this {
		this.config.headers = { ...(this.config.headers as IDataObject), ...h };
		return this;
	}

	withAuthentication(credentialType: string): this {
		this.credentialType = credentialType;
		return this;
	}

	withPagination(opts: PaginationOptions): this {
		this.paginationOpts = opts;
		return this;
	}

	withRateLimiting(opts?: RateLimitOptions): this {
		this.rateLimitOpts = { ...DEFAULT_RATE_LIMIT, ...opts };
		return this;
	}

	/**
	 * Execute a single HTTP request.
	 *
	 * Cleans empty body/query objects, strips body from GET requests,
	 * applies authentication, and optionally retries on 429.
	 */
	async execute<T = unknown>(): Promise<T> {
		const options = this.buildOptions();
		const doRequest = () => this.doRequest<T>(options);

		return this.rateLimitOpts
			? withRetry(doRequest, this.rateLimitOpts, () => this.context.getNode())
			: doRequest();
	}

	/**
	 * Execute paginated requests, collecting all items across pages.
	 *
	 * Requires `.withPagination()` to be configured.
	 */
	async executeAll<T = unknown>(): Promise<T[]> {
		if (!this.paginationOpts) {
			throw new Error('executeAll() requires withPagination() to be configured');
		}

		const baseOptions = this.buildOptions();

		const executor = async <R = unknown>(options: IHttpRequestOptions): Promise<R> => {
			const doRequest = () => this.doRequest<R>(options);
			return this.rateLimitOpts
				? withRetry(doRequest, this.rateLimitOpts, () => this.context.getNode())
				: doRequest();
		};

		return paginate<T>(baseOptions, this.paginationOpts, executor);
	}

	private buildOptions(): IHttpRequestOptions {
		const options: IHttpRequestOptions = { ...this.config };

		// Clean empty body
		if (
			options.body &&
			typeof options.body === 'object' &&
			!Array.isArray(options.body) &&
			Object.keys(options.body as IDataObject).length === 0
		) {
			delete options.body;
		}

		// Clean empty query string
		if (options.qs && Object.keys(options.qs).length === 0) {
			delete options.qs;
		}

		// Strip body from GET requests
		if (options.method === 'GET') {
			delete options.body;
		}

		return options;
	}

	private async doRequest<T>(options: IHttpRequestOptions): Promise<T> {
		try {
			if (this.credentialType) {
				return (await this.context.helpers.httpRequestWithAuthentication.call(
					this.context,
					this.credentialType,
					options,
				)) as T;
			}
			return (await this.context.helpers.httpRequest(options)) as T;
		} catch (error) {
			throw new NodeApiError(this.context.getNode(), error as JsonObject);
		}
	}
}

/**
 * Creates a new HTTP client builder for the given node execution context.
 *
 * This is a standalone factory function - no changes to existing helpers required.
 */
export function httpClient(context: NodeContext): HttpClientBuilder {
	return new HttpClientBuilder(context);
}
