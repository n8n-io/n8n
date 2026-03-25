import type { CDNUrlFn, FetchFromCDNOptions } from './types';

function getFetchUrl(path: string, version: string, cdnUrl?: CDNUrlFn | string): string {
	let fetchUrl = `https://cdn.jsdelivr.net/npm/emojibase-data@${version}/${path}`;

	if (typeof cdnUrl === 'function') {
		fetchUrl = cdnUrl(path, version);
	} else if (typeof cdnUrl === 'string') {
		fetchUrl = `${cdnUrl}/${path}`;
	}

	if (__DEV__) {
		if (!path?.endsWith('.json')) {
			throw new Error('A valid JSON dataset is required to fetch.');
		}

		if (!fetchUrl || !/^https?:\/\//.test(fetchUrl) || !fetchUrl.endsWith('.json')) {
			throw new Error('A valid CDN url is required to fetch.');
		}

		if (!version) {
			throw new Error('A valid release version is required.');
		}
	}

	return fetchUrl;
}

/**
 * This function will fetch `emojibase-data` JSON files from our CDN, parse them,
 * and return the response. It requires a file path relative to the `emojibase-data` package
 * as the 1st argument and an optional object of options as the 2rd argument.
 *
 * ```ts
 * import { fetchFromCDN } from 'emojibase';
 *
 * await fetchFromCDN('ja/compact.json', { version: '2.1.3' });
 * await fetchFromCDN('ja/compact.json', { cdnUrl: 'https://example.com/cdn/emojidata/latest' });
 * await fetchFromCDN('ja/compact.json', {
 *     cdnUrl: (path: string, version: string) => {
 *         return `https://example.com/cdn/emojidata/${version}/${path}`;
 *     }
 * });
 * ```
 */
export async function fetchFromCDN<T>(path: string, options: FetchFromCDNOptions = {}): Promise<T> {
	const { local = false, version = 'latest', cdnUrl, ...opts } = options;

	const fetchUrl = getFetchUrl(path, version, cdnUrl);

	const storage = local ? localStorage : sessionStorage;
	const cacheKey = `emojibase/${version}/${path}`;
	const cachedData = storage.getItem(cacheKey);

	// Check the cache first
	if (cachedData) {
		return JSON.parse(cachedData) as T;
	}

	// eslint-disable-next-line compat/compat
	const response = await fetch(fetchUrl, {
		credentials: 'omit',
		mode: 'cors',
		redirect: 'error',
		...opts,
	});

	if (!response.ok) {
		throw new Error('Failed to load Emojibase dataset.');
	}

	const data = (await response.json()) as T;

	try {
		storage.setItem(cacheKey, JSON.stringify(data));
	} catch {
		// Do not allow quota errors to break the app
	}

	return data;
}
