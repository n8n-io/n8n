import {
    CalendarSystem,
    DateTimeFormatOptions,
    NumberingSystem,
    StringUnitLength,
    ToISOFormat,
    ToISOTimeDurationOptions,
    ZoneOptions,
} from '../index';
import { Zone } from './zone';
import { Duration, DurationLike, DurationUnits } from './duration';
import { Interval } from './interval';

export type DateTimeUnit = 'year' | 'quarter' | 'month' | 'week' | 'day' | 'hour' | 'minute' | 'second' | 'millisecond';
export type ToRelativeUnit = 'years' | 'quarters' | 'months' | 'weeks' | 'days' | 'hours' | 'minutes' | 'seconds';

export type MonthNumbers = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12;
export type WeekdayNumbers = 1 | 2 | 3 | 4 | 5 | 6 | 7;

export type DayNumbers =
    | 1
    | 2
    | 3
    | 4
    | 5
    | 6
    | 7
    | 8
    | 9
    | 10
    | 11
    | 12
    | 13
    | 14
    | 15
    | 16
    | 17
    | 18
    | 19
    | 20
    | 21
    | 22
    | 23
    | 24
    | 25
    | 26
    | 27
    | 28
    | 29
    | 30
    | 31;

export type SecondNumbers =
    | 0
    | 1
    | 2
    | 3
    | 4
    | 5
    | 6
    | 7
    | 8
    | 9
    | 10
    | 11
    | 12
    | 13
    | 14
    | 15
    | 16
    | 17
    | 18
    | 19
    | 20
    | 21
    | 22
    | 23
    | 24
    | 25
    | 26
    | 27
    | 28
    | 29
    | 30
    | 31
    | 32
    | 33
    | 34
    | 35
    | 36
    | 37
    | 38
    | 39
    | 40
    | 41
    | 42
    | 43
    | 44
    | 45
    | 46
    | 47
    | 48
    | 49
    | 50
    | 51
    | 52
    | 53
    | 54
    | 55
    | 56
    | 57
    | 58
    | 59;

export type MinuteNumbers = SecondNumbers;

export type HourNumbers =
    | 0
    | 1
    | 2
    | 3
    | 4
    | 5
    | 6
    | 7
    | 8
    | 9
    | 10
    | 11
    | 12
    | 13
    | 14
    | 15
    | 16
    | 17
    | 18
    | 19
    | 20
    | 21
    | 22
    | 23;

export type WeekNumbers =
    | 1
    | 2
    | 3
    | 4
    | 5
    | 6
    | 7
    | 8
    | 9
    | 10
    | 11
    | 12
    | 13
    | 14
    | 15
    | 16
    | 17
    | 18
    | 19
    | 20
    | 21
    | 22
    | 23
    | 24
    | 25
    | 26
    | 27
    | 28
    | 29
    | 30
    | 31
    | 32
    | 33
    | 34
    | 35
    | 36
    | 37
    | 38
    | 39
    | 40
    | 41
    | 42
    | 43
    | 44
    | 45
    | 46
    | 47
    | 48
    | 49
    | 50
    | 51
    | 52
    | 53;

export type QuarterNumbers = 1 | 2 | 3 | 4;

export type PossibleDaysInMonth = 28 | 29 | 30 | 31;
export type PossibleDaysInYear = 365 | 366;
export type PossibleWeeksInYear = 52 | 53;

export interface ToObjectOutput extends DateTimeJSOptions {
    year: number;
    month: number;
    day: number;
    hour: number;
    minute: number;
    second: number;
    millisecond: number;
}

export interface ToRelativeOptions extends Omit<ToRelativeCalendarOptions, 'unit'> {
    /**
     * @default long
     */
    style?: StringUnitLength | undefined;
    /** @default true */
    round?: boolean | undefined;
    /**
     * Padding in milliseconds. This allows you to round up the result if it fits inside the threshold.
     * Don't use in combination with {round: false} because the decimal output will include the padding.
     * @default 0
     */
    padding?: number | undefined;
    /**
     * A single unit or an array of units. If an array is supplied, the method will pick the best one
     * to use from the array. If omitted, the method will pick the unit from a default set.
     */
    unit?: ToRelativeUnit | ToRelativeUnit[] | undefined;
}

export interface ToRelativeCalendarOptions {
    /**
     * The DateTime to use as the basis to which this time is compared
     * @default now
     */
    base?: DateTime | undefined;
    /**
     * Override the locale of this DateTime
     */
    locale?: string | undefined;
    /** If omitted, the method will pick the unit. */
    unit?: ToRelativeUnit | undefined;
    /**
     * Override the numberingSystem of this DateTime.
     * The Intl system may choose not to honor this.
     */
    numberingSystem?: NumberingSystem | undefined;
}

export interface ToSQLOptions {
    /**
     * Include the offset, such as 'Z' or '-04:00'
     * @default true
     */
    includeOffset?: boolean | undefined;
    /**
     * Include the zone, such as 'America/New_York'. Overrides includeOffset.
     * @default false
     */
    includeZone?: boolean | undefined;
    /**
     * include the space between the time and the offset, such as '05:15:16.345 -04:00'
     * @default true
     */
    includeOffsetSpace?: boolean;
}

export interface ToISODateOptions {
    /**
     * Choose between the basic and extended format
     * @default 'extended'
     */
    format?: ToISOFormat | undefined;
}

export interface ToISOTimeOptions extends ToISOTimeDurationOptions {
    /**
     * Include the offset, such as 'Z' or '-04:00'
     * @default true
     */
    includeOffset?: boolean | undefined;

    /**
     * add the time zone format extension
     * @default false
     */
    extendedZone?: boolean | undefined;
}

/** @deprecated alias for backwards compatibility */
export type ISOTimeOptions = ToISOTimeOptions;

export interface LocaleOptions {
    /**
     * @default system's locale
     */
    locale?: string | undefined;
    outputCalendar?: CalendarSystem | undefined;
    numberingSystem?: NumberingSystem | undefined;
}

export type ResolvedLocaleOptions = Required<LocaleOptions>;

export interface DateTimeOptions extends LocaleOptions {
    /**
     * Use this zone if no offset is specified in the input string itself. Will also convert the time to this zone.
     * @default local
     */
    zone?: string | Zone | undefined;
    /**
     * Override the zone with a fixed-offset zone specified in the string itself, if it specifies one.
     * @default false
     */
    setZone?: boolean | undefined;
}

export type DateTimeJSOptions = Omit<DateTimeOptions, 'setZone'>;

export interface DateObjectUnits {
    // a year, such as 1987
    year?: number | undefined;
    // a month, 1-12
    month?: number | undefined;
    // a day of the month, 1-31, depending on the month
    day?: number | undefined;
    // day of the year, 1-365 or 366
    ordinal?: number | undefined;
    // an ISO week year
    weekYear?: number | undefined;
    // an ISO week number, between 1 and 52 or 53, depending on the year
    weekNumber?: number | undefined;
    // an ISO weekday, 1-7, where 1 is Monday and 7 is Sunday
    weekday?: number | undefined;
    // hour of the day, 0-23
    hour?: number | undefined;
    // minute of the hour, 0-59
    minute?: number | undefined;
    // second of the minute, 0-59
    second?: number | undefined;
    // millisecond of the second, 0-999
    millisecond?: number | undefined;
}

export type ConversionAccuracy = 'casual' | 'longterm';

/**
 * @deprecated You should use Intl.DateTimeFormatOptions' fields and values instead.
 */
export type DateTimeFormatPresetValue = 'numeric' | 'short' | 'long';
/**
 * @deprecated Use Intl.DateTimeFormatOptions instead.
 */
export type DateTimeFormatPreset = Intl.DateTimeFormatOptions;

export interface DiffOptions {
    conversionAccuracy?: ConversionAccuracy | undefined;
}

