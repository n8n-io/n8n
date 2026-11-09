import { mock } from 'vitest-mock-extended';

import { AppBundleCache } from '../app-bundle-cache';
import { AppsConfig } from '../../apps.config';
import { AppBuildResultStore } from '../../storage/app-version-stores';

function setup(limit = 10) {
	const store = mock<AppBuildResultStore>();
	const config = new AppsConfig();
	config.bundleCacheMaxBytes = limit;
	store.readBundle.mockImplementation(
		async (version) => new Map([['index.html', Buffer.from(version)]]),
	);
	return { store, cache: new AppBundleCache(store, config) };
}

describe('AppBundleCache', () => {
	it('shares concurrent loads and computes validators once', async () => {
		const { cache, store } = setup();
		const [a, b] = await Promise.all([cache.get('one'), cache.get('one')]);
		expect(a).toBe(b);
		expect(a.get('index.html')).toMatchObject({
			body: Buffer.from('one'),
			contentType: 'text/html; charset=utf-8',
			etag: expect.stringMatching(/^W\/"[a-f0-9]{64}"$/),
		});
		expect(await cache.get('one')).toBe(a);
		expect(store.readBundle).toHaveBeenCalledTimes(1);
	});

	it('evicts by decoded bytes and recent use', async () => {
		const { cache, store } = setup(6);
		await cache.get('one');
		await cache.get('two');
		await cache.get('one');
		await cache.get('six');
		await cache.get('two');
		expect(store.readBundle.mock.calls.map(([id]) => id)).toEqual(['one', 'two', 'six', 'two']);
	});

	it('serves oversized bundles without retaining them', async () => {
		const { cache, store } = setup(2);
		await cache.get('large');
		await cache.get('large');
		expect(store.readBundle).toHaveBeenCalledTimes(2);
	});

	it('allows a later load after a storage failure', async () => {
		const { cache, store } = setup();
		store.readBundle.mockRejectedValueOnce(new Error('Storage unavailable'));
		await expect(cache.get('one')).rejects.toThrow('Storage unavailable');
		await expect(cache.get('one')).resolves.toBeInstanceOf(Map);
	});
});
