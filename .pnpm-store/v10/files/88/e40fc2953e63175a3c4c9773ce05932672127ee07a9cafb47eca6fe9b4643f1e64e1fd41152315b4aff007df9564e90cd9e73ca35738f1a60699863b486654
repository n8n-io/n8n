import type { Faker } from '../..';
import { SimpleModuleBase } from '../../internal/module-base';
/**
 * Module to generate dates (without methods requiring localized data).
 */
export declare class SimpleDateModule extends SimpleModuleBase {
    /**
     * Generates a random date that can be either in the past or in the future.
     *
     * @param options The optional options object.
     * @param options.refDate The date to use as reference point for the newly generated date. Defaults to `faker.defaultRefDate()`.
     *
     * @see faker.date.between(): For generating dates in a specific range.
     * @see faker.date.past(): For generating dates explicitly in the past.
     * @see faker.date.future(): For generating dates explicitly in the future.
     *
     * @example
     * faker.date.anytime() // '2022-07-31T01:33:29.567Z'
     *
     * @since 8.0.0
     */
    anytime(options?: {
        /**
         * The date to use as reference point for the newly generated date.
         *
         * @default faker.defaultRefDate()
         */
        refDate?: string | Date | number;
    }): Date;
    /**
     * Generates a random date in the past.
     *
     * @param options The optional options object.
     * @param options.years The range of years the date may be in the past. Defaults to `1`.
     * @param options.refDate The date to use as reference point for the newly generated date. Defaults to `faker.defaultRefDate()`.
     *
     * @see faker.date.recent(): For generating dates in the recent past (days instead of years).
     *
     * @example
     * faker.date.past() // '2021-12-03T05:40:44.408Z'
     * faker.date.past({ years: 10 }) // '2017-10-25T21:34:19.488Z'
     * faker.date.past({ years: 10, refDate: '2020-01-01T00:00:00.000Z' }) // '2017-08-18T02:59:12.350Z'
     *
     * @since 8.0.0
     */
    past(options?: {
        /**
         * The range of years the date may be in the past.
         *
         * @default 1
         */
        years?: number;
        /**
         * The date to use as reference point for the newly generated date.
         *
         * @default faker.defaultRefDate()
         */
        refDate?: string | Date | number;
    }): Date;
    /**
     * Generates a random date in the past.
     *
     * @param years The range of years the date may be in the past. Defaults to `1`.
     * @param refDate The date to use as reference point for the newly generated date. Defaults to `faker.defaultRefDate()`.
     *
     * @see faker.date.recent(): For generating dates in the recent past (days instead of years).
     *
     * @example
     * faker.date.past() // '2021-12-03T05:40:44.408Z'
     * faker.date.past(10) // '2017-10-25T21:34:19.488Z'
     * faker.date.past(10, '2020-01-01T00:00:00.000Z') // '2017-08-18T02:59:12.350Z'
     *
     * @since 2.0.1
     *
     * @deprecated Use `faker.date.past({ years, refDate })` instead.
     */
    past(years?: number, refDate?: string | Date | number): Date;
    /**
     * Generates a random date in the past.
     *
     * @param options The optional options object.
     * @param options.years The range of years the date may be in the past. Defaults to `1`.
     * @param options.refDate The date to use as reference point for the newly generated date. Defaults to `faker.defaultRefDate()`.
     * @param legacyRefDate Deprecated, use `options.refDate` instead.
     *
     * @see faker.date.recent(): For generating dates in the recent past (days instead of years).
     *
     * @example
     * faker.date.past() // '2021-12-03T05:40:44.408Z'
     * faker.date.past({ years: 10 }) // '2017-10-25T21:34:19.488Z'
     * faker.date.past({ years: 10, refDate: '2020-01-01T00:00:00.000Z' }) // '2017-08-18T02:59:12.350Z'
     *
     * @since 8.0.0
     */
    past(options?: number | {
        /**
         * The range of years the date may be in the past.
         *
         * @default 1
         */
        years?: number;
        /**
         * The date to use as reference point for the newly generated date.
         *
         * @default faker.defaultRefDate()
         */
        refDate?: string | Date | number;
    }, legacyRefDate?: string | Date | number): Date;
    /**
     * Generates a random date in the future.
     *
     * @param options The optional options object.
     * @param options.years The range of years the date may be in the future. Defaults to `1`.
     * @param options.refDate The date to use as reference point for the newly generated date. Defaults to `faker.defaultRefDate()`.
     *
     * @see faker.date.soon(): For generating dates in the near future (days instead of years).
     *
     * @example
     * faker.date.future() // '2022-11-19T05:52:49.100Z'
     * faker.date.future({ years: 10 }) // '2030-11-23T09:38:28.710Z'
     * faker.date.future({ years: 10, refDate: '2020-01-01T00:00:00.000Z' }) // '2020-12-13T22:45:10.252Z'
     *
     * @since 8.0.0
     */
    future(options?: {
        /**
         * The range of years the date may be in the future.
         *
         * @default 1
         */
        years?: number;
        /**
         * The date to use as reference point for the newly generated date.
         *
         * @default faker.defaultRefDate()
         */
        refDate?: string | Date | number;
    }): Date;
    /**
     * Generates a random date in the future.
     *
     * @param years The range of years the date may be in the future. Defaults to `1`.
     * @param refDate The date to use as reference point for the newly generated date. Defaults to `faker.defaultRefDate()`.
     *
     * @see faker.date.soon(): For generating dates in the near future (days instead of years).
     *
     * @example
     * faker.date.future() // '2022-11-19T05:52:49.100Z'
     * faker.date.future(10) // '2030-11-23T09:38:28.710Z'
     * faker.date.future(10, '2020-01-01T00:00:00.000Z') // '2020-12-13T22:45:10.252Z'
     *
     * @since 2.0.1
     *
     * @deprecated Use `faker.date.future({ years, refDate })` instead.
     */
    future(years?: number, refDate?: string | Date | number): Date;
    /**
     * Generates a random date in the future.
     *
     * @param options The optional options object.
     * @param options.years The range of years the date may be in the future. Defaults to `1`.
     * @param options.refDate The date to use as reference point for the newly generated date. Defaults to `faker.defaultRefDate()`.
     * @param legacyRefDate Deprecated, use `options.refDate` instead.
     *
     * @see faker.date.soon(): For generating dates in the near future (days instead of years).
     *
     * @example
     * faker.date.future() // '2022-11-19T05:52:49.100Z'
     * faker.date.future({ years: 10 }) // '2030-11-23T09:38:28.710Z'
     * faker.date.future({ years: 10, refDate: '2020-01-01T00:00:00.000Z' }) // '2020-12-13T22:45:10.252Z'
     *
     * @since 8.0.0
     */
    future(options?: number | {
        /**
         * The range of years the date may be in the future.
         *
         * @default 1
         */
        years?: number;
        /**
         * The date to use as reference point for the newly generated date.
         *
         * @default faker.defaultRefDate()
         */
        refDate?: string | Date | number;
    }, legacyRefDate?: string | Date | number): Date;
    /**
     * Generates a random date between the given boundaries.
     *
     * @param options The optional options object.
     * @param options.from The early date boundary.
     * @param options.to The late date boundary.
     *
     * @example
     * faker.date.between({ from: '2020-01-01T00:00:00.000Z', to: '2030-01-01T00:00:00.000Z' }) // '2026-05-16T02:22:53.002Z'
     *
     * @since 8.0.0
     */
    between(options: {
        /**
         * The early date boundary.
         */
        from: string | Date | number;
        /**
         * The late date boundary.
         */
        to: string | Date | number;
    }): Date;
    /**
     * Generates a random date between the given boundaries.
     *
     * @param from The early date boundary.
     * @param to The late date boundary.
     *
     * @example
     * faker.date.between('2020-01-01T00:00:00.000Z', '2030-01-01T00:00:00.000Z') // '2026-05-16T02:22:53.002Z'
     *
     * @since 2.0.1
     *
     * @deprecated Use `faker.date.between({ from, to })` instead.
     */
    between(from: string | Date | number, to: string | Date | number): Date;
    /**
     * Generates a random date between the given boundaries.
     *
     * @param options The optional options object.
     * @param options.from The early date boundary.
     * @param options.to The late date boundary.
     * @param legacyTo Deprecated, use `options.to` instead.
     *
     * @example
     * faker.date.between({ from: '2020-01-01T00:00:00.000Z', to: '2030-01-01T00:00:00.000Z' }) // '2026-05-16T02:22:53.002Z'
     *
     * @since 8.0.0
     */
    between(options: string | Date | number | {
        /**
         * The early date boundary.
         */
        from: string | Date | number;
        /**
         * The late date boundary.
         */
        to: string | Date | number;
    }, legacyTo?: string | Date | number): Date;
    /**
     * Generates random dates between the given boundaries. The dates will be returned in an array sorted in chronological order.
     *
     * @param options The optional options object.
     * @param options.from The early date boundary.
     * @param options.to The late date boundary.
     * @param options.count The number of dates to generate. Defaults to `3`.
     *
     * @example
     * faker.date.betweens({ from: '2020-01-01T00:00:00.000Z', to: '2030-01-01T00:00:00.000Z' })
     * // [
     * //   2022-07-02T06:00:00.000Z,
     * //   2024-12-31T12:00:00.000Z,
     * //   2027-07-02T18:00:00.000Z
     * // ]
     * faker.date.betweens({ from: '2020-01-01T00:00:00.000Z', to: '2030-01-01T00:00:00.000Z', count: 2 })
     * // [ 2023-05-02T16:00:00.000Z, 2026-09-01T08:00:00.000Z ]
     * faker.date.betweens({ from: '2020-01-01T00:00:00.000Z', to: '2030-01-01T00:00:00.000Z', count: { min: 2, max: 5 }})
     * // [
     * //   2021-12-19T06:35:40.191Z,
     * //   2022-09-10T08:03:51.351Z,
     * //   2023-04-19T11:41:17.501Z
     * // ]
     *
     * @since 8.0.0
     */
    betweens(options: {
        /**
         * The early date boundary.
         */
        from: string | Date | number;
        /**
         * The late date boundary.
         */
        to: string | Date | number;
        /**
         * The number of dates to generate.
         *
         * @default 3
         */
        count?: number | {
            /**
             * The minimum number of dates to generate.
             */
            min: number;
            /**
             * The maximum number of dates to generate.
             */
            max: number;
        };
    }): Date[];
    /**
     * Generates random dates between the given boundaries.
     *
     * @param from The early date boundary.
     * @param to The late date boundary.
     * @param count The number of dates to generate. Defaults to `3`.
     * @param count.min The minimum number of dates to generate.
     * @param count.max The maximum number of dates to generate.
     *
     * @example
     * faker.date.betweens('2020-01-01T00:00:00.000Z', '2030-01-01T00:00:00.000Z')
     * // [
     * //   2022-07-02T06:00:00.000Z,
     * //   2024-12-31T12:00:00.000Z,
     * //   2027-07-02T18:00:00.000Z
     * // ]
     * faker.date.betweens('2020-01-01T00:00:00.000Z', '2030-01-01T00:00:00.000Z', 2)
     * // [ 2023-05-02T16:00:00.000Z, 2026-09-01T08:00:00.000Z ]
     *
     * @since 5.4.0
     *
     * @deprecated Use `faker.date.betweens({ from, to, count })` instead.
     */
    betweens(from: string | Date | number, to: string | Date | number, count?: number): Date[];
    /**
     * Generates random dates between the given boundaries.
     *
     * @param options The optional options object.
     * @param options.from The early date boundary.
     * @param options.to The late date boundary.
     * @param options.count The number of dates to generate. Defaults to `3`.
     * @param legacyTo Deprecated, use `options.to` instead.
     * @param legacyCount Deprecated, use `options.count` instead. Defaults to `3`.
     *
     * @example
     * faker.date.betweens({ from: '2020-01-01T00:00:00.000Z', to: '2030-01-01T00:00:00.000Z' })
     * // [
     * //   2022-07-02T06:00:00.000Z,
     * //   2024-12-31T12:00:00.000Z,
     * //   2027-07-02T18:00:00.000Z
     * // ]
     * faker.date.betweens({ from: '2020-01-01T00:00:00.000Z', to: '2030-01-01T00:00:00.000Z', count: 2 })
     * // [ 2023-05-02T16:00:00.000Z, 2026-09-01T08:00:00.000Z ]
     * faker.date.betweens({ from: '2020-01-01T00:00:00.000Z', to: '2030-01-01T00:00:00.000Z', count: { min: 2, max: 5 }})
     * // [
     * //   2021-12-19T06:35:40.191Z,
     * //   2022-09-10T08:03:51.351Z,
     * //   2023-04-19T11:41:17.501Z
     * // ]
     *
     * @since 8.0.0
     */
    betweens(options: string | Date | number | {
        /**
         * The early date boundary.
         */
        from: string | Date | number;
        /**
         * The late date boundary.
         */
        to: string | Date | number;
        /**
         * The number of dates to generate.
         *
         * @default 3
         */
        count?: number | {
            /**
             * The minimum number of dates to generate.
             */
            min: number;
            /**
             * The maximum number of dates to generate.
             */
            max: number;
        };
    }, legacyTo?: string | Date | number, legacyCount?: number): Date[];
    /**
     * Generates a random date in the recent past.
     *
     * @param options The optional options object.
     * @param options.days The range of days the date may be in the past. Defaults to `1`.
     * @param options.refDate The date to use as reference point for the newly generated date. Defaults to `faker.defaultRefDate()`.
     *
     * @see faker.date.past(): For generating dates further back in time (years instead of days).
     *
     * @example
     * faker.date.recent() // '2022-02-04T02:09:35.077Z'
     * faker.date.recent({ days: 10 }) // '2022-01-29T06:12:12.829Z'
     * faker.date.recent({ days: 10, refDate: '2020-01-01T00:00:00.000Z' }) // '2019-12-27T18:11:19.117Z'
     *
     * @since 8.0.0
     */
    recent(options?: {
        /**
         * The range of days the date may be in the past.
         *
         * @default 1
         */
        days?: number;
        /**
         * The date to use as reference point for the newly generated date.
         *
         * @default faker.defaultRefDate()
         */
        refDate?: string | Date | number;
    }): Date;
    /**
     * Generates a random date in the recent past.
     *
     * @param days The range of days the date may be in the past. Defaults to `1`.
     * @param refDate The date to use as reference point for the newly generated date. Defaults to `faker.defaultRefDate()`.
     *
     * @see faker.date.past(): For generating dates further back in time (years instead of days).
     *
     * @example
     * faker.date.recent() // '2022-02-04T02:09:35.077Z'
     * faker.date.recent(10) // '2022-01-29T06:12:12.829Z'
     * faker.date.recent(10, '2020-01-01T00:00:00.000Z') // '2019-12-27T18:11:19.117Z'
     *
     * @since 2.0.1
     *
     * @deprecated Use `faker.date.recent({ days, refDate })` instead.
     */
    recent(days?: number, refDate?: string | Date | number): Date;
    /**
     * Generates a random date in the recent past.
     *
     * @param options The optional options object.
     * @param options.days The range of days the date may be in the past. Defaults to `1`.
     * @param options.refDate The date to use as reference point for the newly generated date. Defaults to `faker.defaultRefDate()`.
     * @param legacyRefDate Deprecated, use `options.refDate` instead.
     *
     * @see faker.date.past(): For generating dates further back in time (years instead of days).
     *
     * @example
     * faker.date.recent() // '2022-02-04T02:09:35.077Z'
     * faker.date.recent({ days: 10 }) // '2022-01-29T06:12:12.829Z'
     * faker.date.recent({ days: 10, refDate: '2020-01-01T00:00:00.000Z' }) // '2019-12-27T18:11:19.117Z'
     *
     * @since 8.0.0
     */
    recent(options?: number | {
        /**
         * The range of days the date may be in the past.
         *
         * @default 1
         */
        days?: number;
        /**
         * The date to use as reference point for the newly generated date.
         *
         * @default faker.defaultRefDate()
         */
        refDate?: string | Date | number;
    }, legacyRefDate?: string | Date | number): Date;
    /**
     * Generates a random date in the near future.
     *
     * @param options The optional options object.
     * @param options.days The range of days the date may be in the future. Defaults to `1`.
     * @param options.refDate The date to use as reference point for the newly generated date. Defaults to `faker.defaultRefDate()`.
     *
     * @see faker.date.future(): For generating dates further in the future (years instead of days).
     *
     * @example
     * faker.date.soon() // '2022-02-05T09:55:39.216Z'
     * faker.date.soon({ days: 10 }) // '2022-02-11T05:14:39.138Z'
     * faker.date.soon({ days: 10, refDate: '2020-01-01T00:00:00.000Z' }) // '2020-01-01T02:40:44.990Z'
     *
     * @since 8.0.0
     */
    soon(options?: {
        /**
         * The range of days the date may be in the future.
         *
         * @default 1
         */
        days?: number;
        /**
         * The date to use as reference point for the newly generated date.
         *
         * @default faker.defaultRefDate()
         */
        refDate?: string | Date | number;
    }): Date;
    /**
     * Generates a random date in the near future.
     *
     * @param days The range of days the date may be in the future. Defaults to `1`.
     * @param refDate The date to use as reference point for the newly generated date. Defaults to `faker.defaultRefDate()`.
     *
     * @see faker.date.future(): For generating dates further in the future (years instead of days).
     *
     * @example
     * faker.date.soon() // '2022-02-05T09:55:39.216Z'
     * faker.date.soon(10) // '2022-02-11T05:14:39.138Z'
     * faker.date.soon(10, '2020-01-01T00:00:00.000Z') // '2020-01-01T02:40:44.990Z'
     *
     * @since 5.0.0
     *
     * @deprecated Use `faker.date.soon({ days, refDate })` instead.
     */
    soon(days?: number, refDate?: string | Date | number): Date;
    /**
     * Generates a random date in the near future.
     *
     * @param options The optional options object.
     * @param options.days The range of days the date may be in the future. Defaults to `1`.
     * @param options.refDate The date to use as reference point for the newly generated date. Defaults to `faker.defaultRefDate()`.
     * @param legacyRefDate Deprecated, use `options.refDate` instead.
     *
     * @see faker.date.future(): For generating dates further in the future (years instead of days).
     *
     * @example
     * faker.date.soon() // '2022-02-05T09:55:39.216Z'
     * faker.date.soon({ days: 10 }) // '2022-02-11T05:14:39.138Z'
     * faker.date.soon({ days: 10, refDate: '2020-01-01T00:00:00.000Z' }) // '2020-01-01T02:40:44.990Z'
     *
     * @since 8.0.0
     */
    soon(options?: number | {
        /**
         * The range of days the date may be in the future.
         *
         * @default 1
         */
        days?: number;
        /**
         * The date to use as reference point for the newly generated date.
         *
         * @default faker.defaultRefDate()
         */
        refDate?: string | Date | number;
    }, legacyRefDate?: string | Date | number): Date;
    /**
     * Returns a random birthdate.
     *
     * @param options The options to use to generate the birthdate. If no options are set, an age between 18 and 80 (inclusive) is generated.
     * @param options.min The minimum age or year to generate a birthdate.
     * @param options.max The maximum age or year to generate a birthdate.
     * @param options.refDate The date to use as reference point for the newly generated date. Defaults to `now`.
     * @param options.mode The mode to generate the birthdate. Supported modes are `'age'` and `'year'` .
     *
     * There are two modes available `'age'` and `'year'`:
     * - `'age'`: The min and max options define the age of the person (e.g. `18` - `42`).
     * - `'year'`: The min and max options define the range the birthdate may be in (e.g. `1900` - `2000`).
     *
     * Defaults to `year`.
     *
     * @example
     * faker.date.birthdate() // 1977-07-10T01:37:30.719Z
     * faker.date.birthdate({ min: 18, max: 65, mode: 'age' }) // 2003-11-02T20:03:20.116Z
     * faker.date.birthdate({ min: 1900, max: 2000, mode: 'year' }) // 1940-08-20T08:53:07.538Z
     *
     * @since 7.0.0
     */
    birthdate(options?: {
        /**
         * The minimum age or year to generate a birthdate.
         *
         * @default 18
         */
        min?: number;
        /**
         * The maximum age or year to generate a birthdate.
         *
         * @default 80
         */
        max?: number;
        /**
         * The mode to generate the birthdate. Supported modes are `'age'` and `'year'` .
         *
         * There are two modes available `'age'` and `'year'`:
         * - `'age'`: The min and max options define the age of the person (e.g. `18` - `42`).
         * - `'year'`: The min and max options define the range the birthdate may be in (e.g. `1900` - `2000`).
         *
         * @default 'year'
         */
        mode?: 'age' | 'year';
        /**
         * The date to use as reference point for the newly generated date.
         *
         * @default faker.defaultRefDate()
         */
        refDate?: string | Date | number;
    }): Date;
}
/**
 * Module to generate dates.
 *
 * ### Overview
 *
 * To quickly generate a date in the past, use [`recent()`](https://fakerjs.dev/api/date.html#recent) (last day) or [`past()`](https://fakerjs.dev/api/date.html#past) (last year).
 * To quickly generate a date in the future, use [`soon()`](https://fakerjs.dev/api/date.html#soon) (next day) or [`future()`](https://fakerjs.dev/api/date.html#future) (next year).
 * For a realistic birthdate for an adult, use [`birthdate()`](https://fakerjs.dev/api/date.html#birthdate).
 *
 * For more control, any of these methods can be customized with further options, or use [`between()`](https://fakerjs.dev/api/date.html#between) to generate a single date between two dates, or [`betweens()`](https://fakerjs.dev/api/date.html#betweens) for multiple dates.
 *
 * You can generate random localized month and weekday names using [`month()`](https://fakerjs.dev/api/date.html#month) and [`weekday()`](https://fakerjs.dev/api/date.html#weekday).
 *
 * These methods have additional concerns about reproducibility, see [Reproducible Results](https://fakerjs.dev/guide/usage.html#reproducible-results).
 */