export interface ExplainedFormat {
    input: string;
    tokens: Array<{ literal: boolean; val: string }>;
    regex?: RegExp | undefined;
    rawMatches?: RegExpMatchArray | null | undefined;
    matches?: { [k: string]: any } | undefined;
    result?: { [k: string]: any } | null | undefined;
    zone?: Zone | null | undefined;
    invalidReason?: string | undefined;
}

/**
 * A DateTime is an immutable data structure representing a specific date and time and accompanying methods.
 * It contains class and instance methods for creating, parsing, interrogating, transforming, and formatting them.
 *
 * A DateTime comprises of:
 * * A timestamp. Each DateTime instance refers to a specific millisecond of the Unix epoch.
 * * A time zone. Each instance is considered in the context of a specific zone (by default the local system's zone).
 * * Configuration properties that effect how output strings are formatted, such as `locale`, `numberingSystem`, and `outputCalendar`.
 *
 * Here is a brief overview of the most commonly used functionality it provides:
 *
 * * **Creation**: To create a DateTime from its components, use one of its factory class methods: {@link DateTime.local}, {@link DateTime.utc}, and (most flexibly) {@link DateTime.fromObject}.
 * To create one from a standard string format, use {@link DateTime.fromISO}, {@link DateTime.fromHTTP}, and {@link DateTime.fromRFC2822}.
 * To create one from a custom string format, use {@link DateTime.fromFormat}. To create one from a native JS date, use {@link DateTime.fromJSDate}.
 * * **Gregorian calendar and time**: To examine the Gregorian properties of a DateTime individually (i.e as opposed to collectively through {@link DateTime#toObject}), use the {@link DateTime#year},
 * {@link DateTime#month}, {@link DateTime#day}, {@link DateTime#hour}, {@link DateTime#minute}, {@link DateTime#second}, {@link DateTime#millisecond} accessors.
 * * **Week calendar**: For ISO week calendar attributes, see the {@link DateTime#weekYear}, {@link DateTime#weekNumber}, and {@link DateTime#weekday} accessors.
 * * **Configuration** See the {@link DateTime#locale} and {@link DateTime#numberingSystem} accessors.
 * * **Transformation**: To transform the DateTime into other DateTimes, use {@link DateTime#set}, {@link DateTime#reconfigure}, {@link DateTime#setZone}, {@link DateTime#setLocale},
 * {@link DateTime.plus}, {@link DateTime#minus}, {@link DateTime#endOf}, {@link DateTime#startOf}, {@link DateTime#toUTC}, and {@link DateTime#toLocal}.
 * * **Output**: To convert the DateTime to other representations, use the {@link DateTime#toRelative}, {@link DateTime#toRelativeCalendar}, {@link DateTime#toJSON}, {@link DateTime#toISO},
 * {@link DateTime#toHTTP}, {@link DateTime#toObject}, {@link DateTime#toRFC2822}, {@link DateTime#toString}, {@link DateTime#toLocaleString}, {@link DateTime#toFormat},
 * {@link DateTime#toMillis} and {@link DateTime#toJSDate}.
 *
 * There's plenty others documented below. In addition, for more information on subtler topics
 * like internationalization, time zones, alternative calendars, validity, and so on, see the external documentation.
 */
export class DateTime {
    /**
     * Create a DateTime for the current instant, in the system's time zone.
     *
     * Use Settings to override these default values if needed.
     * @example
     * DateTime.now().toISO() //~> now in the ISO format
     */
    static now(): DateTime;

    /**
     * Create a local DateTime
     *
     * @param year - The calendar year. If omitted (as in, call `local()` with no arguments), the current time will be used
     * @param month - The month, 1-indexed
     * @param day - The day of the month, 1-indexed
     * @param hour - The hour of the day, in 24-hour time
     * @param minute - The minute of the hour, meaning a number between 0 and 59
     * @param second - The second of the minute, meaning a number between 0 and 59
     * @param millisecond - The millisecond of the second, meaning a number between 0 and 999
     *
     * @example
     * DateTime.local()                                  //~> now
     * @example
     * DateTime.local({ zone: "America/New_York" })      //~> now, in US east coast time
     * @example
     * DateTime.local(2017)                              //~> 2017-01-01T00:00:00
     * @example
     * DateTime.local(2017, 3)                           //~> 2017-03-01T00:00:00
     * @example
     * DateTime.local(2017, 3, 12, { locale: "fr")       //~> 2017-03-12T00:00:00, with a French locale
     * @example
     * DateTime.local(2017, 3, 12, 5)                    //~> 2017-03-12T05:00:00
     * @example
     * DateTime.local(2017, 3, 12, 5, { zone: "utc" })   //~> 2017-03-12T05:00:00, in UTC
     * @example
     * DateTime.local(2017, 3, 12, 5, 45)                //~> 2017-03-12T05:45:00
     * @example
     * DateTime.local(2017, 3, 12, 5, 45, 10)            //~> 2017-03-12T05:45:10
     * @example
     * DateTime.local(2017, 3, 12, 5, 45, 10, 765)       //~> 2017-03-12T05:45:10.765
     */
    static local(
        year: number,
        month: number,
        day: number,
        hour: number,
        minute: number,
        second: number,
        millisecond: number,
        opts?: DateTimeJSOptions,
    ): DateTime;
    static local(
        year: number,
        month: number,
        day: number,
        hour: number,
        minute: number,
        second: number,
        opts?: DateTimeJSOptions,
    ): DateTime;
    static local(
        year: number,
        month: number,
        day: number,
        hour: number,
        minute: number,
        opts?: DateTimeJSOptions,
    ): DateTime;
    static local(year: number, month: number, day: number, hour: number, opts?: DateTimeJSOptions): DateTime;
    static local(year: number, month: number, day: number, opts?: DateTimeJSOptions): DateTime;
    static local(year: number, month: number, opts?: DateTimeJSOptions): DateTime;
    static local(year: number, opts?: DateTimeJSOptions): DateTime;
    static local(opts?: DateTimeJSOptions): DateTime;

    /**
     * Create a DateTime in UTC
     *
     * @param year - The calendar year. If omitted (as in, call `utc()` with no arguments), the current time will be used
     * @param month - The month, 1-indexed
     * @param day - The day of the month
     * @param hour - The hour of the day, in 24-hour time
     * @param minute - The minute of the hour, meaning a number between 0 and 59
     * @param second - The second of the minute, meaning a number between 0 and 59
     * @param millisecond - The millisecond of the second, meaning a number between 0 and 999
     * @param options - configuration options for the DateTime
     * @param options.locale - a locale to set on the resulting DateTime instance
     * @param options.outputCalendar - the output calendar to set on the resulting DateTime instance
     * @param options.numberingSystem - the numbering system to set on the resulting DateTime instance
     *
     * @example
     * DateTime.utc()                                            //~> now
     * @example
     * DateTime.utc(2017)                                        //~> 2017-01-01T00:00:00Z
     * @example
     * DateTime.utc(2017, 3)                                     //~> 2017-03-01T00:00:00Z
     * @example
     * DateTime.utc(2017, 3, 12)                                 //~> 2017-03-12T00:00:00Z
     * @example
     * DateTime.utc(2017, 3, 12, 5)                              //~> 2017-03-12T05:00:00Z
     * @example
     * DateTime.utc(2017, 3, 12, 5, 45)                          //~> 2017-03-12T05:45:00Z
     * @example
     * DateTime.utc(2017, 3, 12, 5, 45, { locale: "fr" } )       //~> 2017-03-12T05:45:00Z with a French locale
     * @example
     * DateTime.utc(2017, 3, 12, 5, 45, 10)                      //~> 2017-03-12T05:45:10Z
     * @example
     * DateTime.utc(2017, 3, 12, 5, 45, 10, 765, { locale: "fr") //~> 2017-03-12T05:45:10.765Z with a French locale
     */
    static utc(
        year: number,
        month: number,
        day: number,
        hour: number,
        minute: number,
        second: number,
        millisecond: number,
        options?: LocaleOptions,
    ): DateTime;
    static utc(
        year: number,
        month: number,
        day: number,
        hour: number,
        minute: number,
        second: number,
        options?: LocaleOptions,
    ): DateTime;
    static utc(
        year: number,
        month: number,
        day: number,
        hour: number,
        minute: number,
        options?: LocaleOptions,
    ): DateTime;
    static utc(year: number, month: number, day: number, hour: number, options?: LocaleOptions): DateTime;
    static utc(year: number, month: number, day: number, options?: LocaleOptions): DateTime;
    static utc(year: number, month: number, options?: LocaleOptions): DateTime;
    static utc(year: number, options?: LocaleOptions): DateTime;
    static utc(options?: LocaleOptions): DateTime;

