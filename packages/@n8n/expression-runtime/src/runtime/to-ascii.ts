import { Transliterate } from 'transliteration/dist/node/src/common/transliterate';

import { TO_ASCII_OPTIONS } from '../extensions/to-ascii-options';
import { TO_ASCII_CHARMAP_HOST_FUNCTION } from './host-function-names';

/**
 * Takes the host function off the guest global object and returns it.
 * An expression can then reach the host function only through the returned reference.
 *
 * @throws {Error} when the host did not set the function
 */
const takeHostFunction = (name: string): (() => string) => {
	const guestGlobal = globalThis as unknown as Record<string, (() => string) | undefined>;
	const hostFunction = guestGlobal[name];
	if (typeof hostFunction !== 'function') {
		throw new Error('A host function is missing from the guest global object');
	}
	delete guestGlobal[name];
	return hostFunction;
};

/** Returns a `toAscii` that reads the character map on its first call only. */
const createToAscii = (readCharmapJson: () => string) => {
	let transliterator: Transliterate | undefined;
	return (value: string): string => {
		transliterator ??= new Transliterate(undefined, JSON.parse(readCharmapJson()));
		return transliterator.transliterate(value, TO_ASCII_OPTIONS);
	};
};

/**
 * Guest version of `toAscii` in `extensions/to-ascii.ts`.
 * The character map comes from the host, so it stays out of the runtime bundle.
 * The conversion runs in the guest, within the time and memory limits of the sandbox.
 */
export const toAscii = createToAscii(takeHostFunction(TO_ASCII_CHARMAP_HOST_FUNCTION));
