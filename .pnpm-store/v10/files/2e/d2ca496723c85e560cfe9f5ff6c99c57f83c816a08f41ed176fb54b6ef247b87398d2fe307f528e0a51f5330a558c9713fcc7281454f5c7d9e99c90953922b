import { SimpleModuleBase } from '../../internal/module-base';
/**
 * Module to generate various primitive values and data types.
 *
 * ### Overview
 *
 * Most of the methods in this module are deprecated and have been moved to other modules like [`faker.number`](https://fakerjs.dev/api/number.html) and [`faker.string`](https://fakerjs.dev/api/string.html), see individual entries for replacements.
 *
 * For a simple random true or false value, use [`boolean()`](https://fakerjs.dev/api/datatype.html#boolean).
 */
export declare class DatatypeModule extends SimpleModuleBase {
    /**
     * Returns a single random number between zero and the given max value or the given range with the specified precision.
     * The bounds are inclusive.
     *
     * @param options Maximum value or options object. Defaults to `99999`.
     * @param options.min Lower bound for generated number. Defaults to `0`.
     * @param options.max Upper bound for generated number. Defaults to `min + 99999`.
     * @param options.precision Precision of the generated number. Defaults to `1`.
     *
     * @throws When `min` is greater than `max`.
     * @throws When `precision` is negative.
     *
     * @see faker.number.int(): For generating a random integer.
     * @see faker.number.float(): For generating a random floating-point number.
     *
     * @example
     * faker.datatype.number() // 55422
     * faker.datatype.number(100) // 52
     * faker.datatype.number({ min: 1000000 }) // 1031433
     * faker.datatype.number({ max: 100 }) // 42
     * faker.datatype.number({ precision: 0.01 }) // 64246.18
     * faker.datatype.number({ min: 10, max: 100, precision: 0.01 }) // 36.94
     *
     * @since 5.5.0
     *
     * @deprecated Use `faker.number.int()` or `faker.number.float()` instead.
     */
    number(options?: number | {
        /**
         * Lower bound for generated number.
         *
         * @default 0
         */
        min?: number;
        /**
         * Upper bound for generated number.
         *
         * @default min + 99999
         */
        max?: number;
        /**
         * Precision of the generated number.
         *
         * @default 1
         */
        precision?: number;
    }): number;
    /**
     * Returns a single random floating-point number for the given precision or range and precision.
     *
     * @param options Precision or options object.
     * @param options.min Lower bound for generated number. Defaults to `0`.
     * @param options.max Upper bound for generated number. Defaults to `min + 99999`.
     * @param options.precision Precision of the generated number. Defaults to `0.01`.
     *
     * @throws When `min` is greater than `max`.
     * @throws When `precision` is negative.
     *
     * @see faker.number.float(): For the replacement method.
     *
     * @example
     * faker.datatype.float() // 51696.36
     * faker.datatype.float(0.1) // 52023.2
     * faker.datatype.float({ min: 1000000 }) // 212859.76
     * faker.datatype.float({ max: 100 }) // 28.11
     * faker.datatype.float({ precision: 0.1 }) // 84055.3
     * faker.datatype.float({ min: 10, max: 100, precision: 0.001 }) // 57.315
     *
     * @since 5.5.0
     *
     * @deprecated Use `faker.number.float()` instead.
     */
    float(options?: number | {
        /**
         * Lower bound for generated number.
         *
         * @default 0
         */
        min?: number;
        /**
         * Upper bound for generated number.
         *
         * @default min + 99999
         */
        max?: number;
        /**
         * Precision of the generated number.
         *
         * @default 0.01
         */
        precision?: number;
    }): number;
    /**
     * Returns a Date object using a random number of milliseconds since
     * the [Unix Epoch](https://en.wikipedia.org/wiki/Unix_time) (1 January 1970 UTC).
     *
     * @param options Max number of milliseconds since unix epoch or options object.
     * @param options.min Lower bound for milliseconds since base date.
     *    When not provided or smaller than `-8640000000000000`, `1990-01-01` is considered
     *    as minimum generated date. Defaults to `631152000000`.
     * @param options.max Upper bound for milliseconds since base date.
     *    When not provided or larger than `8640000000000000`, `2100-01-01` is considered
     *    as maximum generated date. Defaults to `4102444800000`.
     *
     * @see faker.date.anytime(): For generating a random date in either the past or future.
     * @see faker.date.between(): For generating a random date in between two dates.
     *
     * @example
     * faker.datatype.datetime() // '2089-04-17T18:03:24.956Z'
     * faker.datatype.datetime(1893456000000) // '2022-03-28T07:00:56.876Z'
     * faker.datatype.datetime({ min: 1577836800000, max: 1893456000000 }) // '2021-09-12T07:13:00.255Z'
     *
     * @since 5.5.0
     *
     * @deprecated Use `faker.date.between({ from: min, to: max })` or `faker.date.anytime()` instead.
     */
    datetime(options?: number | {
        /**
         * Lower bound for milliseconds since base date.
         *
         * When not provided or smaller than `-8640000000000000`, `1990-01-01` is considered as minimum generated date.
         *
         * @default 631152000000
         */
        min?: number;
        /**
         * Upper bound for milliseconds since base date.
         *
         * When not provided or larger than `8640000000000000`, `2100-01-01` is considered as maximum generated date.
         *
         * @default 4102444800000
         */
        max?: number;
    }): Date;
    /**
     * Returns a string containing UTF-16 chars between 33 and 125 (`!` to `}`).
     *
     * @param options Length of the generated string or an options object.
     * @param options.length Length of the generated string. Max length is `2^20`. Defaults to `10`.
     *
     * @see faker.string.sample(): For the replacement method.
     *
     * @example
     * faker.datatype.string() // 'Zo!.:*e>wR'
     * faker.datatype.string(5) // '6Bye8'
     * faker.datatype.string({ length: 7 }) // 'dzOT00e'
     *
     * @since 5.5.0
     *
     * @deprecated Use `faker.string.sample()` instead.
     */
    string(options?: number | {
        /**
         * Length of the generated string. Max length is `2^20`.
         *
         * @default 10
         */
        length?: number;
    }): string;
    /**
     * Returns a UUID v4 ([Universally Unique Identifier](https://en.wikipedia.org/wiki/Universally_unique_identifier)).
     *
     * @see faker.string.uuid(): For the replacement method.
     *
     * @example
     * faker.datatype.uuid() // '4136cd0b-d90b-4af7-b485-5d1ded8db252'
     *
     * @since 5.5.0
     *
     * @deprecated Use `faker.string.uuid()` instead.
     */
    uuid(): string;
    /**
     * Returns the boolean value true or false.
     *
     * **Note:**
     * A probability of `0.75` results in `true` being returned `75%` of the calls; likewise `0.3` => `30%`.
     * If the probability is `<= 0.0`, it will always return `false`.
     * If the probability is `>= 1.0`, it will always return `true`.
     * The probability is limited to two decimal places.
     *
     * @param options The optional options object or the probability (`[0.00, 1.00]`) of returning `true`.
     * @param options.probability The probability (`[0.00, 1.00]`) of returning `true`. Defaults to `0.5`.
     *
     * @example
     * faker.datatype.boolean() // false
     * faker.datatype.boolean(0.9) // true
     * faker.datatype.boolean({ probability: 0.1 }) // false
     *
     * @since 5.5.0
     */
    boolean(options?: number | {
        /**
         * The probability (`[0.00, 1.00]`) of returning `true`.
         *
         * @default 0.5
         */
        probability?: number;
    }): boolean;
    /**
     * Returns a [hexadecimal](https://en.wikipedia.org/wiki/Hexadecimal) number.
     *
     * @param options The optional options object.
     * @param options.length Length of the generated number. Defaults to `1`.
     * @param options.prefix Prefix for the generated number. Defaults to `'0x'`.
     * @param options.case Case of the generated number. Defaults to `'mixed'`.
     *
     * @see faker.string.hexadecimal(): For generating a random hexadecimal string.
     * @see faker.number.hex(): For generating a random hexadecimal number.
     *
     * @example
     * faker.datatype.hexadecimal() // '0xB'
     * faker.datatype.hexadecimal({ length: 10 }) // '0xaE13d044cB'
     * faker.datatype.hexadecimal({ prefix: '0x' }) // '0xE'
     * faker.datatype.hexadecimal({ case: 'lower' }) // '0xf'
     * faker.datatype.hexadecimal({ length: 10, prefix: '#' }) // '#f12a974eB1'
     * faker.datatype.hexadecimal({ length: 10, case: 'upper' }) // '0xE3F38014FB'
     * faker.datatype.hexadecimal({ prefix: '', case: 'lower' }) // 'd'
     * faker.datatype.hexadecimal({ length: 10, prefix: '0x', case: 'mixed' }) // '0xAdE330a4D1'
     *
     * @since 6.1.2
     *
     * @deprecated Use `faker.string.hexadecimal()` or `faker.number.hex()` instead.
     */
    hexadecimal(options?: {
        /**
         * Length of the generated number.
         *
         * @default 1
         */
        length?: number;
        /**
         * Prefix for the generated number.
         *
         * @default '0x'
         */
        prefix?: string;
        /**
         * Case of the generated number.
         *
         * @default 'mixed'
         */
        case?: 'lower' | 'upper' | 'mixed';
    }): string;
    /**
     * Returns a string representing JSON object with 7 pre-defined properties.
     *
     * @example
     * faker.datatype.json() // `{"foo":"mxz.v8ISij","bar":29154,"bike":8658,"a":"GxTlw$nuC:","b":40693,"name":"%'<FTou{7X","prop":"X(bd4iT>77"}`
     *
     * @since 5.5.0
     *
     * @deprecated Build your own function to generate complex objects.
     */
    json(): string;
    /**
     * Returns an array with random strings and numbers.
     *
     * @param length Size of the returned array. Defaults to `10`.
     * @param length.min The minimum size of the array.
     * @param length.max The maximum size of the array.
     *
     * @example
     * faker.datatype.array() // [ 94099, 85352, 'Hz%T.C\\l;8', '|#gmtw3otS', '2>:rJ|3$&d', 56864, 'Ss2-p0RXSI', 51084, 2039, 'mNEU[.r0Vf' ]
     * faker.datatype.array(3) // [ 61845, 'SK7H$W3:d*', 'm[%7N8*GVK' ]
     * faker.datatype.array({ min: 3, max: 5 }) // [ 99403, 76924, 42281, "Q'|$&y\\G/9" ]
     *
     * @since 5.5.0
     *
     * @deprecated Use your own function to build complex arrays.
     */
    array(length?: number | {
        /**
         * The minimum size of the array.
         */
        min: number;
        /**
         * The maximum size of the array.
         */
        max: number;
    }): Array<string | number>;
    /**
     * Returns a [BigInt](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Data_structures#bigint_type) number.
     *
     * @param options Maximum value or options object.
     * @param options.min Lower bound for generated bigint. Defaults to `0n`.
     * @param options.max Upper bound for generated bigint. Defaults to `min + 999999999999999n`.
     *
     * @throws When options define `max < min`.
     *
     * @see faker.number.bigInt(): For the replacement method.
     *
     * @example
     * faker.datatype.bigInt() // 55422n
     * faker.datatype.bigInt(100n) // 52n
     * faker.datatype.bigInt({ min: 1000000n }) // 431433n
     * faker.datatype.bigInt({ max: 100n }) // 42n
     * faker.datatype.bigInt({ min: 10n, max: 100n }) // 36n
     *
     * @since 6.0.0
     *
     * @deprecated Use `faker.number.bigInt()` instead.
     */
    bigInt(options?: bigint | boolean | number | string | {
        /**
         * Lower bound for generated bigint.
         *
         * @default 0n
         */
        min?: bigint | boolean | number | string;
        /**
         * Upper bound for generated bigint.
         *
         * @default min + 999999999999999n
         */
        max?: bigint | boolean | number | string;
    }): bigint;
}
