import { NumberingSystem } from './misc';
import { ConversionAccuracy } from './datetime';

export interface DurationOptions {
    locale?: string | undefined;
    numberingSystem?: NumberingSystem | undefined;
    conversionAccuracy?: ConversionAccuracy | undefined;
}

export interface DurationObjectUnits {
    years?: number | undefined;
    quarters?: number | undefined;
    months?: number | undefined;
    weeks?: number | undefined;
    days?: number | undefined;
    hours?: number | undefined;
    minutes?: number | undefined;
    seconds?: number | undefined;
    milliseconds?: number | undefined;
}

export interface DurationLikeObject extends DurationObjectUnits {
    year?: number | undefined;
    quarter?: number | undefined;
    month?: number | undefined;
    week?: number | undefined;
    day?: number | undefined;
    hour?: number | undefined;
    minute?: number | undefined;
    second?: number | undefined;
    millisecond?: number | undefined;
}

export type DurationUnit = keyof DurationLikeObject;
export type DurationUnits = DurationUnit | DurationUnit[];

export type ToISOFormat = 'basic' | 'extended';

export interface ToISOTimeDurationOptions {
    /**
     * Include the `T` prefix
     * @default false
     */
    includePrefix?: boolean | undefined;
    /**
     * Exclude milliseconds from the format if they're 0
     * @default false
     */
    suppressMilliseconds?: boolean | undefined;
    /**
     * Exclude seconds from the format if they're 0
     * @default false
     */
    suppressSeconds?: boolean | undefined;
    /**
     * Choose between the basic and extended format
     * @default 'extended'
     */
    format?: ToISOFormat | undefined;
}

export interface ToHumanDurationOptions extends Intl.NumberFormatOptions {
    listStyle?: 'long' | 'short' | 'narrow' | undefined;
}

/**
 * Either a Luxon Duration, a number of milliseconds, the object argument to Duration.fromObject()
 *
 * @deprecated Use DurationLike instead.
 */
export type DurationInput = Duration | number | DurationLikeObject;

/**
 * Either a Luxon Duration, a number of milliseconds, the object argument to Duration.fromObject()
 */
export type DurationLike = Duration | DurationLikeObject | number;

/**
 * A Duration object represents a period of time, like "2 months" or "1 day, 1 hour".
 * Conceptually, it's just a map of units to their quantities, accompanied by some additional configuration and methods for creating, parsing, interrogating, transforming, and formatting them.
 * They can be used on their own or in conjunction with other Luxon types; for example, you can use {@link DateTime.plus} to add a Duration object to a DateTime, producing another DateTime.
 *
 * Here is a brief overview of commonly used methods and getters in Duration:
 *
 * * **Creation** To create a Duration, use {@link Duration.fromMillis}, {@link Duration.fromObject}, or {@link Duration.fromISO}.
 * * **Unit values** See the {@link Duration#years}, {@link Duration.months}, {@link Duration#weeks}, {@link Duration#days}, {@link Duration#hours}, {@link Duration#minutes},
 * * {@link Duration#seconds}, {@link Duration#milliseconds} accessors.
 * * **Configuration** See  {@link Duration#locale} and {@link Duration#numberingSystem} accessors.
 * * **Transformation** To create new Durations out of old ones use {@link Duration#plus}, {@link Duration#minus}, {@link Duration#normalize}, {@link Duration#set}, {@link Duration#reconfigure},
 * * {@link Duration#shiftTo}, and {@link Duration#negate}.
 * * **Output** To convert the Duration into other representations, see {@link Duration#as}, {@link Duration#toISO}, {@link Duration#toFormat}, and {@link Duration#toJSON}
 *
 * There's are more methods documented below. In addition, for more information on subtler topics like internationalization and validity, see the external documentation.
 */
export class Duration {
    /**
     * Create Duration from a number of milliseconds.
     *
     * @param count - of milliseconds
     * @param opts - options for parsing
     * @param opts.locale - the locale to use
     * @param opts.numberingSystem - the numbering system to use
     * @param opts.conversionAccuracy - the conversion system to use
     */
    static fromMillis(count: number, opts?: DurationOptions): Duration;

