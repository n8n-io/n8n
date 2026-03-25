import { CanBeInvalid, DefaultValidity, IfValid, Invalid, Valid } from "./_util";
import {
    _UseLocaleWeekOption,
    DateObjectUnits,
    DateTime,
    DateTimeOptions,
    DiffOptions,
    LocaleOptions,
    ToISOTimeOptions,
} from "./datetime";
import { Duration, DurationLike, DurationMaybeValid, DurationUnit } from "./duration";

export interface IntervalObject {
    start?: DateTime | undefined;
    end?: DateTime | undefined;
}

export type DateInput = DateTime | DateObjectUnits | Date;

export type IntervalMaybeValid = CanBeInvalid extends true ? (Interval<Valid> | Interval<Invalid>) : Interval;

export type CountOptions = _UseLocaleWeekOption;

/**
 * An Interval object represents a half-open interval of time, where each endpoint is a {@link DateTime}.
 * Conceptually, it is a container for those two endpoints, accompanied by methods for
 * creating, parsing, interrogating, comparing, transforming, and formatting them.
 *
 * Here is a brief overview of the most commonly used methods and getters in Interval:
 *
 * * **Creation** To create an Interval, use {@link Interval.fromDateTimes}, {@link Interval.after}, {@link Interval.before}, or {@link Interval.fromISO}.
 * * **Accessors** Use {@link Interval#start} and {@link Interval#end} to get the start and end.
 * * **Interrogation** To analyze the Interval, use {@link Interval#count}, {@link Interval#length}, {@link Interval#hasSame},
 * * {@link Interval#contains}, {@link Interval#isAfter}, or {@link Interval#isBefore}.
 * * **Transformation** To create other Intervals out of this one, use {@link Interval#set}, {@link Interval#splitAt}, {@link Interval#splitBy}, {@link Interval#divideEqually},
 * * {@link Interval.merge}, {@link Interval.xor}, {@link Interval#union}, {@link Interval#intersection}, or {@link Interval#difference}.
 * * **Comparison** To compare this Interval to another one, use {@link Interval#equals}, {@link Interval#overlaps}, {@link Interval#abutsStart}, {@link Interval#abutsEnd}, {@link Interval#engulfs}
 * * **Output** To convert the Interval into other representations, see {@link Interval#toString}, {@link Interval#toLocaleString}, {@link Interval#toISO}, {@link Interval#toISODate},
 * * {@link Interval#toISOTime}, {@link Interval#toFormat}, and {@link Interval#toDuration}.
 */
export class Interval<IsValid extends boolean = DefaultValidity> {
    /**
     * Create an invalid Interval.
     *
     * @param reason - simple string of why this Interval is invalid. Should not contain parameters or anything else data-dependent
     * @param explanation - longer explanation, may include parameters and other useful debugging information.
     */
    static invalid(reason: string, explanation?: string): Interval<Invalid>;

    /**
     * Create an Interval from a start DateTime and an end DateTime. Inclusive of the start but not the end.
     *
     * @param start
     * @param end
     */
    static fromDateTimes(start: DateInput, end: DateInput): IntervalMaybeValid;

    /**
     * Create an Interval from a start DateTime and a Duration to extend to.
     *
     * @param start
     * @param duration - the length of the Interval.
     */
    static after(start: DateInput, duration: DurationLike): IntervalMaybeValid;

    /**
     * Create an Interval from an end DateTime and a Duration to extend backwards to.
     *
     * @param end
     * @param duration - the length of the Interval.
     */
    static before(end: DateInput, duration: DurationLike): IntervalMaybeValid;

    /**
     * Create an Interval from an ISO 8601 string.
     * Accepts `<start>/<end>`, `<start>/<duration>`, and `<duration>/<end>` formats.
     * @see https://en.wikipedia.org/wiki/ISO_8601#Time_intervals
     *
     * @param text - the ISO string to parse
     * @param opts - options to pass {@link DateTime.fromISO} and optionally {@link Duration.fromISO}
     */
    static fromISO(text: string, opts?: DateTimeOptions): IntervalMaybeValid;

    /**
     * Check if an object is an Interval. Works across context boundaries
     *
     * @param o
     */
    static isInterval(o: unknown): o is IntervalMaybeValid;

    private constructor(config: unknown);

    /**
     * Returns the start of the Interval
     */
    get start(): IfValid<DateTime<Valid>, null, IsValid>;

    /**
     * Returns the end of the Interval. This is the first instant which is not part of the interval.
     * (Interval is half-open).
     */
    get end(): IfValid<DateTime<Valid>, null, IsValid>;

    /**
     * Returns the last DateTime included in the interval (since end is not part of the interval)
     */
    get lastDateTime(): IfValid<DateTime<Valid>, null, IsValid>;

    /**
     * Returns whether this Interval's end is at least its start, meaning that the Interval isn't 'backwards'.
     */
    get isValid(): IfValid<true, false, IsValid>;

    /**
     * Returns an error code if this Interval is invalid, or null if the Interval is valid
     */
    get invalidReason(): IfValid<null, string, IsValid>;

