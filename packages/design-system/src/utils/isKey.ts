import { keymap } from './constants';

/**
 * Verify if the given event is mapped to a specific key
 *
 * @param key
 * @param e
 * @returns {boolean}
 */

export const isKey = (key: string, e: KeyboardEvent): boolean => {
	const keyCode: string | number =
		e.key || (e as unknown as { keyIdentifier: string }).keyIdentifier || e.keyCode;

	return keymap[key].indexOf(keyCode) !== -1;
};
