import { ModuleBase } from '../../internal/module-base';
/**
 * Module to return various types of words.
 */
export declare class WordModule extends ModuleBase {
    /**
     * Returns an adjective of random or optionally specified length.
     *
     * @param options The expected length of the word or the options to use.
     * @param options.length The expected length of the word.
     * @param options.strategy The strategy to apply when no words with a matching length are found.
     *
     * Available error handling strategies:
     *
     * - `fail`: Throws an error if no words with the given length are found.
     * - `shortest`: Returns any of the shortest words.
     * - `closest`: Returns any of the words closest to the given length.
     * - `longest`: Returns any of the longest words.
     * - `any-length`: Returns a word with any length.
     *
     * Defaults to `'any-length'`.
     *
     * @example
     * faker.word.adjective() // 'pungent'
     * faker.word.adjective(5) // 'slimy'
     * faker.word.adjective(100) // 'complete'
     * faker.word.adjective({ strategy: 'shortest' }) // 'icy'
     * faker.word.adjective({ length: { min: 5, max: 7 }, strategy: "fail" }) // 'distant'
     *
     * @since 6.0.0
     */
    adjective(options?: number | {
        /**
         * The expected length of the word.
         */
        length?: number | {
            /**
             * The minimum length of the word.
             */
            min: number;
            /**
             * The maximum length of the word.
             */
            max: number;
        };
        /**
         * The strategy to apply when no words with a matching length are found.
         *
         * Available error handling strategies:
         *
         * - `fail`: Throws an error if no words with the given length are found.
         * - `shortest`: Returns any of the shortest words.
         * - `closest`: Returns any of the words closest to the given length.
         * - `longest`: Returns any of the longest words.
         * - `any-length`: Returns a word with any length.
         *
         * @default 'any-length'
         */
        strategy?: 'fail' | 'closest' | 'shortest' | 'longest' | 'any-length';
    }): string;
    /**
     * Returns an adverb of random or optionally specified length.
     *
     * @param options The expected length of the word or the options to use.
     * @param options.length The expected length of the word.
     * @param options.strategy The strategy to apply when no words with a matching length are found.
     *
     * Available error handling strategies:
     *
     * - `fail`: Throws an error if no words with the given length are found.
     * - `shortest`: Returns any of the shortest words.
     * - `closest`: Returns any of the words closest to the given length.
     * - `longest`: Returns any of the longest words.
     * - `any-length`: Returns a word with any length.
     *
     * Defaults to `'any-length'`.
     *
     * @example
     * faker.word.adverb() // 'quarrelsomely'
     * faker.word.adverb(5) // 'madly'
     * faker.word.adverb(100) // 'sadly'
     * faker.word.adverb({ strategy: 'shortest' }) // 'too'
     * faker.word.adverb({ length: { min: 5, max: 7 }, strategy: "fail" }) // 'sweetly'
     *
     * @since 6.0.0
     */
    adverb(options?: number | {
        /**
         * The expected length of the word.
         */
        length?: number | {
            /**
             * The minimum length of the word.
             */
            min: number;
            /**
             * The maximum length of the word.
             */
            max: number;
        };
        /**
         * The strategy to apply when no words with a matching length are found.
         *
         * Available error handling strategies:
         *
         * - `fail`: Throws an error if no words with the given length are found.
         * - `shortest`: Returns any of the shortest words.
         * - `closest`: Returns any of the words closest to the given length.
         * - `longest`: Returns any of the longest words.
         * - `any-length`: Returns a word with any length.
         *
         * @default 'any-length'
         */
        strategy?: 'fail' | 'closest' | 'shortest' | 'longest' | 'any-length';
    }): string;
    /**
     * Returns a conjunction of random or optionally specified length.
     *
     * @param options The expected length of the word or the options to use.
     * @param options.length The expected length of the word.
     * @param options.strategy The strategy to apply when no words with a matching length are found.
     *
     * Available error handling strategies:
     *
     * - `fail`: Throws an error if no words with the given length are found.
     * - `shortest`: Returns any of the shortest words.
     * - `closest`: Returns any of the words closest to the given length.
     * - `longest`: Returns any of the longest words.
     * - `any-length`: Returns a word with any length.
     *
     * Defaults to `'any-length'`.
     *
     * @example
     * faker.word.conjunction() // 'in order that'
     * faker.word.conjunction(5) // 'since'
     * faker.word.conjunction(100) // 'as long as'
     * faker.word.conjunction({ strategy: 'shortest' }) // 'or'
     * faker.word.conjunction({ length: { min: 5, max: 7 }, strategy: "fail" }) // 'hence'
     *
     * @since 6.0.0
     */
    conjunction(options?: number | {
        /**
         * The expected length of the word.
         */
        length?: number | {
            /**
             * The minimum length of the word.
             */
            min: number;
            /**
             * The maximum length of the word.
             */
            max: number;
        };
        /**
         * The strategy to apply when no words with a matching length are found.
         *
         * Available error handling strategies:
         *
         * - `fail`: Throws an error if no words with the given length are found.
         * - `shortest`: Returns any of the shortest words.
         * - `closest`: Returns any of the words closest to the given length.
         * - `longest`: Returns any of the longest words.
         * - `any-length`: Returns a word with any length.
         *
         * @default 'any-length'
         */
        strategy?: 'fail' | 'closest' | 'shortest' | 'longest' | 'any-length';
    }): string;
    /**
     * Returns an interjection of random or optionally specified length.
     *
     * @param options The expected length of the word or the options to use.
     * @param options.length The expected length of the word.
     * @param options.strategy The strategy to apply when no words with a matching length are found.
     *
     * Available error handling strategies:
     *
     * - `fail`: Throws an error if no words with the given length are found.
     * - `shortest`: Returns any of the shortest words.
     * - `closest`: Returns any of the words closest to the given length.
     * - `longest`: Returns any of the longest words.
     * - `any-length`: Returns a word with any length.
     *
     * Defaults to `'any-length'`.
     *
     * @example
     * faker.word.interjection() // 'gah'
     * faker.word.interjection(5) // 'fooey'
     * faker.word.interjection(100) // 'yowza'
     * faker.word.interjection({ strategy: 'shortest' }) // 'hm'
     * faker.word.interjection({ length: { min: 5, max: 7 }, strategy: "fail" }) // 'boohoo'
     *
     * @since 6.0.0
     */
    interjection(options?: number | {
        /**
         * The expected length of the word.
         */
        length?: number | {
            /**
             * The minimum length of the word.
             */
            min: number;
            /**
             * The maximum length of the word.
             */
            max: number;
        };
        /**
         * The strategy to apply when no words with a matching length are found.
         *
         * Available error handling strategies:
         *
         * - `fail`: Throws an error if no words with the given length are found.
         * - `shortest`: Returns any of the shortest words.
         * - `closest`: Returns any of the words closest to the given length.
         * - `longest`: Returns any of the longest words.
         * - `any-length`: Returns a word with any length.
         *
         * @default 'any-length'
         */
        strategy?: 'fail' | 'closest' | 'shortest' | 'longest' | 'any-length';
    }): string;
    /**
     * Returns a noun of random or optionally specified length.
     *
     * @param options The expected length of the word or the options to use.
     * @param options.length The expected length of the word.
     * @param options.strategy The strategy to apply when no words with a matching length are found.
     *
     * Available error handling strategies:
     *
     * - `fail`: Throws an error if no words with the given length are found.
     * - `shortest`: Returns any of the shortest words.
     * - `closest`: Returns any of the words closest to the given length.
     * - `longest`: Returns any of the longest words.
     * - `any-length`: Returns a word with any length.
     *
     * Defaults to `'any-length'`.
     *
     * @example
     * faker.word.noun() // 'external'
     * faker.word.noun(5) // 'front'
     * faker.word.noun(100) // 'care'
     * faker.word.noun({ strategy: 'shortest' }) // 'ad'
     * faker.word.noun({ length: { min: 5, max: 7 }, strategy: "fail" }) // 'average'
     *
     * @since 6.0.0
     */
    noun(options?: number | {
        /**
         * The expected length of the word.
         */
        length?: number | {
            /**
             * The minimum length of the word.
             */
            min: number;
            /**
             * The maximum length of the word.
             */
            max: number;
        };
        /**
         * The strategy to apply when no words with a matching length are found.
         *
         * Available error handling strategies:
         *
         * - `fail`: Throws an error if no words with the given length are found.
         * - `shortest`: Returns any of the shortest words.
         * - `closest`: Returns any of the words closest to the given length.
         * - `longest`: Returns any of the longest words.
         * - `any-length`: Returns a word with any length.
         *
         * @default 'any-length'
         */
        strategy?: 'fail' | 'closest' | 'shortest' | 'longest' | 'any-length';
    }): string;
    /**
     * Returns a preposition of random or optionally specified length.
     *
     * @param options The expected length of the word or the options to use.
     * @param options.length The expected length of the word.
     * @param options.strategy The strategy to apply when no words with a matching length are found.
     *
     * Available error handling strategies:
     *
     * - `fail`: Throws an error if no words with the given length are found.
     * - `shortest`: Returns any of the shortest words.
     * - `closest`: Returns any of the words closest to the given length.
     * - `longest`: Returns any of the longest words.
     * - `any-length`: Returns a word with any length.
     *
     * Defaults to `'any-length'`.
     *
     * @example
     * faker.word.preposition() // 'without'
     * faker.word.preposition(5) // 'abaft'
     * faker.word.preposition(100) // 'an'
     * faker.word.preposition({ strategy: 'shortest' }) // 'a'
     * faker.word.preposition({ length: { min: 5, max: 7 }, strategy: "fail" }) // 'given'
     *
     * @since 6.0.0
     */
    preposition(options?: number | {
        /**
         * The expected length of the word.
         */
        length?: number | {
            /**
             * The minimum length of the word.
             */
            min: number;
            /**
             * The maximum length of the word.
             */
            max: number;
        };
        /**
         * The strategy to apply when no words with a matching length are found.
         *
         * Available error handling strategies:
         *
         * - `fail`: Throws an error if no words with the given length are found.
         * - `shortest`: Returns any of the shortest words.
         * - `closest`: Returns any of the words closest to the given length.
         * - `longest`: Returns any of the longest words.
         * - `any-length`: Returns a word with any length.
         *
         * @default 'any-length'
         */
        strategy?: 'fail' | 'closest' | 'shortest' | 'longest' | 'any-length';
    }): string;
    /**
     * Returns a verb of random or optionally specified length.
     *
     * @param options The expected length of the word or the options to use.
     * @param options.length The expected length of the word.
     * @param options.strategy The strategy to apply when no words with a matching length are found.
     *
     * Available error handling strategies:
     *
     * - `fail`: Throws an error if no words with the given length are found.
     * - `shortest`: Returns any of the shortest words.
     * - `closest`: Returns any of the words closest to the given length.
     * - `longest`: Returns any of the longest words.
     * - `any-length`: Returns a word with any length.
     *
     * Defaults to `'any-length'`.
     *
     * @example
     * faker.word.verb() // 'act'
     * faker.word.verb(5) // 'tinge'
     * faker.word.verb(100) // 'mess'
     * faker.word.verb({ strategy: 'shortest' }) // 'do'
     * faker.word.verb({ length: { min: 5, max: 7 }, strategy: "fail" }) // 'vault'
     *
     * @since 6.0.0
     */
    verb(options?: number | {
        /**
         * The expected length of the word.
         */
        length?: number | {
            /**
             * The minimum length of the word.
             */
            min: number;
            /**
             * The maximum length of the word.
             */
            max: number;
        };
        /**
         * The strategy to apply when no words with a matching length are found.
         *
         * Available error handling strategies:
         *
         * - `fail`: Throws an error if no words with the given length are found.
         * - `shortest`: Returns any of the shortest words.
         * - `closest`: Returns any of the words closest to the given length.
         * - `longest`: Returns any of the longest words.
         * - `any-length`: Returns a word with any length.
         *
         * @default 'any-length'
         */
        strategy?: 'fail' | 'closest' | 'shortest' | 'longest' | 'any-length';
    }): string;
    /**
     * Returns a random sample of random or optionally specified length.
     *
     * @param options The expected length of the word or the options to use.
     * @param options.length The expected length of the word.
     * @param options.strategy The strategy to apply when no words with a matching length are found.
     *
     * Available error handling strategies:
     *
     * - `fail`: Throws an error if no words with the given length are found.
     * - `shortest`: Returns any of the shortest words.
     * - `closest`: Returns any of the words closest to the given length.
     * - `longest`: Returns any of the longest words.
     * - `any-length`: Returns a word with any length.
     *
     * Defaults to `'any-length'`.
     *
     * @example
     * faker.word.sample() // 'incidentally'
     * faker.word.sample(5) // 'fruit'
     *
     * @since 8.0.0
     */
    sample(options?: number | {
        /**
         * The expected length of the word.
         */
        length?: number | {
            /**
             * The minimum length of the word.
             */
            min: number;
            /**
             * The maximum length of the word.
             */
            max: number;
        };
        /**
         * The strategy to apply when no words with a matching length are found.
         *
         * Available error handling strategies:
         *
         * - `fail`: Throws an error if no words with the given length are found.
         * - `shortest`: Returns any of the shortest words.
         * - `closest`: Returns any of the words closest to the given length.
         * - `longest`: Returns any of the longest words.
         * - `any-length`: Returns a word with any length.
         *
         * @default 'any-length'
         */
        strategy?: 'fail' | 'closest' | 'shortest' | 'longest' | 'any-length';
    }): string;
    /**
     * Returns a string containing a number of space separated random words.
     *
     * @param options The optional options object or the number of words to return.
     * @param options.count The number of words to return. Defaults to a random value between `1` and `3`.
     *
     * @example
     * faker.word.words() // 'almost'
     * faker.word.words(5) // 'before hourly patiently dribble equal'
     * faker.word.words({ count: 5 }) // 'whoever edible um kissingly faraway'
     * faker.word.words({ count: { min: 5, max: 10 } }) // 'vice buoyant through apropos poised total wary boohoo'
     *
     * @since 8.0.0
     */
    words(options?: number | {
        /**
         * The number of words to return.
         *
         * @default { min: 1, max: 3 }
         */
        count?: number | {
            /**
             * The minimum number of words to return.
             */
            min: number;
            /**
             * The maximum number of words to return.
             */
            max: number;
        };
    }): string;
}