    /**
     * Create a DateTime from a JavaScript Date object. Uses the default zone.
     *
     * @param date - a JavaScript Date object
     * @param options - configuration options for the DateTime
     * @param options.zone - the zone to place the DateTime into
     */
    static fromJSDate(date: Date, options?: { zone?: string | Zone }): DateTime;

    /**
     * Create a DateTime from a number of milliseconds since the epoch (meaning since 1 January 1970 00:00:00 UTC). Uses the default zone.
     *
     * @param milliseconds - a number of milliseconds since 1970 UTC
     * @param options - configuration options for the DateTime
     * @param options.zone - the zone to place the DateTime into. Defaults to 'local'.
     * @param options.locale - a locale to set on the resulting DateTime instance
     * @param options.outputCalendar - the output calendar to set on the resulting DateTime instance
     * @param options.numberingSystem - the numbering system to set on the resulting DateTime instance
     */
    static fromMillis(milliseconds: number, options?: DateTimeJSOptions): DateTime;

    /**
     * Create a DateTime from a number of seconds since the epoch (meaning since 1 January 1970 00:00:00 UTC). Uses the default zone.
     *
     * @param seconds - a number of seconds since 1970 UTC
     * @param options - configuration options for the DateTime
     * @param options.zone - the zone to place the DateTime into. Defaults to 'local'.
     * @param options.locale - a locale to set on the resulting DateTime instance
     * @param options.outputCalendar - the output calendar to set on the resulting DateTime instance
     * @param options.numberingSystem - the numbering system to set on the resulting DateTime instance
     */
    static fromSeconds(seconds: number, options?: DateTimeJSOptions): DateTime;

    /**
     * Create a DateTime from a JavaScript object with keys like 'year' and 'hour' with reasonable defaults.
     *
     * @param obj - the object to create the DateTime from
     * @param obj.year - a year, such as 1987
     * @param obj.month - a month, 1-12
     * @param obj.day - a day of the month, 1-31, depending on the month
     * @param obj.ordinal - day of the year, 1-365 or 366
     * @param obj.weekYear - an ISO week year
     * @param obj.weekNumber - an ISO week number, between 1 and 52 or 53, depending on the year
     * @param obj.weekday - an ISO weekday, 1-7, where 1 is Monday and 7 is Sunday
     * @param obj.hour - hour of the day, 0-23
     * @param obj.minute - minute of the hour, 0-59
     * @param obj.second - second of the minute, 0-59
     * @param obj.millisecond - millisecond of the second, 0-999
     * @param opts - options for creating this DateTime
     * @param opts.zone - interpret the numbers in the context of a particular zone. Can take any value taken as the first argument to setZone(). Defaults to 'local'.
     * @param opts.locale - a locale to set on the resulting DateTime instance. Defaults to 'system's locale'.
     * @param opts.outputCalendar - the output calendar to set on the resulting DateTime instance
     * @param opts.numberingSystem - the numbering system to set on the resulting DateTime instance
     *
     * @example
     * DateTime.fromObject({ year: 1982, month: 5, day: 25}).toISODate() //=> '1982-05-25'
     * @example
     * DateTime.fromObject({ year: 1982 }).toISODate() //=> '1982-01-01'
     * @example
     * DateTime.fromObject({ hour: 10, minute: 26, second: 6 }) //~> today at 10:26:06
     * @example
     * DateTime.fromObject({ hour: 10, minute: 26, second: 6 }, { zone: 'utc' }),
     * @example
     * DateTime.fromObject({ hour: 10, minute: 26, second: 6 }, { zone: 'local' })
     * @example
     * DateTime.fromObject({ hour: 10, minute: 26, second: 6 }, { }zone: 'America/New_York' })
     * @example
     * DateTime.fromObject({ weekYear: 2016, weekNumber: 2, weekday: 3 }).toISODate() //=> '2016-01-13'
     */
    static fromObject(obj: DateObjectUnits, opts?: DateTimeJSOptions): DateTime;

    /**
     * Create a DateTime from an ISO 8601 string
     *
     * @param text - the ISO string
     * @param opts - options to affect the creation
     * @param opts.zone - use this zone if no offset is specified in the input string itself. Will also convert the time to this zone. Defaults to 'local'.
     * @param opts.setZone - override the zone with a fixed-offset zone specified in the string itself, if it specifies one. Defaults to false.
     * @param opts.locale - a locale to set on the resulting DateTime instance. Defaults to 'system's locale'.
     * @param opts.outputCalendar - the output calendar to set on the resulting DateTime instance
     * @param opts.numberingSystem - the numbering system to set on the resulting DateTime instance
     *
     * @example
     * DateTime.fromISO('2016-05-25T09:08:34.123')
     * @example
     * DateTime.fromISO('2016-05-25T09:08:34.123+06:00')
     * @example
     * DateTime.fromISO('2016-05-25T09:08:34.123+06:00', {setZone: true})
     * @example
     * DateTime.fromISO('2016-05-25T09:08:34.123', {zone: 'utc'})
     * @example
     * DateTime.fromISO('2016-W05-4')
     */
    static fromISO(text: string, opts?: DateTimeOptions): DateTime;

    /**
     * Create a DateTime from an RFC 2822 string
     *
     * @param text - the RFC 2822 string
     * @param opts - options to affect the creation
     * @param opts.zone - convert the time to this zone. Since the offset is always specified in the string itself,
     * this has no effect on the interpretation of string, merely the zone the resulting DateTime is expressed in. Defaults to 'local'
     * @param opts.setZone - override the zone with a fixed-offset zone specified in the string itself, if it specifies one. Defaults to false.
     * @param opts.locale - a locale to set on the resulting DateTime instance. Defaults to 'system's locale'.
     * @param opts.outputCalendar - the output calendar to set on the resulting DateTime instance
     * @param opts.numberingSystem - the numbering system to set on the resulting DateTime instance
     *
     * @example
     * DateTime.fromRFC2822('25 Nov 2016 13:23:12 GMT')
     * @example
     * DateTime.fromRFC2822('Fri, 25 Nov 2016 13:23:12 +0600')
     * @example
     * DateTime.fromRFC2822('25 Nov 2016 13:23 Z')
     */
    static fromRFC2822(text: string, opts?: DateTimeOptions): DateTime;

    /**
     * Create a DateTime from an HTTP header date
     *
     * @see https://www.w3.org/Protocols/rfc2616/rfc2616-sec3.html#sec3.3.1
     *
     * @param text - the HTTP header date
     * @param opts - options to affect the creation
     * @param opts.zone - convert the time to this zone. Since HTTP dates are always in UTC,
     * this has no effect on the interpretation of string,merely the zone the resulting DateTime is expressed in. Defaults to 'local'.
     * @param opts.setZone - override the zone with the fixed-offset zone specified in the string. For HTTP dates, this is always UTC,
     * so this option is equivalent to setting the `zone` option to 'utc', but this option is included for consistency with similar methods. Defaults to false.
     * @param opts.locale - a locale to set on the resulting DateTime instance. Defaults to 'system's locale'.
     * @param opts.outputCalendar - the output calendar to set on the resulting DateTime instance
     * @param opts.numberingSystem - the numbering system to set on the resulting DateTime instance
     *
     * @example
     * DateTime.fromHTTP('Sun, 06 Nov 1994 08:49:37 GMT')
     * @example
     * DateTime.fromHTTP('Sunday, 06-Nov-94 08:49:37 GMT')
     * @example
     * DateTime.fromHTTP('Sun Nov  6 08:49:37 1994')
     */
    static fromHTTP(text: string, opts?: DateTimeOptions): DateTime;

