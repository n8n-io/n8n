import { fetchFromCDN } from './fetchFromCDN';
import { fetchShortcodes } from './fetchShortcodes';
import { flattenEmojiData } from './flattenEmojiData';
import { joinShortcodes } from './joinShortcodes';
import type {
	CompactEmoji,
	Emoji,
	FetchEmojisExpandedOptions,
	FetchEmojisOptions,
	FlatCompactEmoji,
	FlatEmoji,
	Locale,
	ShortcodePreset,
	ShortcodesDataset,
} from './types';

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

async function fetchEmojis(
	locale: Locale,
	options: FetchEmojisOptions & { compact: true; flat: true },
): Promise<FlatCompactEmoji[]>;

async function fetchEmojis(
	locale: Locale,
	options: FetchEmojisOptions & { compact: true; flat?: false },
): Promise<CompactEmoji[]>;

async function fetchEmojis(
	locale: Locale,
	options: FetchEmojisOptions & { compact?: false; flat: true },
): Promise<FlatEmoji[]>;

async function fetchEmojis(
	locale: Locale,
	options?: FetchEmojisOptions & { compact?: false; flat?: false },
): Promise<Emoji[]>;

async function fetchEmojis(
	locale: Locale,
	options: FetchEmojisExpandedOptions = {},
): Promise<unknown[]> {
	const { compact = false, flat = false, shortcodes: presets = [], ...opts } = options;
	const emojis = await fetchFromCDN<Emoji[]>(
		`${locale}/${compact ? 'compact' : 'data'}.json`,
		opts,
	);
	let shortcodes: ShortcodesDataset[] = [];

	if (presets.length > 0) {
		shortcodes = await Promise.all(
			presets.map((preset) => {
				let promise: Promise<ShortcodesDataset>;

				if (preset.includes('/')) {
					const [customLocale, customPreset] = preset.split('/');

					promise = fetchShortcodes(customLocale as Locale, customPreset as ShortcodePreset, opts);
				} else {
					promise = fetchShortcodes(locale, preset as ShortcodePreset, opts);
				}

				// Ignore as the primary dataset should still load
				return promise.catch(() => ({}));
			}),
		);
	}

	return flat ? flattenEmojiData(emojis, shortcodes) : joinShortcodes(emojis, shortcodes);
}

export { fetchEmojis };