    /**
     * Returns an explanation of why this Interval became invalid, or null if the Interval is valid
     */
    get invalidExplanation(): IfValid<null, string | null, IsValid>;

    /**
     * Returns the length of the Interval in the specified unit.
     *
     * @param unit - the unit (such as 'hours' or 'days') to return the length in.
     */
    length(unit?: DurationUnit): IfValid<number, typeof NaN, IsValid>;

    /**
     * Returns the count of minutes, hours, days, months, or years included in the Interval, even in part.
     * Unlike {@link Interval#length} this counts sections of the calendar, not periods of time, e.g. specifying 'day'
     * asks 'what dates are included in this interval?', not 'how many days long is this interval?'
     *
     * @param unit - the unit of time to count. Defaults to 'milliseconds'.
     */
    count(unit?: DurationUnit, opts?: CountOptions): IfValid<number, typeof NaN, IsValid>;

    /**
     * Returns whether this Interval's start and end are both in the same unit of time
     *
     * @param unit - the unit of time to check sameness on
     */
    hasSame(unit: DurationUnit): IfValid<boolean, false, IsValid>;

    /**
     * Return whether this Interval has the same start and end DateTimes.
     */
    isEmpty(): boolean;

    /**
     * Return whether this Interval's start is after the specified DateTime.
     *
     * @param dateTime
     */
    isAfter(dateTime: DateTime): IfValid<boolean, false, IsValid>;

    /**
     * Return whether this Interval's end is before the specified DateTime.
     *
     * @param dateTime
     */
    isBefore(dateTime: DateTime): IfValid<boolean, false, IsValid>;

    /**
     * Return whether this Interval contains the specified DateTime.
     *
     * @param dateTime
     */
    contains(dateTime: DateTime): IfValid<boolean, false, IsValid>;

    /**
     * "Sets" the start and/or end dates. Returns a newly-constructed Interval.
     *
     * @param values - the values to set
     * @param values.start - the starting DateTime
     * @param values.end - the ending DateTime
     */
    set(values?: IntervalObject): IntervalMaybeValid;

    /**
     * Split this Interval at each of the specified DateTimes
     *
     * @param dateTimes - the unit of time to count.
     */
    splitAt(...dateTimes: DateTime[]): IfValid<Interval[], [], IsValid>;

    /**
     * Split this Interval into smaller Intervals, each of the specified length.
     * Left over time is grouped into a smaller interval
     *
     * @param duration - The length of each resulting interval.
     */
    splitBy(duration: DurationLike): IfValid<Interval[], [], IsValid>;

    /**
     * Split this Interval into the specified number of smaller intervals.
     *
     * @param numberOfParts - The number of Intervals to divide the Interval into.
     */
    divideEqually(numberOfParts: number): IfValid<Interval[], [], IsValid>;

    /**
     * Return whether this Interval overlaps with the specified Interval
     */
    overlaps(other: Interval): boolean;

    /**
     * Return whether this Interval's end is adjacent to the specified Interval's start.
     */
    abutsStart(other: Interval): IfValid<boolean, false, IsValid>;

    /**
     * Return whether this Interval's start is adjacent to the specified Interval's end.
     */
    abutsEnd(other: Interval): IfValid<boolean, false, IsValid>;

    /**
     * Return whether this Interval engulfs the start and end of the specified Interval.
     */
    engulfs(other: Interval): IfValid<boolean, false, IsValid>;

    /**
     * Return whether this Interval has the same start and end as the specified Interval.
     */
    equals(other: Interval): IfValid<boolean, false, IsValid>;

    /**
     * Return an Interval representing the intersection of this Interval and the specified Interval.
     * Specifically, the resulting Interval has the maximum start time and the minimum end time of the two Intervals.
     * Returns null if the intersection is empty, meaning the intervals do not intersect.
     */
    intersection(other: Interval): Interval | null;

    /**
     * Return an Interval representing the union of this Interval and the specified Interval.
     * Specifically, the resulting Interval has the minimum start time and the maximum end time of the two Intervals.
     */
    union(other: Interval): IntervalMaybeValid;

    /**
     * Merge an array of Intervals into an equivalent minimal set of Intervals.
     * Combines overlapping and adjacent Intervals.
     */
    static merge(intervals: Interval[]): IntervalMaybeValid[];

    /**
     * Return an array of Intervals representing the spans of time that only appear in one of the specified Intervals.
     */
    static xor(intervals: Interval[]): IntervalMaybeValid[];

    /**
     * Return Intervals representing the spans of time in this Interval that not overlap with any of the specified Intervals.
     */
    difference(...intervals: Interval[]): IntervalMaybeValid[];

    /**
     * Returns a string representation of this Interval appropriate for debugging.
     */
    toString(): IfValid<string, "Invalid Interval", IsValid>;