    /**
     * Create a DateTime from an input string and format string.
     * Defaults to en-US if no locale has been specified, regardless of the system's locale. For a table of tokens and their interpretations,
     * see [here](https://moment.github.io/luxon/#/parsing?id=table-of-tokens).
     *
     * @param text - the string to parse
     * @param fmt - the format the string is expected to be in (see the link below for the formats)
     * @param opts - options to affect the creation
     * @param opts.zone - use this zone if no offset is specified in the input string itself. Will also convert the DateTime to this zone. Defaults to 'local'.
     * @param opts.setZone - override the zone with a zone specified in the string itself, if it specifies one. Defaults to false.
     * @param opts.locale - a locale string to use when parsing. Will also set the DateTime to this locale. Defaults to 'en-US'.
     * @param opts.numberingSystem - the numbering system to use when parsing. Will also set the resulting DateTime to this numbering system
     * @param opts.outputCalendar - the output calendar to set on the resulting DateTime instance
     */
    static fromFormat(text: string, fmt: string, opts?: DateTimeOptions): DateTime;

    /**
     * @deprecated use fromFormat instead
     */
    static fromString(text: string, format: string, options?: DateTimeOptions): DateTime;

    /**
     * Create a DateTime from a SQL date, time, or datetime
     * Defaults to en-US if no locale has been specified, regardless of the system's locale
     *
     * @param text - the string to parse
     * @param opts - options to affect the creation
     * @param opts.zone - use this zone if no offset is specified in the input string itself. Will also convert the DateTime to this zone. Defaults to 'local'.
     * @param opts.setZone - override the zone with a zone specified in the string itself, if it specifies one. Defaults to false.
     * @param opts.locale - a locale string to use when parsing. Will also set the DateTime to this locale. Defaults to 'en-US'.
     * @param opts.numberingSystem - the numbering system to use when parsing. Will also set the resulting DateTime to this numbering system
     * @param opts.outputCalendar - the output calendar to set on the resulting DateTime instance
     *
     * @example
     * DateTime.fromSQL('2017-05-15')
     * @example
     * DateTime.fromSQL('2017-05-15 09:12:34')
     * @example
     * DateTime.fromSQL('2017-05-15 09:12:34.342')
     * @example
     * DateTime.fromSQL('2017-05-15 09:12:34.342+06:00')
     * @example
     * DateTime.fromSQL('2017-05-15 09:12:34.342 America/Los_Angeles')
     * @example
     * DateTime.fromSQL('2017-05-15 09:12:34.342 America/Los_Angeles', { setZone: true })
     * @example
     * DateTime.fromSQL('2017-05-15 09:12:34.342', { zone: 'America/Los_Angeles' })
     * @example
     * DateTime.fromSQL('09:12:34.342')
     */
    static fromSQL(text: string, opts?: DateTimeOptions): DateTime;

    /**
     * Create an invalid DateTime.
     *
     * @param reason - simple string of why this DateTime is invalid. Should not contain parameters or anything else data-dependent
     * @param explanation - longer explanation, may include parameters and other useful debugging information. Defaults to null.
     */
    static invalid(reason: string, explanation?: string): DateTime;

    /**
     * Check if an object is a DateTime. Works across context boundaries
     *
     * @param o
     */
    static isDateTime(o: unknown): o is DateTime;

    /**
     * Produce the format string for a set of options
     *
     * @param formatOpts - Intl.DateTimeFormat constructor options and configuration options
     * @param localeOpts - Opts to override the configuration options on this DateTime
     *
     * @example
     * DateTime.parseFormatForOpts(DateTime.DATETIME_FULL); //=> "MMMM d, yyyyy, h:m a ZZZ"
     */
    static parseFormatForOpts(formatOpts?: DateTimeFormatOptions, localeOpts?: LocaleOptions): string | null;

    /**
     * Produce the fully expanded format token for the locale
     * Does NOT quote characters, so quoted tokens will not round trip correctly
     * @param fmt - the format string
     * @param localeOpts - Opts to override the configuration options on this DateTime
     */
    static expandFormat(fmt: string, localeOpts?: LocaleOptions): string;

    private constructor(config: unknown);

    // INFO

    /**
     * Get the value of unit.
     *
     * @param unit - a unit such as 'minute' or 'day'
     *
     * @example
     * DateTime.local(2017, 7, 4).get('month'); //=> 7
     * @example
     * DateTime.local(2017, 7, 4).get('day'); //=> 4
     */
    get(unit: keyof DateTime): number;

    /**
     * Returns whether the DateTime is valid. Invalid DateTimes occur when:
     * * The DateTime was created from invalid calendar information, such as the 13th month or February 30
     * * The DateTime was created by an operation on another invalid date
     */
    get isValid(): boolean;

    /**
     * Returns an error code if this DateTime is invalid, or null if the DateTime is valid
     */
    get invalidReason(): string | null;

    /**
     * Returns an explanation of why this DateTime became invalid, or null if the DateTime is valid
     */
    get invalidExplanation(): string | null;

    /**
     * Get the locale of a DateTime, such 'en-GB'. The locale is used when formatting the DateTime
     */
    get locale(): string;

    /**
     * Get the numbering system of a DateTime, such 'beng'. The numbering system is used when formatting the DateTime
     */
    get numberingSystem(): string;

    /**
     * Get the output calendar of a DateTime, such 'islamic'. The output calendar is used when formatting the DateTime
     */
    get outputCalendar(): string;

    /**
     * Get the time zone associated with this DateTime.
     */
    get zone(): Zone;

    /**
     * Get the name of the time zone.
     */
    get zoneName(): string;

    /**
     * Get the year
     *
     * @example DateTime.local(2017, 5, 25).year //=> 2017
     */
    get year(): number;

    /**
     * Get the quarter
     *
     * @example DateTime.local(2017, 5, 25).quarter //=> 2
     */
    get quarter(): QuarterNumbers;

    /**
     * Get the month (1-12).
     *
     * @example DateTime.local(2017, 5, 25).month //=> 5
     */
    get month(): MonthNumbers;

    /**
     * Get the day of the month (1-30ish).
     *
     * @example DateTime.local(2017, 5, 25).day //=> 25
     */
    get day(): DayNumbers;

    /**
     * Get the hour of the day (0-23).
     *
     * @example DateTime.local(2017, 5, 25, 9).hour //=> 9
     */
    get hour(): HourNumbers;

    /**
     * Get the minute of the hour (0-59).
     *
     * @example
     * DateTime.local(2017, 5, 25, 9, 30).minute //=> 30
     */
    get minute(): MinuteNumbers;

    /**
     * Get the second of the minute (0-59).
     *
     * @example
     * DateTime.local(2017, 5, 25, 9, 30, 52).second //=> 52
     */
    get second(): SecondNumbers;

    /**
     * Get the millisecond of the second (0-999).
     *
     * @example
     * DateTime.local(2017, 5, 25, 9, 30, 52, 654).millisecond //=> 654
     */
    get millisecond(): number;

    /**
     * Get the week year
     * @see https://en.wikipedia.org/wiki/ISO_week_date
     *
     * @example
     * DateTime.local(2014, 12, 31).weekYear //=> 2015
     */
    get weekYear(): number;

    /**
     * Get the week number of the week year (1-52ish).
     * @see https://en.wikipedia.org/wiki/ISO_week_date
     *
     * @example
     * DateTime.local(2017, 5, 25).weekNumber //=> 21
     */
    get weekNumber(): WeekNumbers;

    /**
     * Get the day of the week.
     * 1 is Monday and 7 is Sunday
     * @see https://en.wikipedia.org/wiki/ISO_week_date
     *
     * @example
     * DateTime.local(2014, 11, 31).weekday //=> 4
     */
    get weekday(): WeekdayNumbers;

