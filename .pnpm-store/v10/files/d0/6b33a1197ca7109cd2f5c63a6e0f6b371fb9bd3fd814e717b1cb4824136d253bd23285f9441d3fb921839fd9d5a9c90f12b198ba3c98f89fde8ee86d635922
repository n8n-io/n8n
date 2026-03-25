import { joinShortcodesToEmoji } from './joinShortcodesToEmoji';
import type { CompactEmoji, Emoji, EmojiLike, ShortcodesDataset } from './types';

/**
 * By default, emoji skin modifications are nested under the base neutral skin tone emoji.
 * To flatten the data into a single dimension array, use the `flattenEmojiData` function.
 *
 * If `shortcodeDatasets` is defined, it will join the shortcodes to the emoji object using
 * `joinShortcodesToEmoji`.
 *
 * > Tags from the parent emoji will be passed down to the skin modifications.
 */
function flattenEmojiData(data: Emoji[], shortcodeDatasets?: ShortcodesDataset[]): Emoji[];

function flattenEmojiData(
	data: CompactEmoji[],
	shortcodeDatasets?: ShortcodesDataset[],
): CompactEmoji[];

function flattenEmojiData(
	data: EmojiLike[],
	shortcodeDatasets: ShortcodesDataset[] = [],
): EmojiLike[] {
	const emojis: Emoji[] = [];

	(data as Emoji[]).forEach((emoji) => {
		if (emoji.skins) {
			// Dont include nested skins array
			const { skins, ...baseEmoji } = emoji;

			emojis.push(joinShortcodesToEmoji(baseEmoji, shortcodeDatasets));

			// Push each skin modification into the root list
			skins.forEach((skin) => {
				const skinEmoji = { ...skin };

				// Inherit tags from parent if they exist
				if (baseEmoji.tags) {
					skinEmoji.tags = [...baseEmoji.tags];
				}

				emojis.push(joinShortcodesToEmoji(skinEmoji, shortcodeDatasets));
			});
		} else {
			emojis.push(joinShortcodesToEmoji(emoji, shortcodeDatasets));
		}
	});

	return emojis;
}

export { flattenEmojiData };
