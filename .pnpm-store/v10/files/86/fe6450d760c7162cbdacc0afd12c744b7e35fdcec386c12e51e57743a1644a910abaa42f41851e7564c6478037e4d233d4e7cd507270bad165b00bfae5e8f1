import type { CodePoint, Unicode } from './types';

/**
 * This function will convert an array of numerical codepoints to a literal emoji Unicode character.
 *
 * ```ts
 * import { fromCodepointToUnicode } from 'emojibase';
 *
 * fromCodepointToUnicode([128104, 8205, 128105, 8205, 128103, 8205, 128102]); // 👨‍👩‍👧‍👦
 * ```
 */
export function fromCodepointToUnicode(codepoint: CodePoint[]): Unicode {
	return String.fromCodePoint(...codepoint);
}