    /**
     * Get the ordinal (meaning the day of the year)
     *
     * @example
     * DateTime.local(2017, 5, 25).ordinal //=> 145
     */
    get ordinal(): number;

    /**
     * Get the human readable short month name, such as 'Oct'.
     * Defaults to the system's locale if no locale has been specified
     *
     * @example
     * DateTime.local(2017, 10, 30).monthShort //=> Oct
     */
    get monthShort(): string;

    /**
     * Get the human readable long month name, such as 'October'.
     * Defaults to the system's locale if no locale has been specified
     *
     * @example
     * DateTime.local(2017, 10, 30).monthLong //=> October
     */
    get monthLong(): string;

    /**
     * Get the human readable short weekday, such as 'Mon'.
     * Defaults to the system's locale if no locale has been specified
     *
     * @example
     * DateTime.local(2017, 10, 30).weekdayShort //=> Mon
     */
    get weekdayShort(): string;

    /**
     * Get the human readable long weekday, such as 'Monday'.
     * Defaults to the system's locale if no locale has been specified
     *
     * @example
     * DateTime.local(2017, 10, 30).weekdayLong //=> Monday
     */
    get weekdayLong(): string;

    /**
     * Get the UTC offset of this DateTime in minutes
     *
     * @example
     * DateTime.now().offset //=> -240
     * @example
     * DateTime.utc().offset //=> 0
     */
    get offset(): number;

    /**
     * Get the short human name for the zone's current offset, for example "EST" or "EDT".
     * Defaults to the system's locale if no locale has been specified
     */
    get offsetNameShort(): string;

    /**
     * Get the long human name for the zone's current offset, for example "Eastern Standard Time" or "Eastern Daylight Time".
     * Defaults to the system's locale if no locale has been specified
     */
    get offsetNameLong(): string;

    /**
     * Get whether this zone's offset ever changes, as in a DST.
     */
    get isOffsetFixed(): boolean;

    /**
     * Get whether the DateTime is in a DST.
     */
    get isInDST(): boolean;

    /**
     * Returns true if this DateTime is in a leap year, false otherwise
     *
     * @example
     * DateTime.local(2016).isInLeapYear //=> true
     * @example
     * DateTime.local(2013).isInLeapYear //=> false
     */
    get isInLeapYear(): boolean;

    /**
     * Returns the number of days in this DateTime's month
     *
     * @example
     * DateTime.local(2016, 2).daysInMonth //=> 29
     * @example
     * DateTime.local(2016, 3).daysInMonth //=> 31
     */
    get daysInMonth(): PossibleDaysInMonth;

    /**
     * Returns the number of days in this DateTime's year
     *
     * @example
     * DateTime.local(2016).daysInYear //=> 366
     * @example
     * DateTime.local(2013).daysInYear //=> 365
     */
    get daysInYear(): PossibleDaysInYear;

    /**
     * Returns the number of weeks in this DateTime's year
     * @see https://en.wikipedia.org/wiki/ISO_week_date
     *
     * @example
     * DateTime.local(2004).weeksInWeekYear //=> 53
     * @example
     * DateTime.local(2013).weeksInWeekYear //=> 52
     */
    get weeksInWeekYear(): PossibleWeeksInYear;

    /**
     * Returns the resolved Intl options for this DateTime.
     * This is useful in understanding the behavior of formatting methods
     *
     * @param opts - the same options as toLocaleString
     */
    resolvedLocaleOptions(opts?: LocaleOptions | DateTimeFormatOptions): ResolvedLocaleOptions;

    // TRANSFORM

    /**
     * "Set" the DateTime's zone to UTC. Returns a newly-constructed DateTime.
     *
     * Equivalent to {@link DateTime.setZone}('utc')
     *
     * @param offset - optionally, an offset from UTC in minutes. Defaults to 0.
     * @param opts - options to pass to `setZone()`. Defaults to {}.
     */
    toUTC(offset?: number, opts?: ZoneOptions): DateTime;

    /**
     * "Set" the DateTime's zone to the host's local zone. Returns a newly-constructed DateTime.
     *
     * Equivalent to `setZone('local')`
     */
    toLocal(): DateTime;

    /**
     * "Set" the DateTime's zone to specified zone. Returns a newly-constructed DateTime.
     *
     * By default, the setter keeps the underlying time the same (as in, the same timestamp), but the new instance will report different local times and consider DSTs when making computations,
     * as with {@link DateTime.plus}. You may wish to use {@link DateTime.toLocal} and {@link DateTime.toUTC} which provide simple convenience wrappers for commonly used zones.
     *
     * @param zone - a zone identifier. As a string, that can be any IANA zone supported by the host environment, or a fixed-offset name of the form 'UTC+3', or the strings 'local' or 'utc'.
     * You may also supply an instance of a {@link DateTime.Zone} class. Defaults to 'local'.
     * @param opts - options
     * @param opts.keepLocalTime - If true, adjust the underlying time so that the local time stays the same, but in the target zone. You should rarely need this. Defaults to false.
     */
    setZone(zone?: string | Zone, opts?: ZoneOptions): DateTime;

    /**
     * "Set" the locale, numberingSystem, or outputCalendar. Returns a newly-constructed DateTime.
     *
     * @param properties - the properties to set
     *
     * @example
     * DateTime.local(2017, 5, 25).reconfigure({ locale: 'en-GB' })
     */
    reconfigure(properties: LocaleOptions): DateTime;

    /**
     * "Set" the locale. Returns a newly-constructed DateTime.
     * Just a convenient alias for reconfigure({ locale })
     *
     * @example
     * DateTime.local(2017, 5, 25).setLocale('en-GB')
     */
    setLocale(locale: string): DateTime;

    /**
     * "Set" the values of specified units. Returns a newly-constructed DateTime.
     * You can only set units with this method; for "setting" metadata, see {@link DateTime.reconfigure} and {@link DateTime.setZone}.
     *
     * @param values - a mapping of units to numbers
     *
     * @example
     * dt.set({ year: 2017 })
     * @example
     * dt.set({ hour: 8, minute: 30 })
     * @example
     * dt.set({ weekday: 5 })
     * @example
     * dt.set({ year: 2005, ordinal: 234 })
     */
    set(values: DateObjectUnits): DateTime;

    /**
     * Adding hours, minutes, seconds, or milliseconds increases the timestamp by the right number of milliseconds. Adding days, months, or years shifts the calendar,
     * accounting for DSTs and leap years along the way. Thus, `dt.plus({ hours: 24 })` may result in a different time than `dt.plus({ days: 1 })` if there's a DST shift in between.
     *
     * @param duration - The amount to add. Either a Luxon Duration, a number of milliseconds, the object argument to Duration.fromObject()
     *
     * @example
     * DateTime.now().plus(123) //~> in 123 milliseconds
     * @example
     * DateTime.now().plus({ minutes: 15 }) //~> in 15 minutes
     * @example
     * DateTime.now().plus({ days: 1 }) //~> this time tomorrow
     * @example
     * DateTime.now().plus({ days: -1 }) //~> this time yesterday
     * @example
     * DateTime.now().plus({ hours: 3, minutes: 13 }) //~> in 3 hr, 13 min
     * @example
     * DateTime.now().plus(Duration.fromObject({ hours: 3, minutes: 13 })) //~> in 3 hr, 13 min
     */
    plus(duration: DurationLike): DateTime;

    /**
     * See {@link DateTime.plus}
     *
     * @param duration - The amount to subtract. Either a Luxon Duration, a number of milliseconds, the object argument to Duration.fromObject()
     */
    minus(duration: DurationLike): DateTime;