    /**
     * Returns a localized string representing this Interval. Accepts the same options as the
     * Intl.DateTimeFormat constructor and any presets defined by Luxon, such as
     * {@link DateTime.DATE_FULL} or {@link DateTime.TIME_SIMPLE}. The exact behavior of this method
     * is browser-specific, but in general it will return an appropriate representation of the
     * Interval in the assigned locale. Defaults to the system's locale if no locale has been
     * specified.
     * @see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/DateTimeFormat
     * @param formatOpts - Either a DateTime preset or Intl.DateTimeFormat constructor options. Defaults to DateTime.DATE_SHORT
     * @param opts - Options to override the configuration of the start DateTime.
     *
     * @example
     * Interval.fromISO('2022-11-07T09:00Z/2022-11-08T09:00Z').toLocaleString(); //=> 11/7/2022 – 11/8/2022
     * @example
     * Interval.fromISO('2022-11-07T09:00Z/2022-11-08T09:00Z').toLocaleString(DateTime.DATE_FULL); //=> November 7 – 8, 2022
     * @example
     * Interval.fromISO('2022-11-07T09:00Z/2022-11-08T09:00Z').toLocaleString(DateTime.DATE_FULL, { locale: 'fr-FR' }); //=> 7–8 novembre 2022
     * @example
     * Interval.fromISO('2022-11-07T17:00Z/2022-11-07T19:00Z').toLocaleString(DateTime.TIME_SIMPLE); //=> 6:00 – 8:00 PM
     * @example
     * Interval.fromISO("2022-11-07T17:00Z/2022-11-07T19:00Z").toLocaleString({
     *   weekday: "short",
     *   month: "short",
     *   day: "2-digit",
     *   hour: "2-digit",
     *   minute: "2-digit",
     * }); //=> Mon, Nov 07, 6:00 – 8:00 p
     */
    toLocaleString(
        formatOpts?: Intl.DateTimeFormatOptions,
        opts?: LocaleOptions,
    ): IfValid<string, "Invalid Interval", IsValid>;

    /**
     * Returns an ISO 8601-compliant string representation of this Interval.
     * @see https://en.wikipedia.org/wiki/ISO_8601#Time_intervals
     *
     * @param opts - The same options as {@link DateTime#toISO}
     */
    toISO(opts?: ToISOTimeOptions): IfValid<string, "Invalid Interval", IsValid>;

    /**
     * Returns an ISO 8601-compliant string representation of the dates in this Interval.
     * The time components are ignored.
     * @see https://en.wikipedia.org/wiki/ISO_8601#Time_intervals
     */
    toISODate(): IfValid<string, "Invalid Interval", IsValid>;

    /**
     * Returns an ISO 8601-compliant string representation of the times in this Interval.
     * The date components are ignored.
     * @see https://en.wikipedia.org/wiki/ISO_8601#Time_intervals
     *
     * @param opts - The same options as {@link DateTime.toISO}
     */
    toISOTime(opts?: ToISOTimeOptions): IfValid<string, "Invalid Interval", IsValid>;

    /**
     * Returns a string representation of this Interval formatted according to the specified format string.
     *
     * @param dateFormat - the format string. This string formats the start and end time. See {@link DateTime.toFormat} for details.
     * @param opts - options
     * @param opts.separator - a separator to place between the start and end representations. Defaults to ' - '.
     */
    toFormat(
        dateFormat: string,
        opts?: {
            separator?: string | undefined;
        },
    ): IfValid<string, "Invalid Interval", IsValid>;

    /**
     * Return a Duration representing the time spanned by this interval.
     *
     * @param unit - the unit or units (such as 'hours' or 'days') to include in the duration. Defaults to ['milliseconds'].
     * @param opts - options that affect the creation of the Duration
     * @param opts.conversionAccuracy - the conversion system to use. Defaults to 'casual'.
     *
     * @example
     * Interval.fromDateTimes(dt1, dt2).toDuration().toObject() //=> { milliseconds: 88489257 }
     * @example
     * Interval.fromDateTimes(dt1, dt2).toDuration('days').toObject() //=> { days: 1.0241812152777778 }
     * @example
     * Interval.fromDateTimes(dt1, dt2).toDuration(['hours', 'minutes']).toObject() //=> { hours: 24, minutes: 34.82095 }
     * @example
     * Interval.fromDateTimes(dt1, dt2).toDuration(['hours', 'minutes', 'seconds']).toObject() //=> { hours: 24, minutes: 34, seconds: 49.257 }
     * @example
     * Interval.fromDateTimes(dt1, dt2).toDuration('seconds').toObject() //=> { seconds: 88489.257 }
     */
    toDuration(unit?: DurationUnit | DurationUnit[], opts?: DiffOptions): DurationMaybeValid;

    /**
     * Run mapFn on the interval start and end, returning a new Interval from the resulting DateTimes
     *
     * @example
     * Interval.fromDateTimes(dt1, dt2).mapEndpoints(endpoint => endpoint.toUTC())
     * @example
     * Interval.fromDateTimes(dt1, dt2).mapEndpoints(endpoint => endpoint.plus({ hours: 2 }))
     */
    mapEndpoints(mapFn: (d: DateTime) => DateTime): IntervalMaybeValid;
}
