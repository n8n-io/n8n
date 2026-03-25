import { SimpleModuleBase } from '../../internal/module-base';
import type { LiteralUnion } from '../../utils/types';
export type Casing = 'upper' | 'lower' | 'mixed';
export type LowerAlphaChar = 'a' | 'b' | 'c' | 'd' | 'e' | 'f' | 'g' | 'h' | 'i' | 'j' | 'k' | 'l' | 'm' | 'n' | 'o' | 'p' | 'q' | 'r' | 's' | 't' | 'u' | 'v' | 'w' | 'x' | 'y' | 'z';
export type UpperAlphaChar = 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G' | 'H' | 'I' | 'J' | 'K' | 'L' | 'M' | 'N' | 'O' | 'P' | 'Q' | 'R' | 'S' | 'T' | 'U' | 'V' | 'W' | 'X' | 'Y' | 'Z';
export type NumericChar = '0' | '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9';
export type AlphaChar = LowerAlphaChar | UpperAlphaChar;
export type AlphaNumericChar = AlphaChar | NumericChar;
/**
 * Module to generate string related entries.
 *
 * ### Overview
 *
 * For a string containing just A-Z characters, use [`alpha()`](https://fakerjs.dev/api/string.html#alpha). To add digits too, use [`alphanumeric()`](https://fakerjs.dev/api/string.html#alphanumeric). If you only want punctuation marks/symbols, use [`symbol()`](https://fakerjs.dev/api/string.html). For a full set of ASCII characters, use [`sample()`](https://fakerjs.dev/api/string.html#sample). For a custom set of characters, use [`fromCharacters()`](https://fakerjs.dev/api/string.html#fromcharacters).
 *
 * For strings of base-ten digits, use [`numeric()`](https://fakerjs.dev/api/string.html#numeric). For other bases, use [`binary()`](https://fakerjs.dev/api/string.html#binary), [`octal()`](https://fakerjs.dev/api/string.html#octal), or [`hexadecimal()`](https://fakerjs.dev/api/string.html#hexadecimal)).
 *
 * You can generate standard ID strings using [`uuid()`](https://fakerjs.dev/api/string.html#uuid) or [`nanoid()`](https://fakerjs.dev/api/string.html#nanoid).
 *
 * ### Related modules
 *
 * - Emoji can be found at [`faker.internet.emoji()`](https://fakerjs.dev/api/internet.html#emoji).
 * - The [`faker.helpers`](https://fakerjs.dev/api/helpers.html) module includes a number of string related methods.
 */
