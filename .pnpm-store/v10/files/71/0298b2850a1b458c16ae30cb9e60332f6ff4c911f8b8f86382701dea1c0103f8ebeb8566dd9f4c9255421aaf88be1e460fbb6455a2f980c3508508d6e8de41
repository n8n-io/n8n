import type { Faker } from '../..';
import type { RecordKey } from './unique';
/**
 * Module with various helper methods that transform the method input rather than returning values from locales.
 * The transformation process may call methods that use the locale data.
 */
export declare class HelpersModule {
    private readonly faker;
    constructor(faker: Faker);
    /**
     * Slugifies the given string.
     * For that all spaces (` `) are replaced by hyphens (`-`)
     * and most non word characters except for dots and hyphens will be removed.
     *
     * @param string The input to slugify.
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
     * @param string The template string to parse.
     * @param symbol The symbol to replace with digits. Defaults to `'#'`.
     *
     * @example
     * faker.helpers.replaceSymbolWithNumber() // ''
     * faker.helpers.replaceSymbolWithNumber('#####') // '04812'
     * faker.helpers.replaceSymbolWithNumber('!####') // '27378'
     * faker.helpers.replaceSymbolWithNumber('Your pin is: !####') // '29841'
     *
     * @since 2.0.1
     */
    replaceSymbolWithNumber(string?: string, symbol?: string): string;
    /**
     * Parses the given string symbol by symbols and replaces the placeholder appropriately.
     *
     * - `#` will be replaced with a digit (`0` - `9`).
     * - `?` will be replaced with an upper letter ('A' - 'Z')
     * - and `*` will be replaced with either a digit or letter.
     *
     * @param string The template string to parse.
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
     * @param string The credit card format pattern. Defaults to `6453-####-####-####-###L`.
     * @param symbol The symbol to replace with a digit.
     *
     * @example
     * faker.helpers.replaceCreditCardSymbols() // '6453-4876-8626-8995-3771'
     * faker.helpers.replaceCreditCardSymbols('1234-[4-9]-##!!-L') // '1234-9-5298-2'
     *
     * @since 5.0.0
     */
    replaceCreditCardSymbols(string?: string, symbol?: string): string;
    /**
     * Repeats the given string the given number of times.
     *
     * @param string The string to repeat. Defaults to `''`.
     * @param num The number of times to repeat it. Defaults to `0`.
     *
     * @example
     * faker.helpers.repeatString('Hello world! ') // ''
     * faker.helpers.repeatString('Hello world! ', 1) // 'Hello world! '
     * faker.helpers.repeatString('Hello world! ', 2) // 'Hello world! Hello world! '
     *
     * @since 5.0.0
     *
     * @deprecated Use [String.prototype.repeat()](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/repeat) instead.
     */
    repeatString(string?: string, num?: number): string;
    /**
     * Replaces the regex like expressions in the given string with matching values.
     *
     * Supported patterns:
     * - `.{times}` => Repeat the character exactly `times` times.
     * - `.{min,max}` => Repeat the character `min` to `max` times.
     * - `[min-max]` => Generate a number between min and max (inclusive).
     *
     * @param string The template string to to parse.
     *
     * @example
     * faker.helpers.regexpStyleStringParse() // ''
     * faker.helpers.regexpStyleStringParse('#{5}') // '#####'
     * faker.helpers.regexpStyleStringParse('#{2,9}') // '#######'
     * faker.helpers.regexpStyleStringParse('[500-15000]') // '8375'
     * faker.helpers.regexpStyleStringParse('#{3}test[1-5]') // '###test3'
     *
     * @since 5.0.0
     */
    regexpStyleStringParse(string?: string): string;
    /**
     * Takes an array and randomizes it in place then returns it.
     *
     * Uses the modern version of the Fisher–Yates algorithm.
     *
     * @template T The type of the entries to shuffle.
     * @param o The array to shuffle. Defaults to `[]`.
     *
     * @example
     * faker.helpers.shuffle() // []
     * faker.helpers.shuffle(['a', 'b', 'c']) // [ 'b', 'c', 'a' ]
     *
     * @since 2.0.1
     */
    shuffle<T>(o?: T[]): T[];
    /**
     * Takes an array of strings or function that returns a string
     * and outputs a unique array of strings based on that source.
     * This method does not store the unique state between invocations.
     *
     * @template T The type of the entries.
     * @param source The strings to choose from or a function that generates a string.
     * @param length The number of elements to generate.
     *
     * @example
     * faker.helpers.uniqueArray(faker.random.word, 50)
     * faker.helpers.uniqueArray(faker.definitions.name.first_name, 6)
     * faker.helpers.uniqueArray(["Hello", "World", "Goodbye"], 2)
     *
     * @since 6.0.0
     */
    uniqueArray<T>(source: readonly T[] | (() => T), length: number): T[];
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
     *   count: () => `${faker.datatype.number()}`,
     *   word: "this word",
     * }) // 'I found 57591 instances of "this word".'
     *
     * @since 2.0.1
     */
    mustache(str: string | undefined, data: Record<string, string | Parameters<string['replace']>[1]>): string;
    /**
     * Returns the result of the callback if the probability check was successful, otherwise `undefined`.
     *
     * @template T The type of result of the given callback.
     * @param callback The callback to that will be invoked if the probability check was successful.
     * @param options The options to use. Defaults to `{}`.
     * @param options.probability The probability (`[0.00, 1.00]`) of the callback being invoked. Defaults to `0.5`.
     *
     * @example
     * faker.helpers.maybe(() => 'Hello World!') // 'Hello World!'
     * faker.helpers.maybe(() => 'Hello World!', { probability: 0.1 }) // undefined
     * faker.helpers.maybe(() => 'Hello World!', { probability: 0.9 }) // 'Hello World!'
     *
     * @since 6.3.0
     */
    maybe<T>(callback: () => T, options?: {
        probability?: number;
    }): T | undefined;
    /**
     * Returns a random key from given object or `undefined` if no key could be found.
     *
     * @param object The object to be used.
     *
     * @example
     * faker.helpers.objectKey({ myProperty: 'myValue' }) // 'myProperty'
     *
     * @since 6.3.0
     */
    objectKey<T extends Record<string, unknown>>(object: T): keyof T;
    /**
     * Returns a random value from given object or `undefined` if no key could be found.
     *
     * @param object The object to be used.
     *
     * @example
     * faker.helpers.objectValue({ myProperty: 'myValue' }) // 'myValue'
     *
     * @since 6.3.0
     */
    objectValue<T extends Record<string, unknown>>(object: T): T[keyof T];
    /**
     * Returns random element from the given array.
     *
     * @template T The type of the entries to pick from.
     * @param array Array to pick the value from.
     *
     * @example
     * faker.helpers.arrayElement(['cat', 'dog', 'mouse']) // 'dog'
     *
     * @since 6.3.0
     */
    arrayElement<T = string>(array?: ReadonlyArray<T>): T;
    /**
     * Returns a subset with random elements of the given array in random order.
     *
     * @template T The type of the entries to pick from.
     * @param array Array to pick the value from.
     * @param count Number of elements to pick.
     *    When not provided, random number of elements will be picked.
     *    When value exceeds array boundaries, it will be limited to stay inside.
     *
     * @example
     * faker.helpers.arrayElements(['cat', 'dog', 'mouse']) // ['mouse', 'cat']
     * faker.helpers.arrayElements([1, 2, 3, 4, 5], 2) // [4, 2]
     *
     * @since 6.3.0
     */
    arrayElements<T>(array?: ReadonlyArray<T>, count?: number): T[];
    /**
     * Generator for combining faker methods based on a static string input.
     *
     * Note: We recommend using string template literals instead of `fake()`,
     * which are faster and strongly typed (if you are using TypeScript),
     * e.g. ``const address = `${faker.address.zipCode()} ${faker.address.city()}`;``
     *
     * This method is useful if you have to build a random string from a static, non-executable source
     * (e.g. string coming from a user, stored in a database or a file).
     *
     * It checks the given string for placeholders and replaces them by calling faker methods:
     *
     * ```js
     * const hello = faker.helpers.fake('Hi, my name is {{name.firstName}} {{name.lastName}}!')
     * ```
     *
     * This would use the `faker.name.firstName()` and `faker.name.lastName()` method to resolve the placeholders respectively.
     *
     * It is also possible to provide parameters. At first, they will be parsed as json,
     * and if that isn't possible, we will fall back to string:
     *
     * ```js
     * const message = faker.helpers.fake(`You can call me at {{phone.number(+!# !## #### #####!)}}.')
     * ```
     *
     * Currently it is not possible to set more than a single parameter.
     *
     * It is also NOT possible to use any non-faker methods or plain javascript in such templates.
     *
     * @param str The template string that will get interpolated. Must not be empty.
     *
     * @see faker.helpers.mustache() to use custom functions for resolution.
     *
     * @example
     * faker.helpers.fake('{{name.lastName}}') // 'Barrows'
     * faker.helpers.fake('{{name.lastName}}, {{name.firstName}} {{name.suffix}}') // 'Durgan, Noe MD'
     * faker.helpers.fake('This is static test.') // 'This is static test.'
     * faker.helpers.fake('Good Morning {{name.firstName}}!') // 'Good Morning Estelle!'
     * faker.helpers.fake('You can call me at {{phone.number(!## ### #####!)}}.') // 'You can call me at 202 555 973722.'
     * faker.helpers.fake('I flipped the coin and got: {{helpers.arrayElement(["heads", "tails"])}}') // 'I flipped the coin and got: tails'
     *
     * @since 7.4.0
     */
    fake(str: string): string;
    /**
     * Generates a unique result using the results of the given method.
     * Used unique entries will be stored internally and filtered from subsequent calls.
     *
     * @template Method The type of the method to execute.
     * @param method The method used to generate the values.
     * @param args The arguments used to call the method.
     * @param options The optional options used to configure this method.
     * @param options.startTime This parameter does nothing.
     * @param options.maxTime The time in milliseconds this method may take before throwing an error. Defaults to `50`.
     * @param options.maxRetries The total number of attempts to try before throwing an error. Defaults to `50`.
     * @param options.currentIterations This parameter does nothing.
     * @param options.exclude The value or values that should be excluded/skipped. Defaults to `[]`.
     * @param options.compare The function used to determine whether a value was already returned. Defaults to check the existence of the key.
     * @param options.store The store of unique entries. Defaults to a global store.
     *
     * @example
     * faker.helpers.unique(faker.name.firstName) // 'Corbin'
     *
     * @since 7.5.0
     */
    unique<Method extends (...parameters: any[]) => RecordKey>(method: Method, args?: Parameters<Method>, options?: {
        startTime?: number;
        maxTime?: number;
        maxRetries?: number;
        currentIterations?: number;
        exclude?: RecordKey | RecordKey[];
        compare?: (obj: Record<RecordKey, RecordKey>, key: RecordKey) => 0 | -1;
        store?: Record<RecordKey, RecordKey>;
    }): ReturnType<Method>;
}
