import { joinShortcodesToEmoji } from './joinShortcodesToEmoji';
import type { CompactEmoji, Emoji, EmojiLike, ShortcodesDataset } from './types';

/**
 * Like `joinShortcodesToEmoji` but joins shortcodes to a list of emoji objects.
 */
function joinShortcodes(emojis: Emoji[], shortcodeDatasets: ShortcodesDataset[]): Emoji[];

function joinShortcodes(
	emojis: CompactEmoji[],
	shortcodeDatasets: ShortcodesDataset[],
): CompactEmoji[];

function joinShortcodes(emojis: EmojiLike[], shortcodeDatasets: ShortcodesDataset[]): EmojiLike[] {
	if (shortcodeDatasets.length === 0) {
		return emojis;
	}

	emojis.forEach((emoji) => {
		joinShortcodesToEmoji(emoji as Emoji, shortcodeDatasets);
	});

	return emojis;
}

export { joinShortcodes };
