/** `emoji` is present only when the title starts with an emoji and has more text after it. */
export type TitleParts = { emoji?: string; text: string };

const EMOJI = /^(?:\p{Extended_Pictographic}|\p{Regional_Indicator})/u;

function firstGrapheme(text: string): string {
	const [first] = new Intl.Segmenter(undefined, { granularity: 'grapheme' }).segment(text);
	return first?.segment ?? '';
}

/**
 * Splits a title into its leading emoji and the text after it.
 * A title without a leading emoji, or with nothing after the emoji, comes back whole as `text`.
 */
export function splitTitleEmoji(title: string): TitleParts {
	const trimmed = title.trim();
	const first = firstGrapheme(trimmed);
	const rest = trimmed.slice(first.length).trim();
	const hasEmojiIcon = EMOJI.test(first) && rest !== '';
	return hasEmojiIcon ? { emoji: first, text: rest } : { text: title };
}
