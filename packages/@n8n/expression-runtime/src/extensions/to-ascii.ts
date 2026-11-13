import { transliterate } from 'transliteration';

import { TO_ASCII_OPTIONS } from './to-ascii-options';

/** Replaces each non-ASCII character with its ASCII equivalent, or with `?` when it has none. */
export const toAscii = (value: string): string => transliterate(value, TO_ASCII_OPTIONS);

/** Returns a function that gives the character map of `toAscii` as JSON, and builds it only one time. */
const createCharmapJsonReader = () => {
	let charmapJson: string | undefined;
	return (): string => {
		charmapJson ??= JSON.stringify(transliterate.setData());
		return charmapJson;
	};
};

/** Returns the character map of `toAscii` as JSON. */
export const readToAsciiCharmapJson = createCharmapJsonReader();
