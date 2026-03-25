import { fetchFromCDN } from './fetchFromCDN';
import type { FetchFromCDNOptions, Locale, MessagesDataset } from './types';

/**
 * Fetches and returns localized messages for emoji related information like groups and sub-groups.
 * Uses `fetchFromCDN` under the hood.
 *
 * ```ts
 * import { fetchMessages } from 'emojibase';
 *
 * await fetchMessages('zh', { version: '2.1.3' });
 * ```
 */
export async function fetchMessages(
	locale: Locale,
	options?: FetchFromCDNOptions,
): Promise<MessagesDataset> {
	return fetchFromCDN(`${locale}/messages.json`, options);
}
