import type { CompactEmoji, Emoji, EmojiLike, ShortcodesDataset } from './types';

/**
 * Will join shortcodes from multiple shortcode datasets into a single emoji object
 * using its hexcode. Will remove duplicates in the process.
 */
function joinShortcodesToEmoji(emoji: Emoji, shortcodeDatasets: ShortcodesDataset[]): Emoji;

function joinShortcodesToEmoji(
	emoji: CompactEmoji,
	shortcodeDatasets: ShortcodesDataset[],
): CompactEmoji;

function joinShortcodesToEmoji(
	emoji: EmojiLike,
	shortcodeDatasets: ShortcodesDataset[],
): EmojiLike {
	if (shortcodeDatasets.length === 0) {
		return emoji;
	}

	const list = new Set(emoji.shortcodes);

	shortcodeDatasets.forEach((dataset) => {
		const shortcodes = dataset[emoji.hexcode];

		if (Array.isArray(shortcodes)) {
			shortcodes.forEach((code) => list.add(code));
		} else if (shortcodes) {
			list.add(shortcodes);
		}
	});

	// eslint-disable-next-line no-param-reassign
	emoji.shortcodes = [...list];

	if (emoji.skins) {
		emoji.skins.forEach((skin) => {
			joinShortcodesToEmoji(skin as Emoji, shortcodeDatasets);
		});
	}

	return emoji;
}

export { joinShortcodesToEmoji };
