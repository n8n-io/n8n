import { SEQUENCE_REMOVAL_PATTERN } from './constants';
import type { Hexcode } from './types';

const STRIP_PATTERN = new RegExp(`(-| )?(${SEQUENCE_REMOVAL_PATTERN.source})`, 'g');

/**
 * This function will strip zero width joiners (`200D`) and variation selectors
 * (`FE0E`, `FE0F`) from a hexadecimal codepoint.
 *
 * ```ts
 * import { stripHexcode } from 'emojibase';
 *
 * stripHexcode('1F468-200D-2695-FE0F'); // 1F468-2695
 * ```
 */
export function stripHexcode(hexcode: Hexcode): Hexcode {
	return hexcode.replace(STRIP_PATTERN, '');
}
