import type { CompactEmoji, Emoji, FetchEmojisOptions, FlatCompactEmoji, FlatEmoji, Locale } from './types';
/**
 * Fetches and returns a localized list of emojis (and optional shortcodes) from our CDN.
 * Uses `fetchFromCDN` and `fetchShortcodes` under the hood.
 *
 * ```ts
 * import { fetchEmojis } from 'emojibase';
 *
 * await fetchEmojis('ja', {
 * 	compact: true,
 * 	shortcodes: ['cldr'],
 * 	version: '2.1.3',
 * });
 * ```
 *
 * It's also possible to load shortcodes from other languages by prefixing the shortcode preset with
 * the chosen locale. This is useful if you want to support English and Japanese in parallel, for
 * example.
 *
 * ```ts
 * await fetchEmojis('ja', {
 * 	shortcodes: ['cldr', 'en/cldr'],
 * });
 * ```
 */
declare function fetchEmojis(locale: Locale, options: FetchEmojisOptions & {
    compact: true;
    flat: true;
}): Promise<FlatCompactEmoji[]>;
declare function fetchEmojis(locale: Locale, options: FetchEmojisOptions & {
    compact: true;
    flat?: false;
}): Promise<CompactEmoji[]>;
declare function fetchEmojis(locale: Locale, options: FetchEmojisOptions & {
    compact?: false;
    flat: true;
}): Promise<FlatEmoji[]>;
declare function fetchEmojis(locale: Locale, options?: FetchEmojisOptions & {
    compact?: false;
    flat?: false;
}): Promise<Emoji[]>;
export { fetchEmojis };
//# sourceMappingURL=fetchEmojis.d.ts.map