export declare class DateModule extends SimpleDateModule {
    protected readonly faker: Faker;
    constructor(faker: Faker);
    /**
     * Returns a random name of a month.
     *
     * @param options The optional options to use.
     * @param options.abbreviated Whether to return an abbreviation. Defaults to `false`.
     * @param options.context Whether to return the name of a month in the context of a date. In the default `en` locale this has no effect, however, in other locales like `fr` or `ru`, this may affect grammar or capitalization, for example `'январь'` with `{ context: false }` and `'января'` with `{ context: true }` in `ru`. Defaults to `false`.
     *
     * @example
     * faker.date.month() // 'October'
     * faker.date.month({ abbreviated: true }) // 'Feb'
     * faker.date.month({ context: true }) // 'June'
     * faker.date.month({ abbreviated: true, context: true }) // 'Sep'
     *
     * @since 3.0.1
     */
    month(options?: {
        /**
         * Whether to return an abbreviation.
         *
         * @default false
         */
        abbreviated?: boolean;
        /**
         * Whether to return the name of a month in the context of a date.
         *
         * In the default `en` locale this has no effect,
         * however, in other locales like `fr` or `ru`, this may affect grammar or capitalization,
         * for example `'январь'` with `{ context: false }` and `'января'` with `{ context: true }` in `ru`.
         *
         * @default false
         */
        context?: boolean;
    }): string;
    /**
     * Returns a random name of a month.
     *
     * @param options The optional options to use.
     * @param options.abbr Deprecated, use `abbreviated` instead.
     * @param options.context Whether to return the name of a month in the context of a date. In the default `en` locale this has no effect, however, in other locales like `fr` or `ru`, this may affect grammar or capitalization, for example `'январь'` with `{ context: false }` and `'января'` with `{ context: true }` in `ru`. Defaults to `false`.
     *
     * @example
     * faker.date.month() // 'October'
     * faker.date.month({ abbr: true }) // 'Feb'
     * faker.date.month({ context: true }) // 'June'
     * faker.date.month({ abbr: true, context: true }) // 'Sep'
     *
     * @since 3.0.1
     *
     * @deprecated Use `faker.date.month({ abbreviated, ... })` instead.
     */
    month(options?: {
        /**
         * Whether to return an abbreviation.
         *
         * @default false
         *
         * @deprecated Use `abbreviated` instead.
         */
        abbr?: boolean;
        /**
         * Whether to return the name of a month in the context of a date.
         *
         * In the default `en` locale this has no effect,
         * however, in other locales like `fr` or `ru`, this may affect grammar or capitalization,
         * for example `'январь'` with `{ context: false }` and `'января'` with `{ context: true }` in `ru`.
         *
         * @default false
         */
        context?: boolean;
    }): string;
    /**
     * Returns a random name of a month.
     *
     * @param options The optional options to use.
     * @param options.abbr Deprecated, use `abbreviated` instead.
     * @param options.abbreviated Whether to return an abbreviation. Defaults to `false`.
     * @param options.context Whether to return the name of a month in the context of a date. In the default `en` locale this has no effect, however, in other locales like `fr` or `ru`, this may affect grammar or capitalization, for example `'январь'` with `{ context: false }` and `'января'` with `{ context: true }` in `ru`. Defaults to `false`.
     *
     * @example
     * faker.date.month() // 'October'
     * faker.date.month({ abbreviated: true }) // 'Feb'
     * faker.date.month({ context: true }) // 'June'
     * faker.date.month({ abbreviated: true, context: true }) // 'Sep'
     *
     * @since 3.0.1
     */
    month(options?: {
        /**
         * Whether to return an abbreviation.
         *
         * @default false
         *
         * @deprecated Use `abbreviated` instead.
         */
        abbr?: boolean;
        /**
         * Whether to return an abbreviation.
         *
         * @default false
         */
        abbreviated?: boolean;
        /**
         * Whether to return the name of a month in the context of a date.
         *
         * In the default `en` locale this has no effect,
         * however, in other locales like `fr` or `ru`, this may affect grammar or capitalization,
         * for example `'январь'` with `{ context: false }` and `'января'` with `{ context: true }` in `ru`.
         *
         * @default false
         */
        context?: boolean;
    }): string;
    /**
     * Returns a random day of the week.
     *
     * @param options The optional options to use.
     * @param options.abbreviated Whether to return an abbreviation. Defaults to `false`.
     * @param options.context Whether to return the day of the week in the context of a date. In the default `en` locale this has no effect, however, in other locales like `fr` or `ru`, this may affect grammar or capitalization, for example `'Lundi'` with `{ context: false }` and `'lundi'` with `{ context: true }` in `fr`. Defaults to `false`.
     *
     * @example
     * faker.date.weekday() // 'Monday'
     * faker.date.weekday({ abbreviated: true }) // 'Thu'
     * faker.date.weekday({ context: true }) // 'Thursday'
     * faker.date.weekday({ abbreviated: true, context: true }) // 'Fri'
     *
     * @since 3.0.1
     */
    weekday(options?: {
        /**
         * Whether to return an abbreviation.
         *
         * @default false
         */
        abbreviated?: boolean;
        /**
         * Whether to return the day of the week in the context of a date.
         *
         * In the default `en` locale this has no effect,
         * however, in other locales like `fr` or `ru`, this may affect grammar or capitalization,
         * for example `'Lundi'` with `{ context: false }` and `'lundi'` with `{ context: true }` in `fr`.
         *
         * @default false
         */
        context?: boolean;
    }): string;
    /**
     * Returns a random day of the week.
     *
     * @param options The optional options to use.
     * @param options.abbr Deprecated, use `abbreviated` instead.
     * @param options.abbreviated Whether to return an abbreviation. Defaults to `false`.
     * @param options.context Whether to return the day of the week in the context of a date. In the default `en` locale this has no effect, however, in other locales like `fr` or `ru`, this may affect grammar or capitalization, for example `'Lundi'` with `{ context: false }` and `'lundi'` with `{ context: true }` in `fr`. Defaults to `false`.
     *
     * @example
     * faker.date.weekday() // 'Monday'
     * faker.date.weekday({ abbr: true }) // 'Thu'
     * faker.date.weekday({ context: true }) // 'Thursday'
     * faker.date.weekday({ abbr: true, context: true }) // 'Fri'
     *
     * @since 3.0.1
     *
     * @deprecated Use `faker.date.weekday({ abbreviated, ... })` instead.
     */
    weekday(options?: {
        /**
         * Whether to return an abbreviation.
         *
         * @default false
         *
         * @deprecated Use `abbreviated` instead.
         */
        abbr?: boolean;
        /**
         * Whether to return the day of the week in the context of a date.
         *
         * In the default `en` locale this has no effect,
         * however, in other locales like `fr` or `ru`, this may affect grammar or capitalization,
         * for example `'Lundi'` with `{ context: false }` and `'lundi'` with `{ context: true }` in `fr`.
         *
         * @default false
         */
        context?: boolean;
    }): string;
    /**
     * Returns a random day of the week.
     *
     * @param options The optional options to use.
     * @param options.abbr Deprecated, use `abbreviated` instead.
     * @param options.abbreviated Whether to return an abbreviation. Defaults to `false`.
     * @param options.context Whether to return the day of the week in the context of a date. In the default `en` locale this has no effect, however, in other locales like `fr` or `ru`, this may affect grammar or capitalization, for example `'Lundi'` with `{ context: false }` and `'lundi'` with `{ context: true }` in `fr`. Defaults to `false`.
     *
     * @example
     * faker.date.weekday() // 'Monday'
     * faker.date.weekday({ abbreviated: true }) // 'Thu'
     * faker.date.weekday({ context: true }) // 'Thursday'
     * faker.date.weekday({ abbreviated: true, context: true }) // 'Fri'
     *
     * @since 3.0.1
     */
    weekday(options?: {
        /**
         * Whether to return an abbreviation.
         *
         * @default false
         *
         * @deprecated Use `abbreviated` instead.
         */
        abbr?: boolean;
        /**
         * Whether to return an abbreviation.
         *
         * @default false
         */
        abbreviated?: boolean;
        /**
         * Whether to return the day of the week in the context of a date.
         *
         * In the default `en` locale this has no effect,
         * however, in other locales like `fr` or `ru`, this may affect grammar or capitalization,
         * for example `'Lundi'` with `{ context: false }` and `'lundi'` with `{ context: true }` in `fr`.
         *
         * @default false
         */
        context?: boolean;
    }): string;
}
