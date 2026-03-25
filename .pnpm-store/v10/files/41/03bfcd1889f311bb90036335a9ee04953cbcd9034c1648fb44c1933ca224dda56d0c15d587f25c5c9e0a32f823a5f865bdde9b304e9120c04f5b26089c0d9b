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
export declare function generateEmoticonPermutations(emoticon: Emoticon, options?: PermutationOptions): Emoticon[];
//# sourceMappingURL=generateEmoticonPermutations.d.ts.map