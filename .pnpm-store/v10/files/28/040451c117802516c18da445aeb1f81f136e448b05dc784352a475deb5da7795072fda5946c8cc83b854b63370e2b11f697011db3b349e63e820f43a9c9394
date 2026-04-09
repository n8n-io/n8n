import type { Faker } from '../..';
import type { LiteralUnion } from '../../utils/types';
export declare type Casing = 'upper' | 'lower' | 'mixed';
export declare type LowerAlphaChar = 'a' | 'b' | 'c' | 'd' | 'e' | 'f' | 'g' | 'h' | 'i' | 'j' | 'k' | 'l' | 'm' | 'n' | 'o' | 'p' | 'q' | 'r' | 's' | 't' | 'u' | 'v' | 'w' | 'x' | 'y' | 'z';
export declare type UpperAlphaChar = 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G' | 'H' | 'I' | 'J' | 'K' | 'L' | 'M' | 'N' | 'O' | 'P' | 'Q' | 'R' | 'S' | 'T' | 'U' | 'V' | 'W' | 'X' | 'Y' | 'Z';
export declare type NumericChar = '0' | '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9';
export declare type AlphaChar = LowerAlphaChar | UpperAlphaChar;
export declare type AlphaNumericChar = AlphaChar | NumericChar;
/**
 * Generates random values of different kinds.
 */
export declare class RandomModule {
    private readonly faker;
    constructor(faker: Faker);
    /**
     * Returns random word.
     *
     * @example
     * faker.random.word() // 'Seamless'
     *
     * @since 3.1.0
     */
    word(): string;
    /**
     * Returns string with set of random words.
     *
     * @param count Number of words. Defaults to a random value between `1` and `3`.
     *
     * @example
     * faker.random.words() // 'neural'
     * faker.random.words(5) // 'copy Handcrafted bus client-server Point'
     *
     * @since 3.1.0
     */
    words(count?: number): string;
    /**
     * Returns a random locale, that is available in this faker instance.
     * You can use the returned locale with `faker.setLocale(result)`.
     *
     * @example
     * faker.random.locale() // 'el'
     *
     * @since 3.1.0
     */
    locale(): string;
    /**
     * Generating a string consisting of letters in the English alphabet.
     *
     * @param options Either the number of characters or an options instance. Defaults to `{ count: 1, casing: 'lower', bannedChars: [] }`.
     * @param options.count The number of characters to generate. Defaults to `1`.
     * @param options.casing The casing of the characters. Defaults to `'lower'`.
     * @param options.upcase Deprecated, use `casing: 'upper'` instead.
     * @param options.bannedChars An array with characters to exclude. Defaults to `[]`.
     *
     * @example
     * faker.random.alpha() // 'b'
     * faker.random.alpha(10) // 'qccrabobaf'
     * faker.random.alpha({ count: 5, casing: 'upper', bannedChars: ['A'] }) // 'DTCIC'
     *
     * @since 5.0.0
     */
    alpha(options?: number | {
        count?: number;
        /**
         * @deprecated Use `casing` instead.
         */
        upcase?: boolean;
        casing?: Casing;
        bannedChars?: readonly LiteralUnion<AlphaChar>[] | string;
    }): string;
    /**
     * Generating a string consisting of alpha characters and digits.
     *
     * @param count The number of characters and digits to generate. Defaults to `1`.
     * @param options The options to use. Defaults to `{ bannedChars: [] }`.
     * @param options.casing The casing of the characters. Defaults to `'lower'`.
     * @param options.bannedChars An array of characters and digits which should be banned in the generated string. Defaults to `[]`.
     *
     * @example
     * faker.random.alphaNumeric() // '2'
     * faker.random.alphaNumeric(5) // '3e5v7'
     * faker.random.alphaNumeric(5, { bannedChars: ["a"] }) // 'xszlm'
     *
     * @since 3.1.0
     */
    alphaNumeric(count?: number, options?: {
        casing?: Casing;
        bannedChars?: readonly LiteralUnion<AlphaNumericChar>[] | string;
    }): string;
    /**
     * Generates a given length string of digits.
     *
     * @param length The number of digits to generate. Defaults to `1`.
     * @param options The options to use. Defaults to `{}`.
     * @param options.allowLeadingZeros If true, leading zeros will be allowed. Defaults to `false`.
     * @param options.bannedDigits An array of digits which should be banned in the generated string. Defaults to `[]`.
     *
     * @example
     * faker.random.numeric() // '2'
     * faker.random.numeric(5) // '31507'
     * faker.random.numeric(42) // '56434563150765416546479875435481513188548'
     * faker.random.numeric(42, { allowLeadingZeros: true }) // '00564846278453876543517840713421451546115'
     * faker.random.numeric(6, { bannedDigits: ['0'] }) // '943228'
     *
     * @since 6.3.0
     */
    numeric(length?: number, options?: {
        allowLeadingZeros?: boolean;
        bannedDigits?: readonly LiteralUnion<NumericChar>[] | string;
    }): string;
}