    /**
     * Create a Duration from a JavaScript object with keys like 'years' and 'hours'.
     * If this object is empty then a zero milliseconds duration is returned.
     *
     * @param obj - the object to create the Duration from
     * @param obj.years
     * @param obj.quarters
     * @param obj.months
     * @param obj.weeks
     * @param obj.days
     * @param obj.hours
     * @param obj.minutes
     * @param obj.seconds
     * @param obj.milliseconds
     * @param opts - options for creating this Duration. Defaults to {}.
     * @param opts.locale - the locale to use. Defaults to 'en-US'.
     * @param opts.numberingSystem - the numbering system to use
     * @param opts.conversionAccuracy - the conversion system to use. Defaults to 'casual'.
     */
    static fromObject(obj: DurationLikeObject, opts?: DurationOptions): Duration;

    /**
     * Create a Duration from DurationLike.
     *
     * @param durationLike
     * Either a Luxon Duration, a number of milliseconds, or the object argument to Duration.fromObject()
     */
    static fromDurationLike(durationLike: DurationLike): Duration;

    /**
     * Create a Duration from an ISO 8601 duration string.
     * @see https://en.wikipedia.org/wiki/ISO_8601#Durations
     *
     * @param text - text to parse
     * @param opts - options for parsing
     * @param opts.locale - the locale to use. Defaults to 'en-US'.
     * @param opts.numberingSystem - the numbering system to use
     * @param opts.conversionAccuracy - the conversion system to use. Defaults to 'casual'.
     *
     * @example
     * Duration.fromISO('P3Y6M1W4DT12H30M5S').toObject() //=> { years: 3, months: 6, weeks: 1, days: 4, hours: 12, minutes: 30, seconds: 5 }
     * @example
     * Duration.fromISO('PT23H').toObject() //=> { hours: 23 }
     * @example
     * Duration.fromISO('P5Y3M').toObject() //=> { years: 5, months: 3 }
     */
    static fromISO(text: string, opts?: DurationOptions): Duration;

    /**
     * Create a Duration from an ISO 8601 time string.
     * @see https://en.wikipedia.org/wiki/ISO_8601#Times
     *
     * @param text - text to parse
     * @param opts - options for parsing
     * @param opts.locale - the locale to use. Defaults to 'en-US'.
     * @param opts.numberingSystem - the numbering system to use
     * @param opts.conversionAccuracy - the conversion system to use. Defaults to 'casual'.
     *
     * @example
     * Duration.fromISOTime('11:22:33.444').toObject() //=> { hours: 11, minutes: 22, seconds: 33, milliseconds: 444 }
     * @example
     * Duration.fromISOTime('11:00').toObject() //=> { hours: 11, minutes: 0, seconds: 0 }
     * @example
     * Duration.fromISOTime('T11:00').toObject() //=> { hours: 11, minutes: 0, seconds: 0 }
     * @example
     * Duration.fromISOTime('1100').toObject() //=> { hours: 11, minutes: 0, seconds: 0 }
     * @example
     * Duration.fromISOTime('T1100').toObject() //=> { hours: 11, minutes: 0, seconds: 0 }
     */
    static fromISOTime(text: string, opts?: DurationOptions): Duration;

    /**
     * Create an invalid Duration.
     *
     * @param reason - simple string of why this datetime is invalid. Should not contain parameters or anything else data-dependent
     * @param explanation - longer explanation, may include parameters and other useful debugging information. Defaults to null.
     */
    static invalid(reason: string, explanation?: string): Duration;

    /**
     * Check if an object is a Duration. Works across context boundaries
     *
     * @param o
     */
    static isDuration(o: unknown): o is Duration;

    private constructor(config: unknown);

    /**
     * Get  the locale of a Duration, such 'en-GB'
     */
    get locale(): string;

    /**
     * Get the numbering system of a Duration, such 'beng'. The numbering system is used when formatting the Duration
     */
    get numberingSystem(): string;

    /**
     * Returns a string representation of this Duration formatted according to the specified format string. You may use these tokens:
     * * `S` for milliseconds
     * * `s` for seconds
     * * `m` for minutes
     * * `h` for hours
     * * `d` for days
     * * `M` for months
     * * `y` for years
     * Notes:
     * * Add padding by repeating the token, e.g. "yy" pads the years to two digits, "hhhh" pads the hours out to four digits
     * * The duration will be converted to the set of units in the format string using {@link Duration.shiftTo} and the Durations's conversion accuracy setting.
     *
     * @param fmt - the format string
     * @param opts - options
     * @param opts.floor - floor numerical values. Defaults to true.
     *
     * @example
     * Duration.fromObject({ years: 1, days: 6, seconds: 2 }).toFormat("y d s") //=> "1 6 2"
     * @example
     * Duration.fromObject({ years: 1, days: 6, seconds: 2 }).toFormat("yy dd sss") //=> "01 06 002"
     * @example
     * Duration.fromObject({ years: 1, days: 6, seconds: 2 }).toFormat("M S") //=> "12 518402000"
     */
    toFormat(fmt: string, opts?: { floor?: boolean | undefined }): string;