    /**
     * "Set" this DateTime to the beginning of a unit of time.
     *
     * @param unit - The unit to go to the beginning of. Can be 'year', 'quarter', 'month', 'week', 'day', 'hour', 'minute', 'second', or 'millisecond'.
     *
     * @example
     * DateTime.local(2014, 3, 3).startOf('month').toISODate(); //=> '2014-03-01'
     * @example
     * DateTime.local(2014, 3, 3).startOf('year').toISODate(); //=> '2014-01-01'
     * @example
     * DateTime.local(2014, 3, 3).startOf('week').toISODate(); //=> '2014-03-03', weeks always start on Mondays
     * @example
     * DateTime.local(2014, 3, 3, 5, 30).startOf('day').toISOTime(); //=> '00:00.000-05:00'
     * @example
     * DateTime.local(2014, 3, 3, 5, 30).startOf('hour').toISOTime(); //=> '05:00:00.000-05:00'
     */
    startOf(unit: DateTimeUnit): DateTime;

    /**
     * "Set" this DateTime to the end (meaning the last millisecond) of a unit of time
     *
     * @param unit - The unit to go to the end of. Can be 'year', 'quarter', 'month', 'week', 'day', 'hour', 'minute', 'second', or 'millisecond'.
     *
     * @example
     * DateTime.local(2014, 3, 3).endOf('month').toISO(); //=> '2014-03-31T23:59:59.999-05:00'
     * @example
     * DateTime.local(2014, 3, 3).endOf('year').toISO(); //=> '2014-12-31T23:59:59.999-05:00'
     * @example
     * DateTime.local(2014, 3, 3).endOf('week').toISO(); // => '2014-03-09T23:59:59.999-05:00', weeks start on Mondays
     * @example
     * DateTime.local(2014, 3, 3, 5, 30).endOf('day').toISO(); //=> '2014-03-03T23:59:59.999-05:00'
     * @example
     * DateTime.local(2014, 3, 3, 5, 30).endOf('hour').toISO(); //=> '2014-03-03T05:59:59.999-05:00'
     */
    endOf(unit: DateTimeUnit): DateTime;

    // OUTPUT

    /**
     * Returns a string representation of this DateTime formatted according to the specified format string.
     * **You may not want this.** See {@link DateTime.toLocaleString} for a more flexible formatting tool. For a table of tokens and their interpretations,
     * see [here](https://moment.github.io/luxon/#/formatting?id=table-of-tokens).
     * Defaults to en-US if no locale has been specified, regardless of the system's locale.
     *
     * @param fmt - the format string
     * @param opts - opts to override the configuration options on this DateTime
     *
     * @example
     * DateTime.now().toFormat('yyyy LLL dd') //=> '2017 Apr 22'
     * @example
     * DateTime.now().setLocale('fr').toFormat('yyyy LLL dd') //=> '2017 avr. 22'
     * @example
     * DateTime.now().toFormat('yyyy LLL dd', { locale: "fr" }) //=> '2017 avr. 22'
     * @example
     * DateTime.now().toFormat("HH 'hours and' mm 'minutes'") //=> '20 hours and 55 minutes'
     */
    toFormat(fmt: string, opts?: LocaleOptions): string;

    /**
     * Returns a localized string representing this date. Accepts the same options as the Intl.DateTimeFormat constructor and any presets defined by Luxon,
     * such as `DateTime.DATE_FULL` or `DateTime.TIME_SIMPLE` of the DateTime in the assigned locale.
     * Defaults to the system's locale if no locale has been specified
     * @see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/DateTimeFormat
     *
     * @param formatOpts - Intl.DateTimeFormat constructor options and configuration options
     * @param opts - opts to override the configuration options on this DateTime
     *
     * @example
     * DateTime.now().toLocaleString(); //=> 4/20/2017
     * @example
     * DateTime.now().setLocale('en-gb').toLocaleString(); //=> '20/04/2017'
     * @example
     * DateTime.now().toLocaleString({ locale: 'en-gb' }); //=> '20/04/2017'
     * @example
     * DateTime.now().toLocaleString(DateTime.DATE_FULL); //=> 'April 20, 2017'
     * @example
     * DateTime.now().toLocaleString(DateTime.TIME_SIMPLE); //=> '11:32 AM'
     * @example
     * DateTime.now().toLocaleString(DateTime.DATETIME_SHORT); //=> '4/20/2017, 11:32 AM'
     * @example
     * DateTime.now().toLocaleString({ weekday: 'long', month: 'long', day: '2-digit' }); //=> 'Thursday, April 20'
     * @example
     * DateTime.now().toLocaleString({ weekday: 'short', month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit' }); //=> 'Thu, Apr 20, 11:27 AM'
     * @example
     * DateTime.now().toLocaleString({ hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }); //=> '11:32'
     */
    toLocaleString(formatOpts?: DateTimeFormatOptions, opts?: LocaleOptions): string;

    /**
     * Returns an array of format "parts", meaning individual tokens along with metadata. This is allows callers to post-process individual sections of the formatted output.
     * Defaults to the system's locale if no locale has been specified
     * @see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/DateTimeFormat/formatToParts
     *
     * @param opts - Intl.DateTimeFormat constructor options, same as `toLocaleString`.
     *
     * @example
     * DateTime.now().toLocaleParts(); //=> [
     *                                 //=>   { type: 'day', value: '25' },
     *                                 //=>   { type: 'literal', value: '/' },
     *                                 //=>   { type: 'month', value: '05' },
     *                                 //=>   { type: 'literal', value: '/' },
     *                                 //=>   { type: 'year', value: '1982' }
     *                                 //=> ]
     */
    toLocaleParts(opts?: DateTimeFormatOptions): Intl.DateTimeFormatPart[];

    /**
     * Returns an ISO 8601-compliant string representation of this DateTime
     *
     * @param opts - options
     * @param opts.suppressMilliseconds - exclude milliseconds from the format if they're 0. Defaults to false.
     * @param opts.suppressSeconds - exclude seconds from the format if they're 0. Defaults to false.
     * @param opts.includeOffset - include the offset, such as 'Z' or '-04:00'. Defaults to true.
     * @param opts.format - choose between the basic and extended format. Defaults to 'extended'.
     *
     * @example
     * DateTime.utc(1982, 5, 25).toISO() //=> '1982-05-25T00:00:00.000Z'
     * @example
     * DateTime.now().toISO() //=> '2017-04-22T20:47:05.335-04:00'
     * @example
     * DateTime.now().toISO({ includeOffset: false }) //=> '2017-04-22T20:47:05.335'
     * @example
     * DateTime.now().toISO({ format: 'basic' }) //=> '20170422T204705.335-0400'
     */
    toISO(opts?: ToISOTimeOptions): string;

    /**
     * Returns an ISO 8601-compliant string representation of this DateTime's date component
     *
     * @param opts - options
     * @param opts.format - choose between the basic and extended format. Defaults to 'extended'.
     *
     * @example
     * DateTime.utc(1982, 5, 25).toISODate() //=> '1982-05-25'
     * @example
     * DateTime.utc(1982, 5, 25).toISODate({ format: 'basic' }) //=> '19820525'
     */
    toISODate(opts?: ToISODateOptions): string;

    /**
     * Returns an ISO 8601-compliant string representation of this DateTime's week date
     *
     * @example
     * DateTime.utc(1982, 5, 25).toISOWeekDate() //=> '1982-W21-2'
     */
    toISOWeekDate(): string;

    /**
     * Returns an ISO 8601-compliant string representation of this DateTime's time component
     *
     * @param opts - options
     * @param opts.suppressMilliseconds - exclude milliseconds from the format if they're 0. Defaults to false.
     * @param opts.suppressSeconds - exclude seconds from the format if they're 0. Defaults to false.
     * @param opts.includeOffset - include the offset, such as 'Z' or '-04:00'. Defaults to true.
     * @param opts.includePrefix - include the `T` prefix. Defaults to false.
     * @param opts.format - choose between the basic and extended format. Defaults to 'extended'.
     *
     * @example
     * DateTime.utc().set({ hour: 7, minute: 34 }).toISOTime() //=> '07:34:19.361Z'
     * @example
     * DateTime.utc().set({ hour: 7, minute: 34, seconds: 0, milliseconds: 0 }).toISOTime({ suppressSeconds: true }) //=> '07:34Z'
     * @example
     * DateTime.utc().set({ hour: 7, minute: 34 }).toISOTime({ format: 'basic' }) //=> '073419.361Z'
     * @example
     * DateTime.utc().set({ hour: 7, minute: 34 }).toISOTime({ includePrefix: true }) //=> 'T07:34:19.361Z'
     */
    toISOTime(ops?: ToISOTimeOptions): string;

