import { DatatypeModule } from './modules/datatype';
import { SimpleDateModule } from './modules/date';
import { SimpleHelpersModule } from './modules/helpers';
import { NumberModule } from './modules/number';
import { StringModule } from './modules/string';
import type { Randomizer } from './randomizer';
/**
 * This is a simplified Faker class that doesn't need any localized data to generate its output.
 *
 * It only includes methods from:
 * - `datatype`
 * - `date` (without `month` and `weekday`)
 * - `helpers` (without `fake`)
 * - `number`
 * - `string`
 *
 * @example
 * import { simpleFaker } from '@faker-js/faker';
 * // const { simpleFaker } = require('@faker-js/faker');
 *
 * // simpleFaker.seed(1234);
 *
 * simpleFaker.number.int(10); // 4
 * simpleFaker.string.uuid(); // 'c50e1f5c-86e8-4aa9-888e-168e0a182519'
 */
export declare class SimpleFaker {
    protected _defaultRefDate: () => Date;
    /**
     * Gets a new reference date used to generate relative dates.
     */
    get defaultRefDate(): () => Date;
    /**
     * Sets the `refDate` source to use if no `refDate` date is passed to the date methods.
     *
     * @param dateOrSource The function or the static value used to generate the `refDate` date instance.
     * The function must return a new valid `Date` instance for every call.
     * Defaults to `() => new Date()`.
     *
     * @see [Reproducible Results](https://fakerjs.dev/guide/usage.html#reproducible-results)
     * @see faker.seed(): For generating reproducible values.
     *
     * @example
     * faker.seed(1234);
     *
     * // Default behavior
     * // faker.setDefaultRefDate();
     * faker.date.past(); // Changes based on the current date/time
     *
     * // Use a static ref date
     * faker.setDefaultRefDate(new Date('2020-01-01'));
     * faker.date.past(); // Reproducible '2019-07-03T08:27:58.118Z'
     *
     * // Use a ref date that changes every time it is used
     * let clock = new Date("2020-01-01").getTime();
     * faker.setDefaultRefDate(() => {
     *   clock += 1000; // +1s
     *   return new Date(clock);
     * });
     *
     * faker.defaultRefDate() // 2020-01-01T00:00:01Z
     * faker.defaultRefDate() // 2020-01-01T00:00:02Z
     *
     * @since 8.0.0
     */
    setDefaultRefDate(dateOrSource?: string | Date | number | (() => Date)): void;
    readonly datatype: DatatypeModule;
    readonly date: SimpleDateModule;
    readonly helpers: SimpleHelpersModule;
    readonly number: NumberModule;
    readonly string: StringModule;
    /**
     * Creates a new instance of SimpleFaker.
     *
     * In nearly any case you should use the prebuilt `simpleFaker` instances instead of the constructor.
     *
     * @param options The options to use.
     * @param options.randomizer The Randomizer to use.
     * Specify this only if you want to use it to achieve a specific goal,
     * such as sharing the same random generator with other instances/tools.
     * Defaults to faker's Mersenne Twister based pseudo random number generator.
     *
     * @example
     * import { SimpleFaker } from '@faker-js/faker';
     * // const { SimpleFaker } = require('@faker-js/faker');
     *
     * // create a SimpleFaker without any locale data
     * const customSimpleFaker = new SimpleFaker();
     *
     * customSimpleFaker.helpers.arrayElement(['red', 'green', 'blue']); // 'green'
     * customSimpleFaker.number.int(10); // 4
     *
     * @since 8.1.0
     */
    constructor(options?: {
        /**
         * The Randomizer to use.
         * Specify this only if you want to use it to achieve a specific goal,
         * such as sharing the same random generator with other instances/tools.
         *
         * @default generateMersenne32Randomizer()
         */
        randomizer?: Randomizer;
    });
    /**
     * Sets the seed or generates a new one.
     *
     * Please note that generated values are dependent on both the seed and the
     * number of calls that have been made since it was set.
     *
     * This method is intended to allow for consistent values in tests, so you
     * might want to use hardcoded values as the seed.
     *
     * In addition to that it can be used for creating truly random tests
     * (by passing no arguments), that still can be reproduced if needed,
     * by logging the result and explicitly setting it if needed.
     *
     * @param seed The seed to use. Defaults to a random number.
     *
     * @returns The seed that was set.
     *
     * @see [Reproducible Results](https://fakerjs.dev/guide/usage.html#reproducible-results)
     * @see faker.setDefaultRefDate(): For generating reproducible relative dates.
     *
     * @example
     * // Consistent values for tests:
     * faker.seed(42)
     * faker.number.int(10); // 4
     * faker.number.int(10); // 8
     *
     * faker.seed(42)
     * faker.number.int(10); // 4
     * faker.number.int(10); // 8
     *
     * // Random but reproducible tests:
     * // Simply log the seed, and if you need to reproduce it, insert the seed here
     * console.log('Running test with seed:', faker.seed());
     *
     * @since 6.0.0
     */
    seed(seed?: number): number;
    /**
     * Sets the seed array.
     *
     * Please note that generated values are dependent on both the seed and the
     * number of calls that have been made since it was set.
     *
     * This method is intended to allow for consistent values in a tests, so you
     * might want to use hardcoded values as the seed.
     *
     * In addition to that it can be used for creating truly random tests
     * (by passing no arguments), that still can be reproduced if needed,
     * by logging the result and explicitly setting it if needed.
     *
     * @param seedArray The seed array to use.
     *
     * @returns The seed array that was set.
     *
     * @see [Reproducible Results](https://fakerjs.dev/guide/usage.html#reproducible-results)
     * @see faker.setDefaultRefDate(): For generating reproducible relative dates.
     *
     * @example
     * // Consistent values for tests:
     * faker.seed([42, 13, 17])
     * faker.number.int(10); // 4
     * faker.number.int(10); // 8
     *
     * faker.seed([42, 13, 17])
     * faker.number.int(10); // 4
     * faker.number.int(10); // 8
     *
     * // Random but reproducible tests:
     * // Simply log the seed, and if you need to reproduce it, insert the seed here
     * console.log('Running test with seed:', faker.seed());
     *
     * @since 6.0.0
     */
    seed(seedArray: number[]): number[];
    /**
     * Sets the seed or generates a new one.
     *
     * Please note that generated values are dependent on both the seed and the
     * number of calls that have been made since it was set.
     *
     * This method is intended to allow for consistent values in a tests, so you
     * might want to use hardcoded values as the seed.
     *
     * In addition to that it can be used for creating truly random tests
     * (by passing no arguments), that still can be reproduced if needed,
     * by logging the result and explicitly setting it if needed.
     *
     * @param seed The seed or seed array to use.
     *
     * @returns The seed that was set.
     *
     * @see [Reproducible Results](https://fakerjs.dev/guide/usage.html#reproducible-results)
     * @see faker.setDefaultRefDate(): For generating reproducible dates.
     *
     * @example
     * // Consistent values for tests (using a number):
     * faker.seed(42)
     * faker.number.int(10); // 4
     * faker.number.int(10); // 8
     *
     * faker.seed(42)
     * faker.number.int(10); // 4
     * faker.number.int(10); // 8
     *
     * // Consistent values for tests (using an array):
     * faker.seed([42, 13, 17])
     * faker.number.int(10); // 4
     * faker.number.int(10); // 8
     *
     * faker.seed([42, 13, 17])
     * faker.number.int(10); // 4
     * faker.number.int(10); // 8
     *
     * // Random but reproducible tests:
     * // Simply log the seed, and if you need to reproduce it, insert the seed here
     * console.log('Running test with seed:', faker.seed());
     *
     * @since 6.0.0
     */
    seed(seed?: number | number[]): number | number[];
}
export declare const simpleFaker: SimpleFaker;
