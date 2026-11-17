import type { FetchedPage } from '@n8n/instance-ai';

import type { LRUCache } from './cache';

export interface FetchCachedPageParams {
	cache: LRUCache<FetchedPage>;
	/** Part of the cache key, so one user never reads another user's fetch. */
	userId: string;
	url: string;
	/** Fetches and extracts the full page on a cache miss. */
	load: () => Promise<FetchedPage>;
	/** Throws when the domain gate has not approved a URL. */
	authorizeUrl?: (url: string) => Promise<void>;
}

/**
 * Return the full extracted page, from the cache when possible. The research tool
 * slices the page per call, so the cache keeps the whole page for later offsets.
 */
export async function fetchCachedPage(params: FetchCachedPageParams): Promise<FetchedPage> {
	const cacheKey = `${params.userId}:${params.url}`;
	const cached = params.cache.get(cacheKey);
	if (cached) {
		await authorizeCachedRedirect(params, cached);
		return cached;
	}

	const page = await params.load();
	params.cache.set(cacheKey, page);
	return page;
}

/**
 * A fresh fetch authorizes each redirect hop. A cache hit skips those hops, so
 * check the cross-host final URL here. The error propagates, so the fetch fails
 * instead of returning cached content from an unapproved host.
 */
async function authorizeCachedRedirect(params: FetchCachedPageParams, cached: FetchedPage) {
	if (!params.authorizeUrl || !cached.finalUrl) return;
	if (new URL(params.url).hostname === new URL(cached.finalUrl).hostname) return;
	await params.authorizeUrl(cached.finalUrl);
}
