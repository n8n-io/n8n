import type {
	FetchedPage,
	InstanceAiWebResearchService,
	ServiceProxyConfig,
	WebSearchResponse,
} from '@n8n/instance-ai';
import { Service } from '@n8n/di';

import { SsrfProtectionService } from '@/services/ssrf/ssrf-protection.service';

import { braveSearch } from './brave-search';
import { LRUCache } from './cache';
import { fetchAndExtract } from './fetch-and-extract';
import { searxngSearch } from './searxng-search';
import { maybeSummarize } from './summarize-content';

interface SearchOptions {
	maxResults?: number;
	includeDomains?: string[];
	excludeDomains?: string[];
}

export interface WebResearchBackendConfig {
	braveApiKey?: string;
	searxngUrl?: string;
	searchProxyConfig?: ServiceProxyConfig;
}

@Service()
export class WebResearchService {
	/** Cache for web research results, keyed per scope to prevent cross-scope data leaks. */
	private readonly webResearchCache = new LRUCache<FetchedPage>({
		maxEntries: 100,
		ttlMs: 15 * 60 * 1000,
	});

	/** Cache for web search results, keyed per scope to prevent cross-scope data leaks. */
	private readonly searchCache = new LRUCache<WebSearchResponse>({
		maxEntries: 100,
		ttlMs: 15 * 60 * 1000,
	});

	constructor(private readonly ssrfProtectionService: SsrfProtectionService) {}

	createAdapter(params: {
		scopeId: string;
		backend: WebResearchBackendConfig;
	}): InstanceAiWebResearchService {
		return this.createLazyAdapter({
			scopeId: params.scopeId,
			resolveBackend: async () => params.backend,
		});
	}

	createLazyAdapter(params: {
		scopeId: string;
		resolveBackend: () => Promise<WebResearchBackendConfig>;
	}): InstanceAiWebResearchService {
		const fetchCache = this.webResearchCache;
		const ssrf = this.ssrfProtectionService;
		const scopeId = params.scopeId;

		let resolvedSearchMethod: ReturnType<WebResearchService['buildSearchMethod']>;
		let searchResolved = false;
		const lazySearch: InstanceAiWebResearchService['search'] = async (query, options) => {
			if (!searchResolved) {
				resolvedSearchMethod = this.buildSearchMethod(await params.resolveBackend(), scopeId);
				searchResolved = true;
			}
			if (!resolvedSearchMethod) return { query, results: [] };
			return await resolvedSearchMethod(query, options);
		};

		return {
			search: lazySearch,

			async fetchUrl(url, options) {
				const cacheKey = `${scopeId}:${url}`;
				const cached = fetchCache.get(cacheKey);
				if (cached) {
					if (options?.authorizeUrl && cached.finalUrl) {
						const origHost = new URL(url).hostname;
						const finalHost = new URL(cached.finalUrl).hostname;
						if (origHost !== finalHost) {
							await options.authorizeUrl(cached.finalUrl);
						}
					}
					return cached;
				}

				const page = await fetchAndExtract(url, {
					maxContentLength: options?.maxContentLength,
					maxResponseBytes: options?.maxResponseBytes,
					timeoutMs: options?.timeoutMs,
					authorizeUrl: options?.authorizeUrl,
					ssrf,
				});

				const result = await maybeSummarize(page);
				fetchCache.set(cacheKey, result);

				return result;
			},
		};
	}

	private buildSearchMethod(backend: WebResearchBackendConfig, scopeId: string) {
		const keyPrefix = `${scopeId}:`;

		if (backend.searchProxyConfig) {
			return async (query: string, options?: SearchOptions) => {
				const cacheKey = `${keyPrefix}${JSON.stringify([query, options ?? {}])}`;
				const cached = this.searchCache.get(cacheKey);
				if (cached) return cached;

				const result = await braveSearch('', query, {
					...options,
					proxyConfig: backend.searchProxyConfig,
				});
				this.searchCache.set(cacheKey, result);
				return result;
			};
		}

		if (backend.braveApiKey) {
			return async (query: string, options?: SearchOptions) => {
				const cacheKey = `${keyPrefix}${JSON.stringify([query, options ?? {}])}`;
				const cached = this.searchCache.get(cacheKey);
				if (cached) return cached;

				const result = await braveSearch(backend.braveApiKey ?? '', query, options ?? {});
				this.searchCache.set(cacheKey, result);
				return result;
			};
		}

		if (backend.searxngUrl) {
			return async (query: string, options?: SearchOptions) => {
				const cacheKey = `${keyPrefix}${JSON.stringify([query, options ?? {}])}`;
				const cached = this.searchCache.get(cacheKey);
				if (cached) return cached;

				const result = await searxngSearch(backend.searxngUrl ?? '', query, options ?? {});
				this.searchCache.set(cacheKey, result);
				return result;
			};
		}

		return undefined;
	}
}