    /**
     * Returns an RFC 2822-compatible string representation of this DateTime, always in UTC
     *
     * @example
     * DateTime.utc(2014, 7, 13).toRFC2822() //=> 'Sun, 13 Jul 2014 00:00:00 +0000'
     * @example
     * DateTime.local(2014, 7, 13).toRFC2822() //=> 'Sun, 13 Jul 2014 00:00:00 -0400'
     */
    toRFC2822(): string;

    /**
     * Returns a string representation of this DateTime appropriate for use in HTTP headers.
     * Specifically, the string conforms to RFC 1123.
     * @see https://www.w3.org/Protocols/rfc2616/rfc2616-sec3.html#sec3.3.1
     *
     * @example
     * DateTime.utc(2014, 7, 13).toHTTP() //=> 'Sun, 13 Jul 2014 00:00:00 GMT'
     * @example
     * DateTime.utc(2014, 7, 13, 19).toHTTP() //=> 'Sun, 13 Jul 2014 19:00:00 GMT'
     */
    toHTTP(): string;

    /**
     * Returns a string representation of this DateTime appropriate for use in SQL Date
     *
     * @example
     * DateTime.utc(2014, 7, 13).toSQLDate() //=> '2014-07-13'
     */
    toSQLDate(): string;

    /**
     * Returns a string representation of this DateTime appropriate for use in SQL Time
     *
     * @param opts - options
     * @param opts.includeZone - include the zone, such as 'America/New_York'. Overrides includeOffset. Defaults to false.
     * @param opts.includeOffset - include the offset, such as 'Z' or '-04:00'. Defaults to true.
     *
     * @example
     * DateTime.utc().toSQL() //=> '05:15:16.345'
     * @example
     * DateTime.now().toSQL() //=> '05:15:16.345 -04:00'
     * @example
     * DateTime.now().toSQL({ includeOffset: false }) //=> '05:15:16.345'
     * @example
     * DateTime.now().toSQL({ includeZone: false }) //=> '05:15:16.345 America/New_York'
     */
    toSQLTime(opts?: ToSQLOptions): string;

    /**
     * Returns a string representation of this DateTime appropriate for use in SQL DateTime
     *
     * @param opts - options
     * @param opts.includeZone - include the zone, such as 'America/New_York'. Overrides includeOffset. Defaults to false.
     * @param opts.includeOffset - include the offset, such as 'Z' or '-04:00'. Defaults to true.
     *
     * @example
     * DateTime.utc(2014, 7, 13).toSQL() //=> '2014-07-13 00:00:00.000 Z'
     * @example
     * DateTime.local(2014, 7, 13).toSQL() //=> '2014-07-13 00:00:00.000 -04:00'
     * @example
     * DateTime.local(2014, 7, 13).toSQL({ includeOffset: false }) //=> '2014-07-13 00:00:00.000'
     * @example
     * DateTime.local(2014, 7, 13).toSQL({ includeZone: true }) //=> '2014-07-13 00:00:00.000 America/New_York'
     */
    toSQL(opts?: ToSQLOptions): string;

    /**
     * Returns a string representation of this DateTime appropriate for debugging
     */
    toString(): string;

    /**
     * Returns the epoch milliseconds of this DateTime. Alias of {@link DateTime.toMillis}
     */
    valueOf(): number;

    /**
     * Returns the epoch milliseconds of this DateTime.
     */
    toMillis(): number;

    /**
     * Returns the epoch seconds of this DateTime.
     */
    toSeconds(): number;

    /**
     * Returns the epoch seconds (as a whole number) of this DateTime.
     */
    toUnixInteger(): number;

    /**
     * Returns an ISO 8601 representation of this DateTime appropriate for use in JSON.
     */
    toJSON(): string;

    /**
     * Returns a BSON serializable equivalent to this DateTime.
     */
    toBSON(): Date;

    /**
     * Returns a JavaScript object with this DateTime's year, month, day, and so on.
     *
     * @param opts - options for generating the object
     * @param opts.includeConfig - include configuration attributes in the output. Defaults to false.
     *
     * @example
     * DateTime.now().toObject() //=> { year: 2017, month: 4, day: 22, hour: 20, minute: 49, second: 42, millisecond: 268 }
     */
    toObject(opts?: {
        /**
         * Include configuration attributes in the output
         * @defaultValue false
         */
        includeConfig?: boolean | undefined;
    }): ToObjectOutput;

    /**
     * Returns a JavaScript Date equivalent to this DateTime.
     */
    toJSDate(): Date;

    // COMPARE

    /**
     * Return the difference between two DateTimes as a Duration.
     *
     * @param otherDateTime - the DateTime to compare this one to
     * @param unit- the unit or array of units (such as 'hours' or 'days') to include in the duration. Defaults to ['milliseconds'].
     * @param opts - options that affect the creation of the Duration
     * @param opts.conversionAccuracy - the conversion system to use. Defaults to 'casual'.
     *
     * @example
     * var i1 = DateTime.fromISO('1982-05-25T09:45'),
     *     i2 = DateTime.fromISO('1983-10-14T10:30');
     * i2.diff(i1).toObject() //=> { milliseconds: 43807500000 }
     * i2.diff(i1, 'hours').toObject() //=> { hours: 12168.75 }
     * i2.diff(i1, ['months', 'days']).toObject() //=> { months: 16, days: 19.03125 }
     * i2.diff(i1, ['months', 'days', 'hours']).toObject() //=> { months: 16, days: 19, hours: 0.75 }
     */
    diff(otherDateTime: DateTime, unit?: DurationUnits, opts?: DiffOptions): Duration;

    /**
     * Return the difference between this DateTime and right now.
     * See {@link DateTime.diff}
     *
     * @param unit - the unit or units units (such as 'hours' or 'days') to include in the duration. Defaults to ['milliseconds'].
     * @param opts - options that affect the creation of the Duration
     * @param opts.conversionAccuracy - the conversion system to use. Defaults to 'casual'.
     */
    diffNow(unit?: DurationUnits, opts?: DiffOptions): Duration;

    /**
     * Return an Interval spanning between this DateTime and another DateTime
     *
     * @param otherDateTime - the other end point of the Interval
     */
    until(otherDateTime: DateTime): Interval;

    /**
     * Return whether this DateTime is in the same unit of time as another DateTime.
     * Note that time zones are **ignored** in this comparison, which compares the **local** calendar time. Use {@link DateTime.setZone} to convert one of the dates if needed.
     *
     * @param otherDateTime - the other DateTime
     * @param unit - the unit of time to check sameness on
     *
     * @example
     * DateTime.now().hasSame(otherDT, 'day'); //~> true if otherDT is in the same current calendar day
     */
    hasSame(otherDateTime: DateTime, unit: DateTimeUnit): boolean;

    /**
     * Equality check
     * Two DateTimes are equal if and only if they represent the same millisecond, have the same zone and location, and are both valid.
     * To compare just the millisecond values, use `+dt1 === +dt2`.
     *
     * @param other - the other DateTime
     */
    equals(other: DateTime): boolean;

