import { ModuleBase } from '../../internal/module-base';
import type { LiteralUnion } from '../../utils/types';
import type { AlphaChar, AlphaNumericChar, Casing, NumericChar } from '../string';
/**
 * Generates random values of different kinds.
 *
 * @deprecated Use the modules specific to the type of data you want to generate instead.
 */
export declare class RandomModule extends ModuleBase {
    /**
     * Returns a random word.
     *
     * @see faker.lorem.word(): For generating a random placeholder word.
     * @see faker.word.sample(): For generating a random real word.
     *
     * @example
     * faker.random.word() // 'Seamless'
     *
     * @since 3.1.0
     *
     * @deprecated Use `faker.lorem.word()` or `faker.word.sample()` instead.
     */
    word(): string;
    /**
     * Returns a string with a given number of random words.
     *
     * @param count The number or range of words. Defaults to a random value between `1` and `3`.
     * @param count.min The minimum number of words. Defaults to `1`.
     * @param count.max The maximum number of words. Defaults to `3`.
     *
     * @see faker.lorem.words(): For generating a sequence of random placeholder words.
     * @see faker.word.words(): For generating a sequence of random real words.
     *
     * @example
     * faker.random.words() // 'neural'
     * faker.random.words(5) // 'copy Handcrafted bus client-server Point'
     * faker.random.words({ min: 3, max: 5 }) // 'cool sticky Borders'
     *
     * @since 3.1.0
     *
     * @deprecated Use `faker.lorem.words()` or `faker.word.words()` instead.
     */
    words(count?: number | {
        /**
         * The minimum number of words.
         */
        min: number;
        /**
         * The maximum number of words.
         */
        max: number;
    }): string;
    /**
     * Do NOT use. This property has been removed.
     *
     * @example
     * faker.helpers.objectKey(allLocales)
     * faker.helpers.objectValue(allFakers)
     *
     * @since 3.1.0
     *
     * @deprecated Use `faker.helpers.objectKey(allLocales/allFakers)` instead.
     */
    private locale;
    /**
     * Generating a string consisting of letters in the English alphabet.
     *
     * @param options Either the number of characters or an options instance.
     * @param options.count The number of characters to generate. Defaults to `1`.
     * @param options.casing The casing of the characters. Defaults to `'mixed'`.
     * @param options.bannedChars An array with characters to exclude. Defaults to `[]`.
     *
     * @see faker.string.alpha(): For the replacement method.
     *
     * @example
     * faker.random.alpha() // 'b'
     * faker.random.alpha(10) // 'qccrabobaf'
     * faker.random.alpha({ count: 5, casing: 'upper', bannedChars: ['A'] }) // 'DTCIC'
     *
     * @since 5.0.0
     *
     * @deprecated Use `faker.string.alpha()` instead.
     */
    alpha(options?: number | {
        /**
         * The number of characters to generate.
         *
         * @default 1
         */
        count?: number;
        /**
         * The casing of the characters.
         *
         * @default 'mixed'
         */
        casing?: Casing;
        /**
         * An array with characters to exclude.
         *
         * @default []
         */
        bannedChars?: ReadonlyArray<LiteralUnion<AlphaChar>> | string;
    }): string;
    /**
     * Generating a string consisting of alpha characters and digits.
     *
     * @param count The number of characters and digits to generate. Defaults to `1`.
     * @param options The options to use.
     * @param options.casing The casing of the characters. Defaults to `'lower'`.
     * @param options.bannedChars An array of characters and digits which should be banned in the generated string. Defaults to `[]`.
     *
     * @see faker.string.alphanumeric(): For the replacement method.
     *
     * @example
     * faker.random.alphaNumeric() // '2'
     * faker.random.alphaNumeric(5) // '3e5v7'
     * faker.random.alphaNumeric(5, { bannedChars: ["a"] }) // 'xszlm'
     *
     * @since 3.1.0
     *
     * @deprecated Use `faker.string.alphanumeric()` instead.
     */
    alphaNumeric(count?: number, options?: {
        /**
         * The casing of the characters.
         *
         * @default 'lower'
         */
        casing?: Casing;
        /**
         * An array of characters and digits which should be banned in the generated string.
         *
         * @default []
         */
        bannedChars?: ReadonlyArray<LiteralUnion<AlphaNumericChar>> | string;
    }): string;
    /**
     * Generates a given length string of digits.
     *
     * @param length The number of digits to generate. Defaults to `1`.
     * @param options The options to use.
     * @param options.allowLeadingZeros Whether leading zeros are allowed or not. Defaults to `true`.
     * @param options.bannedDigits An array of digits which should be banned in the generated string. Defaults to `[]`.
     *
     * @see faker.string.numeric(): For the replacement method.
     *
     * @example
     * faker.random.numeric() // '2'
     * faker.random.numeric(5) // '31507'
     * faker.random.numeric(42) // '00434563150765416546479875435481513188548'
     * faker.random.numeric(42, { allowLeadingZeros: true }) // '00564846278453876543517840713421451546115'
     * faker.random.numeric(6, { bannedDigits: ['0'] }) // '943228'
     *
     * @since 6.3.0
     *
     * @deprecated Use `faker.string.numeric()` instead.
     */
    numeric(length?: number, options?: {
        /**
         * Whether leading zeros are allowed or not.
         *
         * @default true
         */
        allowLeadingZeros?: boolean;
        /**
         * An array of digits which should be banned in the generated string.
         *
         * @default []
         */
        bannedDigits?: ReadonlyArray<LiteralUnion<NumericChar>> | string;
    }): string;
}
