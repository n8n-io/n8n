import { fetchFromCDN } from './fetchFromCDN';
import type { FetchFromCDNOptions, Locale, ShortcodePreset, ShortcodesDataset } from './types';

const ALIASES: Partial<Record<ShortcodePreset, string>> = {
	discord: 'joypixels',
	slack: 'iamcal',
};

/**
 * Fetches and returns localized shortcodes for the defined preset from our CDN.
 * The response is a mapping of emoji hexcodes to shortcodes (either a string or array of strings).
 * Uses `fetchFromCDN` under the hood.
 *
 * ```ts
 * import { fetchShortcodes } from 'emojibase';
 *
 * await fetchShortcodes('ja', 'cldr', { version: '2.1.3' });
 * ```
 */
export async function fetchShortcodes(
	locale: Locale,
	preset: ShortcodePreset,
	options?: FetchFromCDNOptions,
): Promise<ShortcodesDataset> {
	return fetchFromCDN(`${locale}/shortcodes/${ALIASES[preset] ?? preset}.json`, options);
}
