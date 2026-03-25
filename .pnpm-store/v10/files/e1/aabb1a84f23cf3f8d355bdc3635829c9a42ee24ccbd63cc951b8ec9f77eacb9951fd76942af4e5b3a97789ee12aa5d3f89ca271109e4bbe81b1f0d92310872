import type { Faker } from '../..';
import { SimpleModuleBase } from '../../internal/module-base';
import type { RecordKey } from './unique';
/**
 * Module with various helper methods providing basic (seed-dependent) operations useful for implementing faker methods (without methods requiring localized data).
 */
export declare class SimpleHelpersModule extends SimpleModuleBase {
    /**
     * Slugifies the given string.
     * For that all spaces (` `) are replaced by hyphens (`-`)
     * and most non word characters except for dots and hyphens will be removed.
     *
     * @param string The input to slugify. Defaults to `''`.
     *
     * @example
     * faker.helpers.slugify() // ''
     * faker.helpers.slugify("Hello world!") // 'Hello-world'
     *
     * @since 2.0.1
     */
    slugify(string?: string): string;
    /**
     * Parses the given string symbol by symbol and replaces the placeholders with digits (`0` - `9`).
     * `!` will be replaced by digits >=2 (`2` - `9`).
     *
     * @param string The template string to parse. Defaults to `''`.
     * @param symbol The symbol to replace with digits. Defaults to `'#'`.
     *
     * @see faker.string.numeric(): For the replacement method.
     *
     * @example
     * faker.helpers.replaceSymbolWithNumber() // ''
     * faker.helpers.replaceSymbolWithNumber('#####') // '04812'
     * faker.helpers.replaceSymbolWithNumber('!####') // '27378'
     * faker.helpers.replaceSymbolWithNumber('Your pin is: !####') // '29841'
     *
     * @since 2.0.1
     *
     * @deprecated Use `faker.string.numeric()` instead. Example: `value.replace(/#+/g, (m) => faker.string.numeric(m.length));`
     */
    replaceSymbolWithNumber(string?: string, symbol?: string): string;
    /**
     * Parses the given string symbol by symbols and replaces the placeholder appropriately.
     *
     * - `#` will be replaced with a digit (`0` - `9`).
     * - `?` will be replaced with an upper letter ('A' - 'Z')
     * - and `*` will be replaced with either a digit or letter.
     *
     * @param string The template string to parse. Defaults to `''`.
     *
     * @example
     * faker.helpers.replaceSymbols() // ''
     * faker.helpers.replaceSymbols('#####') // '98441'
     * faker.helpers.replaceSymbols('?????') // 'ZYRQQ'
     * faker.helpers.replaceSymbols('*****') // '4Z3P7'
     * faker.helpers.replaceSymbols('Your pin is: #?*#?*') // '0T85L1'
     *
     * @since 3.0.0
     */
    replaceSymbols(string?: string): string;
    /**
     * Replaces the symbols and patterns in a credit card schema including Luhn checksum.
     *
     * This method supports both range patterns `[4-9]` as well as the patterns used by `replaceSymbolWithNumber()`.
     * `L` will be replaced with the appropriate Luhn checksum.
     *
     * @param string The credit card format pattern. Defaults to `'6453-####-####-####-###L'`.
     * @param symbol The symbol to replace with a digit. Defaults to `'#'`.
     *
     * @example
     * faker.helpers.replaceCreditCardSymbols() // '6453-4876-8626-8995-3771'
     * faker.helpers.replaceCreditCardSymbols('1234-[4-9]-##!!-L') // '1234-9-5298-2'
     *
     * @since 5.0.0
     */
    replaceCreditCardSymbols(string?: string, symbol?: string): string;
    /**
     * Replaces the regex like expressions in the given string with matching values.
     *
     * Supported patterns:
     * - `.{times}` => Repeat the character exactly `times` times.
     * - `.{min,max}` => Repeat the character `min` to `max` times.
     * - `[min-max]` => Generate a number between min and max (inclusive).
     *
     * @param string The template string to parse. Defaults to `''`.
     *
     * @see faker.helpers.fromRegExp(): For generating a string matching the given regex-like expressions.
     *
     * @example
     * faker.helpers.regexpStyleStringParse() // ''
     * faker.helpers.regexpStyleStringParse('#{5}') // '#####'
     * faker.helpers.regexpStyleStringParse('#{2,9}') // '#######'
     * faker.helpers.regexpStyleStringParse('[500-15000]') // '8375'
     * faker.helpers.regexpStyleStringParse('#{3}test[1-5]') // '###test3'
     *
     * @since 5.0.0
     *
     * @deprecated Use `faker.helpers.fromRegExp()` instead.
     */
    regexpStyleStringParse(string?: string): string;
    /**
     * Generates a string matching the given regex like expressions.
     *
     * This function doesn't provide full support of actual `RegExp`.
     * Features such as grouping, anchors and character classes are not supported.
     * If you are looking for a library that randomly generates strings based on
     * `RegExp`s, see [randexp.js](https://github.com/fent/randexp.js)
     *
     * Supported patterns:
     * - `x{times}` => Repeat the `x` exactly `times` times.
     * - `x{min,max}` => Repeat the `x` `min` to `max` times.
     * - `[x-y]` => Randomly get a character between `x` and `y` (inclusive).
     * - `[x-y]{times}` => Randomly get a character between `x` and `y` (inclusive) and repeat it `times` times.
     * - `[x-y]{min,max}` => Randomly get a character between `x` and `y` (inclusive) and repeat it `min` to `max` times.
     * - `[^...]` => Randomly get an ASCII number or letter character that is not in the given range. (e.g. `[^0-9]` will get a random non-numeric character).
     * - `[-...]` => Include dashes in the range. Must be placed after the negate character `^` and before any character sets if used (e.g. `[^-0-9]` will not get any numeric characters or dashes).
     * - `/[x-y]/i` => Randomly gets an uppercase or lowercase character between `x` and `y` (inclusive).
     * - `x?` => Randomly decide to include or not include `x`.
     * - `[x-y]?` => Randomly decide to include or not include characters between `x` and `y` (inclusive).
     * - `x*` => Repeat `x` 0 or more times.
     * - `[x-y]*` => Repeat characters between `x` and `y` (inclusive) 0 or more times.
     * - `x+` => Repeat `x` 1 or more times.
     * - `[x-y]+` => Repeat characters between `x` and `y` (inclusive) 1 or more times.
     * - `.` => returns a wildcard ASCII character that can be any number, character or symbol. Can be combined with quantifiers as well.
     *
     * @param pattern The template string/RegExp to generate a matching string for.
     *
     * @throws If min value is more than max value in quantifier, e.g. `#{10,5}`.
     * @throws If an invalid quantifier symbol is passed in.
     *
     * @example
     * faker.helpers.fromRegExp('#{5}') // '#####'
     * faker.helpers.fromRegExp('#{2,9}') // '#######'
     * faker.helpers.fromRegExp('[1-7]') // '5'
     * faker.helpers.fromRegExp('#{3}test[1-5]') // '###test3'
     * faker.helpers.fromRegExp('[0-9a-dmno]') // '5'
     * faker.helpers.fromRegExp('[^a-zA-Z0-8]') // '9'
     * faker.helpers.fromRegExp('[a-d0-6]{2,8}') // 'a0dc45b0'
     * faker.helpers.fromRegExp('[-a-z]{5}') // 'a-zab'
     * faker.helpers.fromRegExp(/[A-Z0-9]{4}-[A-Z0-9]{4}/) // 'BS4G-485H'
     * faker.helpers.fromRegExp(/[A-Z]{5}/i) // 'pDKfh'
     * faker.helpers.fromRegExp(/.{5}/) // '14(#B'
     * faker.helpers.fromRegExp(/Joh?n/) // 'Jon'
     * faker.helpers.fromRegExp(/ABC*DE/) // 'ABDE'
     * faker.helpers.fromRegExp(/bee+p/) // 'beeeeeeeep'
     *
     * @since 8.0.0
     */
    fromRegExp(pattern: string | RegExp): string;
    /**
     * Takes an array and randomizes it in place then returns it.
     *
     * @template T The type of the elements to shuffle.
     *
     * @param list The array to shuffle.
     * @param options The options to use when shuffling.
     * @param options.inplace Whether to shuffle the array in place or return a new array. Defaults to `false`.
     *
     * @example
     * faker.helpers.shuffle(['a', 'b', 'c'], { inplace: true }) // [ 'b', 'c', 'a' ]
     *
     * @since 8.0.0
     */
    shuffle<T>(list: T[], options: {
        /**
         * Whether to shuffle the array in place or return a new array.
         *
         * @default false
         */
        inplace: true;
    }): T[];
    /**
     * Returns a randomized version of the array.
     *
     * @template T The type of the elements to shuffle.
     *
     * @param list The array to shuffle.
     * @param options The options to use when shuffling.
     * @param options.inplace Whether to shuffle the array in place or return a new array. Defaults to `false`.
     *
     * @example
     * faker.helpers.shuffle(['a', 'b', 'c']) // [ 'b', 'c', 'a' ]
     * faker.helpers.shuffle(['a', 'b', 'c'], { inplace: false }) // [ 'b', 'c', 'a' ]
     *
     * @since 2.0.1
     */
    shuffle<T>(list: ReadonlyArray<T>, options?: {
        /**
         * Whether to shuffle the array in place or return a new array.
         *
         * @default false
         */
        inplace?: false;
    }): T[];
    /**
     * Returns a randomized version of the array.
     *
     * @template T The type of the elements to shuffle.
     *
     * @param list The array to shuffle.
     * @param options The options to use when shuffling.
     * @param options.inplace Whether to shuffle the array in place or return a new array. Defaults to `false`.
     *
     * @example
     * faker.helpers.shuffle(['a', 'b', 'c']) // [ 'b', 'c', 'a' ]
     * faker.helpers.shuffle(['a', 'b', 'c'], { inplace: true }) // [ 'b', 'c', 'a' ]
     * faker.helpers.shuffle(['a', 'b', 'c'], { inplace: false }) // [ 'b', 'c', 'a' ]
     *
     * @since 2.0.1
     */
    shuffle<T>(list: T[], options?: {
        /**
         * Whether to shuffle the array in place or return a new array.
         *
         * @default false
         */
        inplace?: boolean;
    }): T[];
    /**
     * Takes an array of strings or function that returns a string
     * and outputs a unique array of strings based on that source.
     * This method does not store the unique state between invocations.
     *
     * If there are not enough unique values to satisfy the length, if
     * the source is an array, it will only return as many items as are
     * in the array. If the source is a function, it will return after
     * a maximum number of attempts has been reached.
     *
     * @template T The type of the elements.
     *
     * @param source The strings to choose from or a function that generates a string.
     * @param length The number of elements to generate.
     *
     * @example
     * faker.helpers.uniqueArray(faker.word.sample, 50)
     * faker.helpers.uniqueArray(faker.definitions.person.first_name, 6)
     * faker.helpers.uniqueArray(["Hello", "World", "Goodbye"], 2)
     *
     * @since 6.0.0
     */
    uniqueArray<T>(source: ReadonlyArray<T> | (() => T), length: number): T[];
    /**
     * Replaces the `{{placeholder}}` patterns in the given string mustache style.
     *
     * @param str The template string to parse.
     * @param data The data used to populate the placeholders.
     * This is a record where the key is the template placeholder,
     * whereas the value is either a string or a function suitable for `String.replace()`.
     *
     * @example
     * faker.helpers.mustache('I found {{count}} instances of "{{word}}".', {
     *   count: () => `${faker.number.int()}`,
     *   word: "this word",
     * }) // 'I found 57591 instances of "this word".'
     *
     * @since 2.0.1
     */
    mustache(str: string | undefined, data: Record<string, string | Parameters<string['replace']>[1]>): string;
    /**
     * Returns the result of the callback if the probability check was successful, otherwise `undefined`.
     *
     * @template TResult The type of result of the given callback.
     *
     * @param callback The callback to that will be invoked if the probability check was successful.
     * @param options The options to use.
     * @param options.probability The probability (`[0.00, 1.00]`) of the callback being invoked. Defaults to `0.5`.
     *
     * @example
     * faker.helpers.maybe(() => 'Hello World!') // 'Hello World!'
     * faker.helpers.maybe(() => 'Hello World!', { probability: 0.1 }) // undefined
     * faker.helpers.maybe(() => 'Hello World!', { probability: 0.9 }) // 'Hello World!'
     *
     * @since 6.3.0
     */
    maybe<TResult>(callback: () => TResult, options?: {
        /**
         * The probability (`[0.00, 1.00]`) of the callback being invoked.
         *
         * @default 0.5
         */
        probability?: number;
    }): TResult | undefined;
    /**
     * Returns a random key from given object.
     *
     * @template T The type of the object to select from.
     *
     * @param object The object to be used.
     *
     * @throws If the given object is empty.
     *
     * @example
     * faker.helpers.objectKey({ myProperty: 'myValue' }) // 'myProperty'
     *
     * @since 6.3.0
     */
    objectKey<T extends Record<string, unknown>>(object: T): keyof T;
    /**
     * Returns a random value from given object.
     *
     * @template T The type of object to select from.
     *
     * @param object The object to be used.
     *
     * @throws If the given object is empty.
     *
     * @example
     * faker.helpers.objectValue({ myProperty: 'myValue' }) // 'myValue'
     *
     * @since 6.3.0
     */
    objectValue<T extends Record<string, unknown>>(object: T): T[keyof T];
    /**
     * Returns a random `[key, value]` pair from the given object.
     *
     * @template T The type of the object to select from.
     *
     * @param object The object to be used.
     *
     * @throws If the given object is empty.
     *
     * @example
     * faker.helpers.objectEntry({ prop1: 'value1', prop2: 'value2' }) // ['prop1', 'value1']
     *
     * @since 8.0.0
     */
    objectEntry<T extends Record<string, unknown>>(object: T): [keyof T, T[keyof T]];
    /**
     * Returns random element from the given array.
     *
     * @template T The type of the elements to pick from.
     *
     * @param array The array to pick the value from.
     *
     * @throws If the given array is empty.
     *
     * @example
     * faker.helpers.arrayElement(['cat', 'dog', 'mouse']) // 'dog'
     *
     * @since 6.3.0
     */
    arrayElement<T>(array: ReadonlyArray<T>): T;
    /**
     * Returns a weighted random element from the given array. Each element of the array should be an object with two keys `weight` and `value`.
     *
     * - Each `weight` key should be a number representing the probability of selecting the value, relative to the sum of the weights. Weights can be any positive float or integer.
     * - Each `value` key should be the corresponding value.
     *
     * For example, if there are two values A and B, with weights 1 and 2 respectively, then the probability of picking A is 1/3 and the probability of picking B is 2/3.
     *
     * @template T The type of the elements to pick from.
     *
     * @param array Array to pick the value from.
     * @param array[].weight The weight of the value.
     * @param array[].value The value to pick.
     *
     * @example
     * faker.helpers.weightedArrayElement([{ weight: 5, value: 'sunny' }, { weight: 4, value: 'rainy' }, { weight: 1, value: 'snowy' }]) // 'sunny', 50% of the time, 'rainy' 40% of the time, 'snowy' 10% of the time
     *
     * @since 8.0.0
     */
    weightedArrayElement<T>(array: ReadonlyArray<{
        /**
         * The weight of the value.
         */
        weight: number;
        /**
         * The value to pick.
         */
        value: T;
    }>): T;
    /**
     * Returns a subset with random elements of the given array in random order.
     *
     * @template T The type of the elements to pick from.
     *
     * @param array Array to pick the value from.
     * @param count Number or range of elements to pick.
     *    When not provided, random number of elements will be picked.
     *    When value exceeds array boundaries, it will be limited to stay inside.
     *
     * @example
     * faker.helpers.arrayElements(['cat', 'dog', 'mouse']) // ['mouse', 'cat']
     * faker.helpers.arrayElements([1, 2, 3, 4, 5], 2) // [4, 2]
     * faker.helpers.arrayElements([1, 2, 3, 4, 5], { min: 2, max: 4 }) // [3, 5, 1]
     *
     * @since 6.3.0
     */
    arrayElements<T>(array: ReadonlyArray<T>, count?: number | {
        /**
         * The minimum number of elements to pick.
         */
        min: number;
        /**
         * The maximum number of elements to pick.
         */
        max: number;
    }): T[];
    /**
     * Returns a random value from an Enum object.
     *
     * This does the same as `objectValue` except that it ignores (the values assigned to) the numeric keys added for TypeScript enums.
     *
     * @template T Type of generic enums, automatically inferred by TypeScript.
     *
     * @param enumObject Enum to pick the value from.
     *
     * @example
     * enum Color { Red, Green, Blue }
     * faker.helpers.enumValue(Color) // 1 (Green)
     *
     * enum Direction { North = 'North', South = 'South'}
     * faker.helpers.enumValue(Direction) // 'South'
     *
     * enum HttpStatus { Ok = 200, Created = 201, BadRequest = 400, Unauthorized = 401 }
     * faker.helpers.enumValue(HttpStatus) // 200 (Ok)
     *
     * @since 8.0.0
     */
    enumValue<T extends Record<string | number, string | number>>(enumObject: T): T[keyof T];
    /**
     * Helper method that converts the given number or range to a number.
     *
     * @param numberOrRange The number or range to convert.
     * @param numberOrRange.min The minimum value for the range.
     * @param numberOrRange.max The maximum value for the range.
     *
     * @example
     * faker.helpers.rangeToNumber(1) // 1
     * faker.helpers.rangeToNumber({ min: 1, max: 10 }) // 5
     *
     * @since 8.0.0
     */
    rangeToNumber(numberOrRange: number | {
        /**
         * The minimum value for the range.
         */
        min: number;
        /**
         * The maximum value for the range.
         */
        max: number;
    }): number;
    /**
     * Generates a unique result using the results of the given method.
     * Used unique entries will be stored internally and filtered from subsequent calls.
     *
     * @template TMethod The type of the method to execute.
     *
     * @param method The method used to generate the values.
     * @param args The arguments used to call the method. Defaults to `[]`.
     * @param options The optional options used to configure this method.
     * @param options.startTime This parameter does nothing.
     * @param options.maxTime The time in milliseconds this method may take before throwing an error. Defaults to `50`.
     * @param options.maxRetries The total number of attempts to try before throwing an error. Defaults to `50`.
     * @param options.currentIterations This parameter does nothing.
     * @param options.exclude The value or values that should be excluded/skipped. Defaults to `[]`.
     * @param options.compare The function used to determine whether a value was already returned. Defaults to check the existence of the key.
     * @param options.store The store of unique entries. Defaults to a global store.
     *
     * @see https://github.com/faker-js/faker/issues/1785#issuecomment-1407773744
     *
     * @example
     * faker.helpers.unique(faker.person.firstName) // 'Corbin'
     *
     * @since 7.5.0
     *
     * @deprecated Please find a dedicated npm package instead, or even create one on your own if you want to.
     * More info can be found in issue [faker-js/faker #1785](https://github.com/faker-js/faker/issues/1785).
     */
    unique<TMethod extends (...parameters: any[]) => RecordKey>(method: TMethod, args?: Parameters<TMethod>, options?: {
        /**
         * This parameter does nothing.
         *
         * @default new Date().getTime()
         */
        startTime?: number;
        /**
         * The time in milliseconds this method may take before throwing an error.
         *
         * @default 50
         */
        maxTime?: number;
        /**
         * The total number of attempts to try before throwing an error.
         *
         * @default 50
         */
        maxRetries?: number;
        /**
         * This parameter does nothing.
         *
         * @default 0
         */
        currentIterations?: number;
        /**
         * The value or values that should be excluded/skipped.
         *
         * @default []
         */
        exclude?: RecordKey | RecordKey[];
        /**
         * The function used to determine whether a value was already returned.
         *
         * Defaults to check the existence of the key.
         *
         * @default (obj, key) => (obj[key] === undefined ? -1 : 0)
         */
        compare?: (obj: Record<RecordKey, RecordKey>, key: RecordKey) => 0 | -1;
        /**
         * The store of unique entries.
         *
         * Defaults to a global store.
         */
        store?: Record<RecordKey, RecordKey>;
    }): ReturnType<TMethod>;
    /**
     * Generates an array containing values returned by the given method.
     *
     * @template TResult The type of elements.
     *
     * @param method The method used to generate the values.
     * @param options The optional options object.
     * @param options.count The number or range of elements to generate. Defaults to `3`.
     *
     * @example
     * faker.helpers.multiple(faker.person.firstName) // [ 'Aniya', 'Norval', 'Dallin' ]
     * faker.helpers.multiple(faker.person.firstName, { count: 3 }) // [ 'Santos', 'Lavinia', 'Lavinia' ]
     *
     * @since 8.0.0
     */
    multiple<TResult>(method: () => TResult, options?: {
        /**
         * The number or range of elements to generate.
         *
         * @default 3
         */
        count?: number | {
            /**
             * The minimum value for the range.
             */
            min: number;
            /**
             * The maximum value for the range.
             */
            max: number;
        };
    }): TResult[];
}
/**
 * Module with various helper methods providing basic (seed-dependent) operations useful for implementing faker methods.
 *
 * ### Overview
 *
 * A particularly helpful method is [`arrayElement()`](https://fakerjs.dev/api/helpers.html#arrayelement) which returns a random element from an array. This is useful when adding custom data that Faker doesn't contain.
 *
 * There are alternatives of this method for objects ([`objectKey()`](https://fakerjs.dev/api/helpers.html#objectkey) and [`objectValue()`](https://fakerjs.dev/api/helpers.html#objectvalue)) and enums ([`enumValue()`](https://fakerjs.dev/api/helpers.html#enumvalue)). You can also return multiple elements ([`arrayElements()`](https://fakerjs.dev/api/helpers.html#arrayelements)) or elements according to a weighting ([`weightedArrayElement()`](https://fakerjs.dev/api/helpers.html#weightedarrayelement)).
 *
 * A number of methods can generate strings according to various patterns: [`replaceSymbols()`](https://fakerjs.dev/api/helpers.html#replacesymbols), [`replaceSymbolWithNumber()`](https://fakerjs.dev/api/helpers.html#replacesymbolwithnumber), and [`fromRegExp()`](https://fakerjs.dev/api/helpers.html#fromregexp).
 */
