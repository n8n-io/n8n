import type { Faker } from '../..';
/**
 * Module to return various types of words.
 */
export declare class WordModule {
    private readonly faker;
    constructor(faker: Faker);
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
        length?: number | {
            min: number;
            max: number;
        };
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
        length?: number | {
            min: number;
            max: number;
        };
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
        length?: number | {
            min: number;
            max: number;
        };
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
        length?: number | {
            min: number;
            max: number;
        };
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
        length?: number | {
            min: number;
            max: number;
        };
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
        length?: number | {
            min: number;
            max: number;
        };
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
        length?: number | {
            min: number;
            max: number;
        };
        strategy?: 'fail' | 'closest' | 'shortest' | 'longest' | 'any-length';
    }): string;
}