    /**
     * Returns a string representation of a this time relative to now, such as "in two days". Can only internationalize if your
     * platform supports Intl.RelativeTimeFormat. Rounds down by default.
     *
     * @param options - options that affect the output
     * @param options.base - the DateTime to use as the basis to which this time is compared. Defaults to now.
     * @param options.style - the style of units, must be "long", "short", or "narrow". Defaults to long.
     * @param options.unit - use a specific unit or array of units; if omitted, or an array, the method will pick the best unit.
     * Use an array or one of "years", "quarters", "months", "weeks", "days", "hours", "minutes", or "seconds"
     * @param options.round - whether to round the numbers in the output. Defaults to true.
     * @param options.padding - padding in milliseconds. This allows you to round up the result if it fits inside the threshold. Don't use in combination with {round: false}
     * because the decimal output will include the padding. Defaults to 0.
     * @param options.locale - override the locale of this DateTime
     * @param options.numberingSystem - override the numberingSystem of this DateTime. The Intl system may choose not to honor this
     *
     * @example
     * DateTime.now().plus({ days: 1 }).toRelative() //=> "in 1 day"
     * @example
     * DateTime.now().setLocale("es").toRelative({ days: 1 }) //=> "dentro de 1 día"
     * @example
     * DateTime.now().plus({ days: 1 }).toRelative({ locale: "fr" }) //=> "dans 23 heures"
     * @example
     * DateTime.now().minus({ days: 2 }).toRelative() //=> "2 days ago"
     * @example
     * DateTime.now().minus({ days: 2 }).toRelative({ unit: "hours" }) //=> "48 hours ago"
     * @example
     * DateTime.now().minus({ hours: 36 }).toRelative({ round: false }) //=> "1.5 days ago"
     */
    toRelative(options?: ToRelativeOptions): string | null;

    /**
     * Returns a string representation of this date relative to today, such as "yesterday" or "next month".
     * Only internationalizes on platforms that supports Intl.RelativeTimeFormat.
     *
     * @param options - options that affect the output
     * @param options.base - the DateTime to use as the basis to which this time is compared. Defaults to now.
     * @param options.locale - override the locale of this DateTime
     * @param options.unit - use a specific unit; if omitted, the method will pick the unit. Use one of "years", "quarters", "months", "weeks", or "days"
     * @param options.numberingSystem - override the numberingSystem of this DateTime. The Intl system may choose not to honor this
     *
     * @example
     * DateTime.now().plus({ days: 1 }).toRelativeCalendar() //=> "tomorrow"
     * @example
     * DateTime.now().setLocale("es").plus({ days: 1 }).toRelative() //=> ""mañana"
     * @example
     * DateTime.now().plus({ days: 1 }).toRelativeCalendar({ locale: "fr" }) //=> "demain"
     * @example
     * DateTime.now().minus({ days: 2 }).toRelativeCalendar() //=> "2 days ago"
     */
    toRelativeCalendar(options?: ToRelativeCalendarOptions): string | null;

    /**
     * Return the min of several date times
     *
     * @param dateTimes - the DateTimes from which to choose the minimum
     */
    static min(...dateTimes: DateTime[]): DateTime;

    /**
     * Return the max of several date times
     *
     * @param dateTimes - the DateTimes from which to choose the maximum
     */
    static max(...dateTimes: DateTime[]): DateTime;

    // MISC

    /**
     * Explain how a string would be parsed by fromFormat()
     *
     * @param text - the string to parse
     * @param fmt - the format the string is expected to be in (see description)
     * @param options - options taken by fromFormat()
     */
    static fromFormatExplain(text: string, fmt: string, options?: DateTimeOptions): ExplainedFormat;

    /**
     * @deprecated use fromFormatExplain instead
     */
    static fromStringExplain(text: string, fmt: string, options?: DateTimeOptions): ExplainedFormat;

    // FORMAT PRESETS

    /**
     * {@link DateTime.toLocaleString} format like 10/14/1983
     */
    static get DATE_SHORT(): Intl.DateTimeFormatOptions;

    /**
     * {@link DateTime.toLocaleString} format like 'Oct 14, 1983'
     */
    static get DATE_MED(): Intl.DateTimeFormatOptions;

    /**
     * {@link DateTime.toLocaleString} format like 'Fri, Oct 14, 1983'
     */
    static get DATE_MED_WITH_WEEKDAY(): Intl.DateTimeFormatOptions;

    /**
     * {@link DateTime.toLocaleString} format like 'October 14, 1983'
     */
    static get DATE_FULL(): Intl.DateTimeFormatOptions;

    /**
     * {@link DateTime.toLocaleString} format like 'Tuesday, October 14, 1983'
     */
    static get DATE_HUGE(): Intl.DateTimeFormatOptions;

    /**
     * {@link DateTime.toLocaleString} format like '09:30 AM'. Only 12-hour if the locale is.
     */
    static get TIME_SIMPLE(): Intl.DateTimeFormatOptions;

    /**
     * {@link DateTime.toLocaleString} format like '09:30:23 AM'. Only 12-hour if the locale is.
     */
    static get TIME_WITH_SECONDS(): Intl.DateTimeFormatOptions;

    /**
     * {@link DateTime.toLocaleString} format like '09:30:23 AM EDT'. Only 12-hour if the locale is.
     */
    static get TIME_WITH_SHORT_OFFSET(): Intl.DateTimeFormatOptions;

    /**
     * {@link DateTime.toLocaleString} format like '09:30:23 AM Eastern Daylight Time'. Only 12-hour if the locale is.
     */
    static get TIME_WITH_LONG_OFFSET(): Intl.DateTimeFormatOptions;

    /**
     * {@link DateTime.toLocaleString} format like '09:30', always 24-hour.
     */
    static get TIME_24_SIMPLE(): Intl.DateTimeFormatOptions;

    /**
     * {@link DateTime.toLocaleString} format like '09:30:23', always 24-hour.
     */
    static get TIME_24_WITH_SECONDS(): Intl.DateTimeFormatOptions;

    /**
     * {@link DateTime.toLocaleString} format like '09:30:23 EDT', always 24-hour.
     */
    static get TIME_24_WITH_SHORT_OFFSET(): Intl.DateTimeFormatOptions;

    /**
     * {@link DateTime.toLocaleString} format like '09:30:23 Eastern Daylight Time', always 24-hour.
     */
    static get TIME_24_WITH_LONG_OFFSET(): Intl.DateTimeFormatOptions;

    /**
     * {@link DateTime.toLocaleString} format like '10/14/1983, 9:30 AM'. Only 12-hour if the locale is.
     */
    static get DATETIME_SHORT(): Intl.DateTimeFormatOptions;

    /**
     * {@link DateTime.toLocaleString} format like '10/14/1983, 9:30:33 AM'. Only 12-hour if the locale is.
     */
    static get DATETIME_SHORT_WITH_SECONDS(): Intl.DateTimeFormatOptions;

    /**
     * {@link DateTime.toLocaleString} format like 'Oct 14, 1983, 9:30 AM'. Only 12-hour if the locale is.
     */
    static get DATETIME_MED(): Intl.DateTimeFormatOptions;

    /**
     * {@link DateTime.toLocaleString} format like 'Oct 14, 1983, 9:30:33 AM'. Only 12-hour if the locale is.
     */
    static get DATETIME_MED_WITH_SECONDS(): Intl.DateTimeFormatOptions;

    /**
     * {@link DateTime.toLocaleString} format like 'Fri, 14 Oct 1983, 9:30 AM'. Only 12-hour if the locale is.
     */
    static get DATETIME_MED_WITH_WEEKDAY(): Intl.DateTimeFormatOptions;

    /**
     * {@link DateTime.toLocaleString} format like 'October 14, 1983, 9:30 AM EDT'. Only 12-hour if the locale is.
     */
    static get DATETIME_FULL(): Intl.DateTimeFormatOptions;

    /**
     * {@link DateTime.toLocaleString} format like 'October 14, 1983, 9:30:33 AM EDT'. Only 12-hour if the locale is.
     */
    static get DATETIME_FULL_WITH_SECONDS(): Intl.DateTimeFormatOptions;

    /**
     * {@link DateTime.toLocaleString} format like 'Friday, October 14, 1983, 9:30 AM Eastern Daylight Time'. Only 12-hour if the locale is.
     */
    static get DATETIME_HUGE(): Intl.DateTimeFormatOptions;

    /**
     * {@link DateTime.toLocaleString} format like 'Friday, October 14, 1983, 9:30:33 AM Eastern Daylight Time'. Only 12-hour if the locale is.
     */
    static get DATETIME_HUGE_WITH_SECONDS(): Intl.DateTimeFormatOptions;
}
