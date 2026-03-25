import { SEQUENCE_REMOVAL_PATTERN } from './constants';
import type { Hexcode, Unicode } from './types';

/**
 * This function will convert a literal emoji Unicode character into a dash separated
 * hexadecimal codepoint. Unless `false` is passed as the 2nd argument, zero width
 * joiner's and variation selectors are removed.
 *
 * ```ts
 * import { fromUnicodeToHexcode } from 'emojibase';
 *
 * fromUnicodeToHexcode('👨‍👩‍👧‍👦'); // 1F468-1F469-1F467-1F466
 * fromUnicodeToHexcode('👨‍👩‍👧‍👦', false); // 1F468-200D-1F469-200D-1F467-200D-1F466
 * ```
 */
export function fromUnicodeToHexcode(unicode: Unicode, strip: boolean = true): Hexcode {
	const hexcode: string[] = [];

	[...unicode].forEach((codepoint) => {
		let hex = codepoint.codePointAt(0)?.toString(16).toUpperCase() ?? '';

		while (hex.length < 4) {
			hex = `0${hex}`;
		}

		if (!strip || (strip && !hex.match(SEQUENCE_REMOVAL_PATTERN))) {
			hexcode.push(hex);
		}
	});

	return hexcode.join('-');
}