export declare class StringModule extends SimpleModuleBase {
    /**
     * Generates a string from the given characters.
     *
     * @param characters The characters to use for the string. Can be a string or an array of characters.
     * If it is an array, then each element is treated as a single character even if it is a string with multiple characters.
     * @param length The length of the string to generate. Defaults to `1`.
     * @param length.min The minimum length of the string to generate.
     * @param length.max The maximum length of the string to generate.
     *
     * @example
     * faker.string.fromCharacters('abc') // 'c'
     * faker.string.fromCharacters(['a', 'b', 'c']) // 'a'
     * faker.string.fromCharacters('abc', 10) // 'cbbbacbacb'
     * faker.string.fromCharacters('abc', { min: 5, max: 10 }) // 'abcaaaba'
     *
     * @since 8.0.0
     */
    fromCharacters(characters: string | ReadonlyArray<string>, length?: number | {
        /**
         * The minimum length of the string to generate.
         */
        min: number;
        /**
         * The maximum length of the string to generate.
         */
        max: number;
    }): string;
    /**
     * Generating a string consisting of letters in the English alphabet.
     *
     * @param options Either the number of characters or an options instance.
     * @param options.length The number or range of characters to generate. Defaults to `1`.
     * @param options.casing The casing of the characters. Defaults to `'mixed'`.
     * @param options.exclude An array with characters which should be excluded in the generated string. Defaults to `[]`.
     *
     * @example
     * faker.string.alpha() // 'b'
     * faker.string.alpha(10) // 'fEcAaCVbaR'
     * faker.string.alpha({ length: { min: 5, max: 10 } }) // 'HcVrCf'
     * faker.string.alpha({ casing: 'lower' }) // 'r'
     * faker.string.alpha({ exclude: ['W'] }) // 'Z'
     * faker.string.alpha({ length: 5, casing: 'upper', exclude: ['A'] }) // 'DTCIC'
     *
     * @since 8.0.0
     */
    alpha(options?: number | {
        /**
         * The number or range of characters to generate.
         *
         * @default 1
         */
        length?: number | {
            /**
             * The minimum number of characters to generate.
             */
            min: number;
            /**
             * The maximum number of characters to generate.
             */
            max: number;
        };
        /**
         * The casing of the characters.
         *
         * @default 'mixed'
         */
        casing?: Casing;
        /**
         * An array with characters which should be excluded in the generated string.
         *
         * @default []
         */
        exclude?: ReadonlyArray<LiteralUnion<AlphaChar>> | string;
    }): string;
    /**
     * Generating a string consisting of alpha characters and digits.
     *
     * @param options Either the number of characters or an options instance.
     * @param options.length The number or range of characters and digits to generate. Defaults to `1`.
     * @param options.casing The casing of the characters. Defaults to `'mixed'`.
     * @param options.exclude An array of characters and digits which should be excluded in the generated string. Defaults to `[]`.
     *
     * @example
     * faker.string.alphanumeric() // '2'
     * faker.string.alphanumeric(5) // '3e5V7'
     * faker.string.alphanumeric({ length: { min: 5, max: 10 } }) // 'muaApG'
     * faker.string.alphanumeric({ casing: 'upper' }) // 'A'
     * faker.string.alphanumeric({ exclude: ['W'] }) // 'r'
     * faker.string.alphanumeric({ length: 5, exclude: ["a"] }) // 'x1Z7f'
     *
     * @since 8.0.0
     */
    alphanumeric(options?: number | {
        /**
         * The number or range of characters and digits to generate.
         *
         * @default 1
         */
        length?: number | {
            /**
             * The minimum number of characters and digits to generate.
             */
            min: number;
            /**
             * The maximum number of characters and digits to generate.
             */
            max: number;
        };
        /**
         * The casing of the characters.
         *
         * @default 'mixed'
         */
        casing?: Casing;
        /**
         * An array of characters and digits which should be excluded in the generated string.
         *
         * @default []
         */
        exclude?: ReadonlyArray<LiteralUnion<AlphaNumericChar>> | string;
    }): string;
    /**
     * Returns a [binary](https://en.wikipedia.org/wiki/Binary_number) string.
     *
     * @param options The optional options object.
     * @param options.length The number or range of characters to generate after the prefix. Defaults to `1`.
     * @param options.prefix Prefix for the generated number. Defaults to `'0b'`.
     *
     * @see faker.number.binary(): For generating a binary number (within a range).
     *
     * @example
     * faker.string.binary() // '0b1'
     * faker.string.binary({ length: 10 }) // '0b1101011011'
     * faker.string.binary({ length: { min: 5, max: 10 } }) // '0b11101011'
     * faker.string.binary({ prefix: '0b' }) // '0b1'
     * faker.string.binary({ length: 10, prefix: 'bin_' }) // 'bin_1101011011'
     *
     * @since 8.0.0
     */
    binary(options?: {
        /**
         * The number or range of characters to generate after the prefix.
         *
         * @default 1
         */
        length?: number | {
            /**
             * The minimum number of characters to generate.
             */
            min: number;
            /**
             * The maximum number of characters to generate.
             */
            max: number;
        };
        /**
         * Prefix for the generated number.
         *
         * @default '0b'
         */
        prefix?: string;
    }): string;
    /**
     * Returns an [octal](https://en.wikipedia.org/wiki/Octal) string.
     *
     * @param options The optional options object.
     * @param options.length The number or range of characters to generate after the prefix. Defaults to `1`.
     * @param options.prefix Prefix for the generated number. Defaults to `'0o'`.
     *
     * @see faker.number.octal(): For generating an octal number (within a range).
     *
     * @example
     * faker.string.octal() // '0o3'
     * faker.string.octal({ length: 10 }) // '0o1526216210'
     * faker.string.octal({ length: { min: 5, max: 10 } }) // '0o15263214'
     * faker.string.octal({ prefix: '0o' }) // '0o7'
     * faker.string.octal({ length: 10, prefix: 'oct_' }) // 'oct_1542153414'
     *
     * @since 8.0.0
     */
    octal(options?: {
        /**
         * The number or range of characters to generate after the prefix.
         *
         * @default 1
         */
        length?: number | {
            /**
             * The minimum number of characters to generate.
             */
            min: number;
            /**
             * The maximum number of characters to generate.
             */
            max: number;
        };
        /**
         * Prefix for the generated number.
         *
         * @default '0o'
         */
        prefix?: string;
    }): string;
    /**
     * Returns a [hexadecimal](https://en.wikipedia.org/wiki/Hexadecimal) string.
     *
     * @param options The optional options object.
     * @param options.length The number or range of characters to generate after the prefix. Defaults to `1`.
     * @param options.casing Casing of the generated number. Defaults to `'mixed'`.
     * @param options.prefix Prefix for the generated number. Defaults to `'0x'`.
     *
     * @example
     * faker.string.hexadecimal() // '0xB'
     * faker.string.hexadecimal({ length: 10 }) // '0xaE13d044cB'
     * faker.string.hexadecimal({ length: { min: 5, max: 10 } }) // '0x7dEf7FCD'
     * faker.string.hexadecimal({ prefix: '0x' }) // '0xE'
     * faker.string.hexadecimal({ casing: 'lower' }) // '0xf'
     * faker.string.hexadecimal({ length: 10, prefix: '#' }) // '#f12a974eB1'
     * faker.string.hexadecimal({ length: 10, casing: 'upper' }) // '0xE3F38014FB'
     * faker.string.hexadecimal({ casing: 'lower', prefix: '' }) // 'd'
     * faker.string.hexadecimal({ length: 10, casing: 'mixed', prefix: '0x' }) // '0xAdE330a4D1'
     *
     * @since 8.0.0
     */
    hexadecimal(options?: {
        /**
         * The number or range of characters to generate after the prefix.
         *
         * @default 1
         */
        length?: number | {
            /**
             * The minimum number of characters to generate after the prefix.
             */
            min: number;
            /**
             * The maximum number of characters to generate after the prefix.
             */
            max: number;
        };
        /**
         * Casing of the generated number.
         *
         * @default 'mixed'
         */
        casing?: Casing;
        /**
         * Prefix for the generated number.
         *
         * @default '0x'
         */
        prefix?: string;
    }): string;
    /**
     * Generates a given length string of digits.
     *
     * @param options Either the number of characters or the options to use.
     * @param options.length The number or range of digits to generate. Defaults to `1`.
     * @param options.allowLeadingZeros Whether leading zeros are allowed or not. Defaults to `true`.
     * @param options.exclude An array of digits which should be excluded in the generated string. Defaults to `[]`.
     *
     * @see faker.number.int(): For generating a number (within a range).
     *
     * @example
     * faker.string.numeric() // '2'
     * faker.string.numeric(5) // '31507'
     * faker.string.numeric(42) // '06434563150765416546479875435481513188548'
     * faker.string.numeric({ length: { min: 5, max: 10 } }) // '197089478'
     * faker.string.numeric({ length: 42, allowLeadingZeros: false }) // '72564846278453876543517840713421451546115'
     * faker.string.numeric({ length: 6, exclude: ['0'] }) // '943228'
     *
     * @since 8.0.0
     */
    numeric(options?: number | {
        /**
         * The number or range of digits to generate.
         *
         * @default 1
         */
        length?: number | {
            /**
             * The minimum number of digits to generate.
             */
            min: number;
            /**
             * The maximum number of digits to generate.
             */
            max: number;
        };
        /**
         * Whether leading zeros are allowed or not.
         *
         * @default true
         */
        allowLeadingZeros?: boolean;
        /**
         * An array of digits which should be excluded in the generated string.
         *
         * @default []
         */
        exclude?: ReadonlyArray<LiteralUnion<NumericChar>> | string;
    }): string;
    /**
     * Returns a string containing UTF-16 chars between 33 and 125 (`!` to `}`).
     *
     * @param length Length of the generated string. Defaults to `10`.
     * @param length.min The minimum number of characters to generate.
     * @param length.max The maximum number of characters to generate.
     *
     * @example
     * faker.string.sample() // 'Zo!.:*e>wR'
     * faker.string.sample(5) // '6Bye8'
     * faker.string.sample({ min: 5, max: 10 }) // 'FeKunG'
     *
     * @since 8.0.0
     */
    sample(length?: number | {
        /**
         * The minimum number of characters to generate.
         */
        min: number;
        /**
         * The maximum number of characters to generate.
         */
        max: number;
    }): string;
    /**
     * Returns a UUID v4 ([Universally Unique Identifier](https://en.wikipedia.org/wiki/Universally_unique_identifier)).
     *
     * @example
     * faker.string.uuid() // '4136cd0b-d90b-4af7-b485-5d1ded8db252'
     *
     * @since 8.0.0
     */
    uuid(): string;
    /**
     * Generates a [Nano ID](https://github.com/ai/nanoid).
     *
     * @param length Length of the generated string. Defaults to `21`.
     * @param length.min The minimum length of the Nano ID to generate.
     * @param length.max The maximum length of the Nano ID to generate.
     *
     * @example
     * faker.string.nanoid() // ptL0KpX_yRMI98JFr6B3n
     * faker.string.nanoid(10) // VsvwSdm_Am
     * faker.string.nanoid({ min: 13, max: 37 }) // KIRsdEL9jxVgqhBDlm
     *
     * @since 8.0.0
     */
    nanoid(length?: number | {
        /**
         * The minimum length of the Nano ID to generate.
         */
        min: number;
        /**
         * The maximum length of the Nano ID to generate.
         */
        max: number;
    }): string;
    /**
     * Returns a string containing only special characters from the following list:
     * ```txt
     * ! " # $ % & ' ( ) * + , - . / : ; < = > ? @ [ \ ] ^ _ ` { | } ~
     * ```
     *
     * @param length Length of the generated string. Defaults to `1`.
     * @param length.min The minimum number of special characters to generate.
     * @param length.max The maximum number of special characters to generate.
     *
     * @example
     * faker.string.symbol() // '$'
     * faker.string.symbol(5) // '#*!.~'
     * faker.string.symbol({ min: 5, max: 10 }) // ')|@*>^+'
     *
     * @since 8.0.0
     */
    symbol(length?: number | {
        /**
         * The minimum number of special characters to generate.
         */
        min: number;
        /**
         * The maximum number of special characters to generate.
         */
        max: number;
    }): string;
}
