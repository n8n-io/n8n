import type { Emoticon, PermutationOptions } from './types';

/**
 * This function will generate multiple permutations of a base emoticon character.
 * The following permutations will occur:
 *
 * - `)` mouth will be replaced with `]` and `}`. The same applies to sad/frowning mouths.
 * - `/` mouth will be replaced with `\`.
 * - `:` eyes will be replaced with `=`.
 * - Supports a `-` nose, by injecting between the eyes and mouth.
 * - Supports both uppercase and lowercase variants.
 *
 * ```ts
 * import { generateEmoticonPermutations } from 'emojibase';
 *
 * generateEmoticonPermutations(':)'); // =-), =-}, :-], =-], :-}, :-), =}, =], =), :}, :], :)
 * ```
 *
 * > The base emoticon must follow a set of naming guidelines to work properly.
 *
 * Furthermore, this function accepts an options object as the 2nd argument, as a means to customize
 * the output.
 *
 * - `isFace` (bool) - Toggles face permutations (mouth and eye variants). Defaults to `true`.
 * - `withNose` (bool) - Toggles nose inclusion. Defaults to `true`.
 *
 * ```ts
 * generateEmoticonPermutations(':)', { withNose: false }); // =}, =], =), :}, :], :)
 * generateEmoticonPermutations('\\m/', { isFace: false }); // \m/, \M/
 * ```
 */
export function generateEmoticonPermutations(
	emoticon: Emoticon,
	options: PermutationOptions = {},
): Emoticon[] {
	const { isFace = true, withNose = true } = options;
	const list = [emoticon];

	// Uppercase variant
	if (emoticon.toUpperCase() !== emoticon) {
		list.push(...generateEmoticonPermutations(emoticon.toUpperCase(), options));
	}

	if (isFace) {
		// Backwards slash mouth variant
		if (emoticon.includes('/')) {
			list.push(...generateEmoticonPermutations(emoticon.replace('/', '\\'), options));
		}

		// Bracket and curly brace mouth variants
		if (emoticon.includes(')')) {
			list.push(
				...generateEmoticonPermutations(emoticon.replace(')', ']'), options),
				...generateEmoticonPermutations(emoticon.replace(')', '}'), options),
			);
		}

		if (emoticon.includes('(')) {
			list.push(
				...generateEmoticonPermutations(emoticon.replace('(', '['), options),
				...generateEmoticonPermutations(emoticon.replace('(', '{'), options),
			);
		}

		// Eye variant
		if (emoticon.includes(':')) {
			list.push(...generateEmoticonPermutations(emoticon.replace(':', '='), options));
		}

		// Nose variant for ALL
		if (withNose) {
			list.forEach((emo) => {
				if (!emo.includes('-')) {
					list.push(`${emo.slice(0, -1)}-${emo.slice(-1)}`);
				}
			});
		}
	}

	// Sort from longest to shortest
	list.sort((a, b) => b.length - a.length);

	return [...new Set(list)];
}