    /**
     * Returns a string representation of a Duration with all units included
     * To modify its behavior use the `listStyle` and any Intl.NumberFormat option, though `unitDisplay` is especially relevant. See {@link Intl.NumberFormat}.
     * @param opts - On option object to override the formatting. Accepts the same keys as the options parameter of the native `Int.NumberFormat` constructor, as well as `listStyle`.
     * @example
     * ```js
     * var dur = Duration.fromObject({ days: 1, hours: 5, minutes: 6 })
     * dur.toHuman() //=> '1 day, 5 hours, 6 minutes'
     * dur.toHuman({ listStyle: "long" }) //=> '1 day, 5 hours, and 6 minutes'
     * dur.toHuman({ unitDisplay: "short" }) //=> '1 day, 5 hr, 6 min'
     * ```
     */
    toHuman(opts?: ToHumanDurationOptions): string;

    /**
     * Returns a JavaScript object with this Duration's values.
     *
     * @example
     * Duration.fromObject({ years: 1, days: 6, seconds: 2 }).toObject() //=> { years: 1, days: 6, seconds: 2 }
     */
    toObject(): DurationObjectUnits;

    /**
     * Returns an ISO 8601-compliant string representation of this Duration.
     * @see https://en.wikipedia.org/wiki/ISO_8601#Durations
     *
     * @example
     * Duration.fromObject({ years: 3, seconds: 45 }).toISO() //=> 'P3YT45S'
     * @example
     * Duration.fromObject({ months: 4, seconds: 45 }).toISO() //=> 'P4MT45S'
     * @example
     * Duration.fromObject({ months: 5 }).toISO() //=> 'P5M'
     * @example
     * Duration.fromObject({ minutes: 5 }).toISO() //=> 'PT5M'
     * @example
     * Duration.fromObject({ milliseconds: 6 }).toISO() //=> 'PT0.006S'
     */
    toISO(): string;

    /**
     * Returns an ISO 8601-compliant string representation of this Duration, formatted as a time of day.
     * @see https://en.wikipedia.org/wiki/ISO_8601#Times
     *
     * @param opts - options
     * @param opts.suppressMilliseconds - exclude milliseconds from the format if they're 0. Defaults to false.
     * @param opts.suppressSeconds - exclude seconds from the format if they're 0. Defaults to false.
     * @param opts.includePrefix - include the `T` prefix. Defaults to false.
     * @param opts.format - choose between the basic and extended format. Defaults to 'extended'.
     *
     * @example
     * Duration.fromObject({ hours: 11 }).toISOTime() //=> '11:00:00.000'
     * @example
     * Duration.fromObject({ hours: 11 }).toISOTime({ suppressMilliseconds: true }) //=> '11:00:00'
     * @example
     * Duration.fromObject({ hours: 11 }).toISOTime({ suppressSeconds: true }) //=> '11:00'
     * @example
     * Duration.fromObject({ hours: 11 }).toISOTime({ includePrefix: true }) //=> 'T11:00:00.000'
     * @example
     * Duration.fromObject({ hours: 11 }).toISOTime({ format: 'basic' }) //=> '110000.000'
     */
    toISOTime(opts?: ToISOTimeDurationOptions): string;

    /**
     * Returns an ISO 8601 representation of this Duration appropriate for use in JSON.
     */
    toJSON(): string;

    /**
     * Returns an ISO 8601 representation of this Duration appropriate for use in debugging.
     */
    toString(): string;

    /**
     * Returns an milliseconds value of this Duration.
     */
    toMillis(): number;

    /**
     * Returns an milliseconds value of this Duration. Alias of {@link toMillis}
     */
    valueOf(): number;

    /**
     * Make this Duration longer by the specified amount. Return a newly-constructed Duration.
     *
     * @param duration - The amount to add. Either a Luxon Duration, a number of milliseconds, the object argument to Duration.fromObject()
     */
    plus(duration: DurationLike): Duration;

    /**
     * Make this Duration shorter by the specified amount. Return a newly-constructed Duration.
     *
     * @param duration - The amount to subtract. Either a Luxon Duration, a number of milliseconds, the object argument to Duration.fromObject()
     */
    minus(duration: DurationLike): Duration;

