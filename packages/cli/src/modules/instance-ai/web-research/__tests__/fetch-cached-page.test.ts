import type { FetchedPage } from '@n8n/instance-ai';

import { LRUCache } from '../cache';
import { fetchCachedPage } from '../fetch-cached-page';

function page(overrides: Partial<FetchedPage> = {}): FetchedPage {
	const content = 'x'.repeat(40_000);
	return {
		url: 'https://example.com/docs',
		finalUrl: 'https://example.com/docs',
		title: 'Docs',
		content,
		truncated: false,
		contentLength: content.length,
		...overrides,
	};
}

describe('fetchCachedPage', () => {
	let cache: LRUCache<FetchedPage>;

	beforeEach(() => {
		cache = new LRUCache<FetchedPage>();
	});

	it('returns the loaded page without cutting it', async () => {
		const load = vi.fn().mockResolvedValue(page());

		const result = await fetchCachedPage({
			cache,
			userId: 'user-1',
			url: 'https://example.com/docs',
			load,
		});

		expect(result.content.length).toBe(40_000);
		expect(result.truncated).toBe(false);
	});

	it('loads a page once for repeated calls by the same user', async () => {
		const load = vi.fn().mockResolvedValue(page());
		const params = { cache, userId: 'user-1', url: 'https://example.com/docs', load };

		await fetchCachedPage(params);
		const second = await fetchCachedPage(params);

		expect(load).toHaveBeenCalledTimes(1);
		expect(second.content.length).toBe(40_000);
	});

	it('does not share cached pages between users', async () => {
		const load = vi.fn().mockResolvedValue(page());

		await fetchCachedPage({ cache, userId: 'user-1', url: 'https://example.com/docs', load });
		await fetchCachedPage({ cache, userId: 'user-2', url: 'https://example.com/docs', load });

		expect(load).toHaveBeenCalledTimes(2);
	});

	it('authorizes the final host of a cached cross-host redirect', async () => {
		const load = vi.fn().mockResolvedValue(page({ finalUrl: 'https://other.example.org/docs' }));
		const authorizeUrl = vi.fn().mockRejectedValue(new Error('not approved'));
		await fetchCachedPage({ cache, userId: 'user-1', url: 'https://example.com/docs', load });

		await expect(
			fetchCachedPage({
				cache,
				userId: 'user-1',
				url: 'https://example.com/docs',
				load,
				authorizeUrl,
			}),
		).rejects.toThrow('not approved');
		expect(authorizeUrl).toHaveBeenCalledWith('https://other.example.org/docs');
	});

	it('does not authorize a cached page that stayed on the same host', async () => {
		const load = vi.fn().mockResolvedValue(page());
		const authorizeUrl = vi.fn();
		const params = { cache, userId: 'user-1', url: 'https://example.com/docs', load };
		await fetchCachedPage(params);

		await fetchCachedPage({ ...params, authorizeUrl });

		expect(authorizeUrl).not.toHaveBeenCalled();
	});
});
