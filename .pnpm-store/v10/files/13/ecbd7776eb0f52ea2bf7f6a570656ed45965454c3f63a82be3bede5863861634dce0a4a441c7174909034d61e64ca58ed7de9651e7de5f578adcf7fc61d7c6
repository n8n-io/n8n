/**
 * Filters a string array for values with a matching length.
 * If length is not provided or no values with a matching length are found,
 * then the result will be determined using the given error handling strategy.
 *
 * @param options The options to provide.
 * @param options.wordList A list of words to filter.
 * @param options.length The exact or the range of lengths the words should have.
 * @param options.strategy The strategy to apply when no words with a matching length are found. Defaults to 'any-length'.
 *
 * Available error handling strategies:
 *
 * - `fail`: Throws an error if no words with the given length are found.
 * - `shortest`: Returns any of the shortest words.
 * - `closest`: Returns any of the words closest to the given length.
 * - `longest`: Returns any of the longest words.
 * - `any-length`: Returns a copy of the original word list.
 */
export declare function filterWordListByLength(options: {
    wordList: ReadonlyArray<string>;
    length?: number | {
        min: number;
        max: number;
    };
    strategy?: 'fail' | 'closest' | 'shortest' | 'longest' | 'any-length';
}): string[];
