import type { SkinTone } from './types';

/**
 * Append a skin tone index (number) to the end of a shortcode.
 */
export function appendSkinToneIndex(
	shortcode: string,
	emoji: { tone?: SkinTone | SkinTone[] },
	prefix: string = '',
): string {
	return `${shortcode}_${prefix}${Array.isArray(emoji.tone) ? emoji.tone.join('-') : emoji.tone}`;
}