    /**
     * Scale this Duration by the specified amount. Return a newly-constructed Duration.
     *
     * @example
     * Duration.fromObject({ hours: 1, minutes: 30 }).mapUnit(x => x * 2) //=> { hours: 2, minutes: 60 }
     * @example
     * Duration.fromObject({ hours: 1, minutes: 30 }).mapUnit((x, u) => u === "hour" ? x * 2 : x) //=> { hours: 2, minutes: 30 }
     */
    mapUnits(fn: (x: number, u?: DurationUnit) => number): Duration;

    /**
     * Get the value of unit.
     *
     * @param unit - a unit such as 'minute' or 'day'
     *
     * @example
     * Duration.fromObject({years: 2, days: 3}).get('years') //=> 2
     * @example
     * Duration.fromObject({years: 2, days: 3}).get('months') //=> 0
     * @example
     * Duration.fromObject({years: 2, days: 3}).get('days') //=> 3
     */
    get(unit: DurationUnit): number;

    /**
     * "Set" the values of specified units. Return a newly-constructed Duration.
     *
     * @param values - a mapping of units to numbers
     *
     * @example
     * dur.set({ years: 2017 })
     * @example
     * dur.set({ hours: 8, minutes: 30 })
     */
    set(values: DurationLikeObject): Duration;

    /**
     * "Set" the locale and/or numberingSystem.  Returns a newly-constructed Duration.
     *
     * @example
     * dur.reconfigure({ locale: 'en-GB' })
     */
    reconfigure(opts?: DurationOptions): Duration;

    /**
     * Return the length of the duration in the specified unit.
     *
     * @param unit - a unit such as 'minutes' or 'days'
     *
     * @example
     * Duration.fromObject({years: 1}).as('days') //=> 365
     * @example
     * Duration.fromObject({years: 1}).as('months') //=> 12
     * @example
     * Duration.fromObject({hours: 60}).as('days') //=> 2.5
     */
    as(unit: DurationUnit): number;

    /**
     * Reduce this Duration to its canonical representation in its current units.
     *
     * @example
     * Duration.fromObject({ years: 2, days: 5000 }).normalize().toObject() //=> { years: 15, days: 255 }
     * @example
     * Duration.fromObject({ hours: 12, minutes: -45 }).normalize().toObject() //=> { hours: 11, minutes: 15 }
     */
    normalize(): Duration;

    /**
     * Rescale units to its largest representation.
     *
     * @example
     * Duration.fromObject({ milliseconds: 90000 }).rescale().toObject() //=> { minutes: 1, seconds: 30 }
     */
    rescale(): Duration;

    /**
     * Convert this Duration into its representation in a different set of units.
     *
     * @example
     * Duration.fromObject({ hours: 1, seconds: 30 }).shiftTo('minutes', 'milliseconds').toObject() //=> { minutes: 60, milliseconds: 30000 }
     */
    shiftTo(...units: DurationUnit[]): Duration;

    /**
     * Shift this Duration to all available units.
     * Same as shiftTo("years", "months", "weeks", "days", "hours", "minutes", "seconds", "milliseconds")
     */
    shiftToAll(): Duration;

    /**
     * Return the negative of this Duration.
     *
     * @example
     * Duration.fromObject({ hours: 1, seconds: 30 }).negate().toObject() //=> { hours: -1, seconds: -30 }
     */
    negate(): Duration;

    /**
     * Get the years.
     */
    get years(): number;

    /**
     * Get the quarters.
     */
    get quarters(): number;

    /**
     * Get the months.
     */
    get months(): number;

    /**
     * Get the weeks
     */
    get weeks(): number;

    /**
     * Get the days.
     */
    get days(): number;

    /**
     * Get the hours.
     */
    get hours(): number;

    /**
     * Get the minutes.
     */
    get minutes(): number;

    /**
     * Get the seconds.
     */
    get seconds(): number;

    /**
     * Get the milliseconds.
     */
    get milliseconds(): number;

    /**
     * Returns whether the Duration is invalid. Invalid durations are returned by diff operations
     * on invalid DateTimes or Intervals.
     */
    get isValid(): boolean;

    /**
     * Returns an error code if this Duration became invalid, or null if the Duration is valid
     */
    get invalidReason(): string;

    /**
     * Returns an explanation of why this Duration became invalid, or null if the Duration is valid
     */
    get invalidExplanation(): string;

    /**
     * Equality check
     * Two Durations are equal iff they have the same units and the same values for each unit.
     *
     * @param other
     */
    equals(other: Duration): boolean;
}