export declare class HelpersModule extends SimpleHelpersModule {
    protected readonly faker: Faker;
    constructor(faker: Faker);
    /**
     * Generator for combining faker methods based on a static string input.
     *
     * Note: We recommend using string template literals instead of `fake()`,
     * which are faster and strongly typed (if you are using TypeScript),
     * e.g. ``const address = `${faker.location.zipCode()} ${faker.location.city()}`;``
     *
     * This method is useful if you have to build a random string from a static, non-executable source
     * (e.g. string coming from a user, stored in a database or a file).
     *
     * It checks the given string for placeholders and replaces them by calling faker methods:
     *
     * ```js
     * const hello = faker.helpers.fake('Hi, my name is {{person.firstName}} {{person.lastName}}!');
     * ```
     *
     * This would use the `faker.person.firstName()` and `faker.person.lastName()` method to resolve the placeholders respectively.
     *
     * It is also possible to provide parameters. At first, they will be parsed as json,
     * and if that isn't possible, we will fall back to string:
     *
     * ```js
     * const message = faker.helpers.fake('You can call me at {{phone.number(+!# !## #### #####!)}}.');
     * ```
     *
     * It is also possible to use multiple parameters (comma separated).
     *
     * ```js
     * const message = faker.helpers.fake('Your pin is {{string.numeric(4, {"allowLeadingZeros": true})}}.');
     * ```
     *
     * It is also NOT possible to use any non-faker methods or plain javascript in such patterns.
     *
     * @param pattern The pattern string that will get interpolated.
     *
     * @see faker.helpers.mustache(): For using custom functions to resolve templates.
     *
     * @example
     * faker.helpers.fake('{{person.lastName}}') // 'Barrows'
     * faker.helpers.fake('{{person.lastName}}, {{person.firstName}} {{person.suffix}}') // 'Durgan, Noe MD'
     * faker.helpers.fake('This is static test.') // 'This is static test.'
     * faker.helpers.fake('Good Morning {{person.firstName}}!') // 'Good Morning Estelle!'
     * faker.helpers.fake('You can call me at {{phone.number(!## ### #####!)}}.') // 'You can call me at 202 555 973722.'
     * faker.helpers.fake('I flipped the coin and got: {{helpers.arrayElement(["heads", "tails"])}}') // 'I flipped the coin and got: tails'
     * faker.helpers.fake('Your PIN number is: {{string.numeric(4, {"exclude": ["0"]})}}') // 'Your PIN number is: 4834'
     *
     * @since 7.4.0
     */
    fake(pattern: string): string;
    /**
     * Generator for combining faker methods based on an array containing static string inputs.
     *
     * Note: We recommend using string template literals instead of `fake()`,
     * which are faster and strongly typed (if you are using TypeScript),
     * e.g. ``const address = `${faker.location.zipCode()} ${faker.location.city()}`;``
     *
     * This method is useful if you have to build a random string from a static, non-executable source
     * (e.g. string coming from a user, stored in a database or a file).
     *
     * It checks the given string for placeholders and replaces them by calling faker methods:
     *
     * ```js
     * const hello = faker.helpers.fake(['Hi, my name is {{person.firstName}} {{person.lastName}}!']);
     * ```
     *
     * This would use the `faker.person.firstName()` and `faker.person.lastName()` method to resolve the placeholders respectively.
     *
     * It is also possible to provide parameters. At first, they will be parsed as json,
     * and if that isn't possible, it will fall back to string:
     *
     * ```js
     * const message = faker.helpers.fake([
     *   'You can call me at {{phone.number(+!# !## #### #####!)}}.',
     *   'My email is {{internet.email}}.',
     * ]);
     * ```
     *
     * It is also possible to use multiple parameters (comma separated).
     *
     * ```js
     * const message = faker.helpers.fake(['Your pin is {{string.numeric(4, {"allowLeadingZeros": true})}}.']);
     * ```
     *
     * It is also NOT possible to use any non-faker methods or plain javascript in such patterns.
     *
     * @param patterns The array to select a pattern from, that will then get interpolated. Must not be empty.
     *
     * @see faker.helpers.mustache(): For using custom functions to resolve templates.
     *
     * @example
     * faker.helpers.fake(['A: {{person.firstName}}', 'B: {{person.lastName}}']) // 'A: Barry'
     *
     * @since 8.0.0
     */
    fake(patterns: ReadonlyArray<string>): string;
    /**
     * Generator for combining faker methods based on a static string input or an array of static string inputs.
     *
     * Note: We recommend using string template literals instead of `fake()`,
     * which are faster and strongly typed (if you are using TypeScript),
     * e.g. ``const address = `${faker.location.zipCode()} ${faker.location.city()}`;``
     *
     * This method is useful if you have to build a random string from a static, non-executable source
     * (e.g. string coming from a user, stored in a database or a file).
     *
     * It checks the given string for placeholders and replaces them by calling faker methods:
     *
     * ```js
     * const hello = faker.helpers.fake('Hi, my name is {{person.firstName}} {{person.lastName}}!');
     * ```
     *
     * This would use the `faker.person.firstName()` and `faker.person.lastName()` method to resolve the placeholders respectively.
     *
     * It is also possible to provide parameters. At first, they will be parsed as json,
     * and if that isn't possible, it will fall back to string:
     *
     * ```js
     * const message = faker.helpers.fake('You can call me at {{phone.number(+!# !## #### #####!)}}.');
     * ```
     *
     * It is also possible to use multiple parameters (comma separated).
     *
     * ```js
     * const message = faker.helpers.fake('Your pin is {{string.numeric(4, {"allowLeadingZeros": true})}}.');
     * ```
     *
     * It is also NOT possible to use any non-faker methods or plain javascript in such patterns.
     *
     * @param pattern The pattern string that will get interpolated. If an array is passed, a random element will be picked and interpolated.
     *
     * @see faker.helpers.mustache(): For using custom functions to resolve templates.
     *
     * @example
     * faker.helpers.fake('{{person.lastName}}') // 'Barrows'
     * faker.helpers.fake('{{person.lastName}}, {{person.firstName}} {{person.suffix}}') // 'Durgan, Noe MD'
     * faker.helpers.fake('This is static test.') // 'This is static test.'
     * faker.helpers.fake('Good Morning {{person.firstName}}!') // 'Good Morning Estelle!'
     * faker.helpers.fake('You can visit me at {{location.streetAddress(true)}}.') // 'You can visit me at 3393 Ronny Way Apt. 742.'
     * faker.helpers.fake('I flipped the coin and got: {{helpers.arrayElement(["heads", "tails"])}}') // 'I flipped the coin and got: tails'
     * faker.helpers.fake(['A: {{person.firstName}}', 'B: {{person.lastName}}']) // 'A: Barry'
     *
     * @since 7.4.0
     */
    fake(pattern: string | ReadonlyArray<string>): string;
}
