import {
    CalendarSystem,
    DateTimeFormatOptions,
    NumberingSystem,
    StringUnitLength,
    ToISOTimeDurationOptions,
    WeekSettings,
    ZoneOptions,
} from "../index";
import { CanBeInvalid, DefaultValidity, IfValid, Invalid, Valid } from "./_util";
import { Duration, DurationLike, DurationUnits } from "./duration";
import { Interval } from "./interval";
import { Zone } from "./zone";

export {}; // Turn off default exports

export type DateTimeUnit = "year" | "quarter" | "month" | "week" | "day" | "hour" | "minute" | "second" | "millisecond";
export type ToRelativeUnit = "years" | "quarters" | "months" | "weeks" | "days" | "hours" | "minutes" | "seconds";

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

export type ToObjectOutput<
    IncludeConfig extends boolean | undefined = undefined,
    IsValid extends boolean | undefined = undefined,
> = IsValid extends true ? _ToObjectOutput<IncludeConfig>
    : CanBeInvalid extends false ? _ToObjectOutput<IncludeConfig>
    : Partial<_ToObjectOutput<IncludeConfig>>;
/** @internal */
export type _ToObjectOutput<IncludeConfig extends boolean | undefined = undefined> =
    & Record<_ToObjectUnit, number>
    & (IncludeConfig extends true ? LocaleOptions : unknown);
/** @internal */
export type _ToObjectUnit = Exclude<DateTimeUnit, "quarter" | "week">;

export interface ToRelativeOptions extends Omit<ToRelativeCalendarOptions, "unit"> {
    /**
     * The style of units, must be "long", "short", or "narrow".
     * @default long
     */
    style?: StringUnitLength | undefined;
    /**
     * A single unit or an array of units. If an array is supplied, the method will pick the best one
     * to use from the array. If omitted, the method will pick the unit from a default set.
     */
    unit?: ToRelativeUnit | ToRelativeUnit[] | undefined;
    /**
     * Whether or not to round the numbers in the output.
     * @default true
     */
    round?: boolean | undefined;
    /**
     * Rounding method to use when rounding the numbers in the output
     * @default 'trunc'
     */
    rounding?: "trunc" | "expand" | "round" | "floor" | "ceil" | undefined;
    /**
     * Padding in milliseconds. This allows you to round up the result if it fits inside the threshold.
     * Do not use this in combination with `{round: false}` because the decimal output will include the padding.
     * @default 0
     */
    padding?: number | undefined;
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

export interface ToISODateOptions extends Pick<ToISOTimeDurationOptions, "format"> {
    /**
     * Truncate output to desired presicion.
     * @default 'day'
     */
    precision?: "year" | "years" | "month" | "months" | "day" | "days" | undefined;
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

    /**
     * Truncate output to desired presicion.
     * When precision and suppressSeconds or suppressMilliseconds are used together,
     * precision sets the maximum unit shown in the output,
     * however seconds or milliseconds will still be suppressed if they are 0.
     * @default 'milliseconds'
     */
    precision?:
        | "year"
        | "years"
        | "month"
        | "months"
        | "day"
        | "days"
        | "hour"
        | "hours"
        | "minute"
        | "minutes"
        | "second"
        | "seconds"
        | "millisecond"
        | "milliseconds";
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
    weekSettings?: WeekSettings | undefined;
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

export type DateTimeJSOptions = Omit<DateTimeOptions, "setZone">;

/**
 * Note that ISO weekday and local weekday fields are mutually exclusive
 */
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
    // a week year, according to the locale
    localWeekYear?: number | undefined;
    // an ISO week number, between 1 and 52 or 53, depending on the year
    weekNumber?: number | undefined;
    // a week number, between 1 and 52 or 53, depending on the year, according to the locale
    localWeekNumber?: number | undefined;
    // an ISO weekday, 1-7, where 1 is Monday and 7 is Sunday
    weekday?: WeekdayNumbers | undefined;
    // a weekday, 1-7, where 1 is the first day of the week, and 7 is the last, according to the locale
    localWeekday?: WeekdayNumbers | undefined;
    // hour of the day, 0-23
    hour?: number | undefined;
    // minute of the hour, 0-59
    minute?: number | undefined;
    // second of the minute, 0-59
    second?: number | undefined;
    // millisecond of the second, 0-999
    millisecond?: number | undefined;
}

export type ConversionAccuracy = "casual" | "longterm";

/**
 * @deprecated You should use `Intl.DateTimeFormatOptions` fields and values instead.
 */
export type DateTimeFormatPresetValue = "numeric" | "short" | "long";
/**
 * @deprecated Use `Intl.DateTimeFormatOptions` instead.
 */
export type DateTimeFormatPreset = Intl.DateTimeFormatOptions;

export interface DiffOptions {
    /**
     * @default 'casual'
     */
    conversionAccuracy?: ConversionAccuracy | undefined;
}

export interface _UseLocaleWeekOption {
    /** If true, use weeks based on the locale, i.e., use the locale-dependent start of the week */
    useLocaleWeeks?: boolean;
}

export type HasSameOptions = _UseLocaleWeekOption;
export type StartOfOptions = _UseLocaleWeekOption;
export type EndOfOptions = _UseLocaleWeekOption;

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

export type DateTimeMaybeValid = CanBeInvalid extends true ? (DateTime<Valid> | DateTime<Invalid>) : DateTime;

declare const tokenParserBrand: unique symbol;
export interface TokenParser {
    [tokenParserBrand]: true;
}

type ManyDateTimes = Array<DateTime<boolean>>;

export type PickedDateTime<Values extends ManyDateTimes> = Values extends [] ? undefined
    :
        | (Values extends Array<DateTime<infer AllValues>> ?
                | (AllValues extends true ? DateTime<Valid> : never)
                | (AllValues extends false ? DateTime<Invalid> : never)
            : never)
        | ([] extends Values ? undefined : never);

/**
 * # Table of tokens
 *
 * (The example values below come from this time `2014-08-06T13:07:04.054`
 * considered as a local time in America/New_York).
 *
 * Note that many tokens supported by the formatter are **not** supported by the parser.
 *
 * | Standalone token | Format token | Description                                                       | Example                     |
 * | ---------------- | ------------ | ----------------------------------------------------------------- | --------------------------- |
 * | S                |              | millisecond, no padding                                           | `54`                        |
 * | SSS              |              | millisecond, padded to 3                                          | `054`                       |
 * | u                |              | fractional seconds, (5 is a half second, 54 is slightly more)     | `54`                        |
 * | uu               |              | fractional seconds, (one or two digits)                           | `05`                        |
 * | uuu              |              | fractional seconds, (only one digit)                              | `5`                         |
 * | s                |              | second, no padding                                                | `4`                         |
 * | ss               |              | second, padded to 2 padding                                       | `04`                        |
 * | m                |              | minute, no padding                                                | `7`                         |
 * | mm               |              | minute, padded to 2                                               | `07`                        |
 * | h                |              | hour in 12-hour time, no padding                                  | `1`                         |
 * | hh               |              | hour in 12-hour time, padded to 2                                 | `01`                        |
 * | H                |              | hour in 24-hour time, no padding                                  | `13`                        |
 * | HH               |              | hour in 24-hour time, padded to 2                                 | `13`                        |
 * | Z                |              | narrow offset                                                     | `+5`                        |
 * | ZZ               |              | short offset                                                      | `+05:00`                    |
 * | ZZZ              |              | techie offset                                                     | `+0500`                     |
 * | z                |              | IANA zone                                                         | `America/New_York`          |
 * | a                |              | meridiem                                                          | `AM`                        |
 * | d                |              | day of the month, no padding                                      | `6`                         |
 * | dd               |              | day of the month, padded to 2                                     | `06`                        |
 * | E                | c            | day of the week, as number from 1-7 (Monday is 1, Sunday is 7)    | `3`                         |
 * | EEE              | ccc          | day of the week, as an abbreviate localized string                | `Wed`                       |
 * | EEEE             | cccc         | day of the week, as an unabbreviated localized string             | `Wednesday`                 |
 * | M                | L            | month as an unpadded number                                       | `8`                         |
 * | MM               | LL           | month as an padded number                                         | `08`                        |
 * | MMM              | LLL          | month as an abbreviated localized string                          | `Aug`                       |
 * | MMMM             | LLLL         | month as an unabbreviated localized string                        | `August`                    |
 * | y                |              | year, 1-6 digits, very literally                                  | `2014`                      |
 * | yy               |              | two-digit year, interpreted as > 1960 by default (also accepts 4) | `14`                        |
 * | yyyy             |              | four-digit year                                                   | `2014`                      |
 * | yyyyy            |              | four- to six-digit years                                          | `10340`                     |
 * | yyyyyy           |              | six-digit years                                                   | `010340`                    |
 * | G                |              | abbreviated localized era                                         | `AD`                        |
 * | GG               |              | unabbreviated localized era                                       | `Anno Domini`               |
 * | GGGGG            |              | one-letter localized era                                          | `A`                         |
 * | kk               |              | ISO week year, unpadded                                           | `17`                        |
 * | kkkk             |              | ISO week year, padded to 4                                        | `2014`                      |
 * | W                |              | ISO week number, unpadded                                         | `32`                        |
 * | WW               |              | ISO week number, padded to 2                                      | `32`                        |
 * | o                |              | ordinal (day of year), unpadded                                   | `218`                       |
 * | ooo              |              | ordinal (day of year), padded to 3                                | `218`                       |
 * | q                |              | quarter, no padding                                               | `3`                         |
 * | D                |              | localized numeric date                                            | `9/6/2014`                  |
 * | DD               |              | localized date with abbreviated month                             | `Aug 6, 2014`               |
 * | DDD              |              | localized date with full month                                    | `August 6, 2014`            |
 * | DDDD             |              | localized date with full month and weekday                        | `Wednesday, August 6, 2014` |
 * | t                |              | localized time                                                    | `1:07 AM`                   |
 * | tt               |              | localized time with seconds                                       | `1:07:04 PM`                |
 * | T                |              | localized 24-hour time                                            | `13:07`                     |
 * | TT               |              | localized 24-hour time with seconds                               | `13:07:04`                  |
 * | f                |              | short localized date and time                                     | `8/6/2014, 1:07 PM`         |
 * | ff               |              | less short localized date and time                                | `Aug 6, 2014, 1:07 PM`      |
 * | F                |              | short localized date and time with seconds                        | `8/6/2014, 1:07:04 PM`      |
 * | FF               |              | less short localized date and time with seconds                   | `Aug 6, 2014, 1:07:04 PM`   |
 * | '                |              | literal start/end, characters between are not tokenized           | `'T'`                       |
 *
 * Sourced from [here](https://moment.github.io/luxon/#/parsing?id=table-of-tokens).
 */
type Tokens = string;

/**
 * A DateTime is an immutable data structure representing a specific date and time and accompanying methods.
 * It contains class and instance methods for creating, parsing, interrogating, transforming, and formatting them.
 *
 * A DateTime consists of the following parts:
 * * A timestamp. Each DateTime instance refers to a specific millisecond of the Unix epoch.
 * * A time zone. Each instance is considered in the context of a specific zone (by default, the local system's zone).
 * * Configuration properties that affect how output strings are formatted, such as `locale`, `numberingSystem`, and `outputCalendar`.
 *
 * Here is a brief overview of the most commonly used functionality it provides:
 *
 * * **Creation**: To create a DateTime from its components, use one of its factory class methods: {@link DateTime.local}, {@link DateTime.utc}, and (most flexibly) {@link DateTime.fromObject}.
 * To create one from a standard string format, use {@link DateTime.fromISO}, {@link DateTime.fromHTTP}, and {@link DateTime.fromRFC2822}.
 * To create one from a custom string format, use {@link DateTime.fromFormat}. To create one from a native JS date, use {@link DateTime.fromJSDate}.
 * * **Gregorian calendar and time**: To examine the Gregorian properties of a DateTime individually (i.e. as opposed to collectively through {@link DateTime#toObject}), use the {@link DateTime#year},
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
export class DateTime<IsValid extends boolean = DefaultValidity> {
    /**
     * Create a DateTime for the current instant, in the system's time zone.
     *
     * Use Settings to override these default values if needed.
     * @example
     * DateTime.now().toISO() //~> now in the ISO format
     */
    static now(): DateTime<Valid>;

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
     * @param opts
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
    ): DateTimeMaybeValid;
    static local(
        year: number,
        month: number,
        day: number,
        hour: number,
        minute: number,
        second: number,
        opts?: DateTimeJSOptions,
    ): DateTimeMaybeValid;
    static local(
        year: number,
        month: number,
        day: number,
        hour: number,
        minute: number,
        opts?: DateTimeJSOptions,
    ): DateTimeMaybeValid;
    static local(year: number, month: number, day: number, hour: number, opts?: DateTimeJSOptions): DateTimeMaybeValid;
    static local(year: number, month: number, day: number, opts?: DateTimeJSOptions): DateTimeMaybeValid;
    static local(year: number, month: number, opts?: DateTimeJSOptions): DateTimeMaybeValid;
    static local(year: number, opts?: DateTimeJSOptions): DateTimeMaybeValid;
    static local(opts?: DateTimeJSOptions): DateTime<Valid>;

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
    ): DateTimeMaybeValid;
    static utc(
        year: number,
        month: number,
        day: number,
        hour: number,
        minute: number,
        second: number,
        options?: LocaleOptions,
    ): DateTimeMaybeValid;
    static utc(
        year: number,
        month: number,
        day: number,
        hour: number,
        minute: number,
        options?: LocaleOptions,
    ): DateTimeMaybeValid;
    static utc(year: number, month: number, day: number, hour: number, options?: LocaleOptions): DateTimeMaybeValid;
    static utc(year: number, month: number, day: number, options?: LocaleOptions): DateTimeMaybeValid;
    static utc(year: number, month: number, options?: LocaleOptions): DateTimeMaybeValid;
    static utc(year: number, options?: LocaleOptions): DateTimeMaybeValid;
    static utc(options?: LocaleOptions): DateTime<Valid>;

    /**
     * Create a DateTime from a JavaScript Date object. Uses the default zone.
     *
     * @param date - a JavaScript Date object
     * @param options - configuration options for the DateTime
     * @param options.zone - the zone to place the DateTime into
     */
    static fromJSDate(date: Date, options?: { zone?: string | Zone }): DateTimeMaybeValid;

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
    static fromMillis(milliseconds: number, options?: DateTimeJSOptions): DateTimeMaybeValid;

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
    static fromSeconds(seconds: number, options?: DateTimeJSOptions): DateTimeMaybeValid;

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
     * DateTime.fromObject({ hour: 10, minute: 26, second: 6 }) //=> today at 10:26:06
     * @example
     * DateTime.fromObject({ hour: 10, minute: 26, second: 6 }, { zone: 'utc' })
     * @example
     * DateTime.fromObject({ hour: 10, minute: 26, second: 6 }, { zone: 'local' })
     * @example
     * DateTime.fromObject({ hour: 10, minute: 26, second: 6 }, { zone: 'America/New_York' })
     * @example
     * DateTime.fromObject({ weekYear: 2016, weekNumber: 2, weekday: 3 }).toISODate() //=> '2016-01-13'
     * @example
     * DateTime.fromObject({ localWeekYear: 2022, localWeekNumber: 1, localWeekday: 1 }, { locale: 'en-US' }).toISODate() //=> '2021-12-26'
     */
    static fromObject(obj: DateObjectUnits, opts?: DateTimeJSOptions): DateTimeMaybeValid;

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
    static fromISO(text: string, opts?: DateTimeOptions): DateTimeMaybeValid;

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
    static fromRFC2822(text: string, opts?: DateTimeOptions): DateTimeMaybeValid;

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
    static fromHTTP(text: string, opts?: DateTimeOptions): DateTimeMaybeValid;

    /**
     * Create a DateTime from an input string and format string.
     *
     * Defaults to en-US if no locale has been specified, regardless of the system's locale.
     *
     * For a table of tokens and their interpretations,
     * see [here](https://moment.github.io/luxon/#/parsing?id=table-of-tokens).
     *
     * @param text - the string to parse
     * @param format - the format the string is expected to be in (see the link below for the formats)
     * @param opts - options to affect the creation
     * @param opts.zone - use this zone if no offset is specified in the input string itself.
     * Will also convert the DateTime to this zone.
     * Defaults to 'local'.
     * @param opts.setZone - override the zone with a zone specified in the string itself, if it specifies one.
     * Defaults to false.
     * @param opts.locale - a locale string to use when parsing.
     * Will also set the DateTime to this locale.
     * Defaults to 'en-US'.
     * @param opts.numberingSystem - the numbering system to use when parsing.
     * Will also set the resulting DateTime to this numbering system
     * @param opts.outputCalendar - the output calendar to set on the resulting DateTime instance
     */
    static fromFormat(text: string, format: Tokens, opts?: DateTimeOptions): DateTimeMaybeValid;

    /**
     * @deprecated use fromFormat instead
     */
    static fromString(text: string, format: Tokens, options?: DateTimeOptions): DateTimeMaybeValid;

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
    static fromSQL(text: string, opts?: DateTimeOptions): DateTimeMaybeValid;

    /**
     * Create an invalid DateTime.
     *
     * @param reason - simple string of why this DateTime is invalid. Should not contain parameters or anything else data-dependent
     * @param explanation - longer explanation, may include parameters and other useful debugging information. Defaults to null.
     */
    static invalid(reason: string, explanation?: string): DateTime<Invalid>;

    /**
     * Check if an object is a DateTime. Works across context boundaries
     *
     * @param o
     */
    static isDateTime(o: unknown): o is DateTimeMaybeValid;

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
     *
     * Does NOT quote characters, so quoted tokens will not round trip correctly
     *
     * @param format - the format string - see {@link Tokens}
     * @param localeOptions - Options to override the configuration options on this DateTime
     */
    static expandFormat(format: Tokens, localeOptions?: LocaleOptions): string;

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
     * Get those DateTimes which have the same local time as this DateTime, but a different offset from UTC in this DateTime's zone.
     * During DST changes local time can be ambiguous, for example 2023-10-29T02:30:00 in Europe/Berlin can have offset +01:00 or +02:00.
     * This method will return both possible DateTimes if this DateTime's local time is ambiguous.
     */
    getPossibleOffsets(): this[];

    /**
     * Returns whether the DateTime is valid. Invalid DateTimes occur when:
     * * The DateTime was created from invalid calendar information, such as the 13th month or February 30
     * * The DateTime was created by an operation on another invalid date
     */
    get isValid(): IfValid<true, false, IsValid>;

    /**
     * Returns an error code if this DateTime is invalid, or null if the DateTime is valid
     */
    get invalidReason(): IfValid<null, string, IsValid>;

    /**
     * Returns an explanation of why this DateTime became invalid, or null if the DateTime is valid
     */
    get invalidExplanation(): IfValid<null, string | null, IsValid>;

    /**
     * Get the locale of a DateTime, such as 'en-GB'. The locale is used when formatting the DateTime
     */
    get locale(): IfValid<string, null, IsValid>;

    /**
     * Get the numbering system of a DateTime, such as 'beng'. The numbering system is used when formatting the DateTime
     */
    get numberingSystem(): IfValid<string, null, IsValid>;

    /**
     * Get the output calendar of a DateTime, such as 'islamic'. The output calendar is used when formatting the DateTime
     */
    get outputCalendar(): IfValid<string, null, IsValid>;

    /**
     * Get the time zone associated with this DateTime.
     */
    get zone(): Zone<IsValid>;

    /**
     * Get the name of the time zone.
     */
    get zoneName(): IfValid<string, null, IsValid>;

    /**
     * Get the year
     *
     * @example DateTime.local(2017, 5, 25).year //=> 2017
     */
    get year(): IfValid<number, typeof NaN, IsValid>;

    /**
     * Get the quarter
     *
     * @example DateTime.local(2017, 5, 25).quarter //=> 2
     */
    get quarter(): IfValid<QuarterNumbers, typeof NaN, IsValid>;

    /**
     * Get the month (1-12).
     *
     * @example DateTime.local(2017, 5, 25).month //=> 5
     */
    get month(): IfValid<MonthNumbers, typeof NaN, IsValid>;

    /**
     * Get the day of the month (1-30ish).
     *
     * @example DateTime.local(2017, 5, 25).day //=> 25
     */
    get day(): IfValid<DayNumbers, typeof NaN, IsValid>;

    /**
     * Get the hour of the day (0-23).
     *
     * @example DateTime.local(2017, 5, 25, 9).hour //=> 9
     */
    get hour(): IfValid<HourNumbers, typeof NaN, IsValid>;

    /**
     * Get the minute of the hour (0-59).
     *
     * @example
     * DateTime.local(2017, 5, 25, 9, 30).minute //=> 30
     */
    get minute(): IfValid<MinuteNumbers, typeof NaN, IsValid>;

    /**
     * Get the second of the minute (0-59).
     *
     * @example
     * DateTime.local(2017, 5, 25, 9, 30, 52).second //=> 52
     */
    get second(): IfValid<SecondNumbers, typeof NaN, IsValid>;

    /**
     * Get the millisecond of the second (0-999).
     *
     * @example
     * DateTime.local(2017, 5, 25, 9, 30, 52, 654).millisecond //=> 654
     */
    get millisecond(): IfValid<number, typeof NaN, IsValid>;

    /**
     * Get the week year
     * @see https://en.wikipedia.org/wiki/ISO_week_date
     *
     * @example
     * DateTime.local(2014, 12, 31).weekYear //=> 2015
     */
    get weekYear(): IfValid<number, typeof NaN, IsValid>;

    /**
     * Get the week number of the week year (1-52ish).
     * @see https://en.wikipedia.org/wiki/ISO_week_date
     *
     * @example
     * DateTime.local(2017, 5, 25).weekNumber //=> 21
     */
    get weekNumber(): IfValid<WeekNumbers, typeof NaN, IsValid>;

    /**
     * Get the day of the week.
     * 1 is Monday and 7 is Sunday
     * @see https://en.wikipedia.org/wiki/ISO_week_date
     *
     * @example
     * DateTime.local(2014, 11, 31).weekday //=> 4
     */
    get weekday(): IfValid<WeekdayNumbers, typeof NaN, IsValid>;

    /**
     * Returns true if this date is on a weekend, according to the locale, false otherwise
     */
    get isWeekend(): IfValid<boolean, false, IsValid>;

    /**
     * Get the day of the week, according to the locale.
     * 1 is the first day of the week, and 7 is the last day of the week.
     * If the locale assigns Sunday as the first day of the week, then a date which is a Sunday will return 1.
     */
    get localWeekday(): IfValid<WeekdayNumbers, typeof NaN, IsValid>;

    /**
     * Get the week number of the week year, according to the locale.
     * Different locales assign week numbers differently.
     * The week can start on different days of the week (see {@link localWeekday}),
     * and because a different number of days is required for a week to count as the first week of a year.
     */
    get localWeekNumber(): IfValid<number, typeof NaN, IsValid>;

    /**
     * Get the week year, according to the locale.
     * Different locales assign week numbers (and therefore week years) differently, see {@link localWeekNumber}.
     */
    get localWeekYear(): IfValid<number, typeof NaN, IsValid>;

    /**
     * Get the ordinal (meaning the day of the year)
     *
     * @example
     * DateTime.local(2017, 5, 25).ordinal //=> 145
     */
    get ordinal(): IfValid<number, typeof NaN, IsValid>;

    /**
     * Get the human readable short month name, such as 'Oct'.
     * Defaults to the system's locale if no locale has been specified
     *
     * @example
     * DateTime.local(2017, 10, 30).monthShort //=> Oct
     */
    get monthShort(): IfValid<string, null, IsValid>;

    /**
     * Get the human readable long month name, such as 'October'.
     * Defaults to the system's locale if no locale has been specified
     *
     * @example
     * DateTime.local(2017, 10, 30).monthLong //=> October
     */
    get monthLong(): IfValid<string, null, IsValid>;

    /**
     * Get the human readable short weekday, such as 'Mon'.
     * Defaults to the system's locale if no locale has been specified
     *
     * @example
     * DateTime.local(2017, 10, 30).weekdayShort //=> Mon
     */
    get weekdayShort(): IfValid<string, null, IsValid>;

    /**
     * Get the human readable long weekday, such as 'Monday'.
     * Defaults to the system's locale if no locale has been specified
     *
     * @example
     * DateTime.local(2017, 10, 30).weekdayLong //=> Monday
     */
    get weekdayLong(): IfValid<string, null, IsValid>;

    /**
     * Get the UTC offset of this DateTime in minutes
     *
     * @example
     * DateTime.now().offset //=> -240
     * @example
     * DateTime.utc().offset //=> 0
     */
    get offset(): IfValid<number, typeof NaN, IsValid>;

    /**
     * Get the short human name for the zone's current offset, for example "EST" or "EDT".
     * Defaults to the system's locale if no locale has been specified
     */
    get offsetNameShort(): IfValid<string, null, IsValid>;

    /**
     * Get the long human name for the zone's current offset, for example "Eastern Standard Time" or "Eastern Daylight Time".
     * Defaults to the system's locale if no locale has been specified
     */
    get offsetNameLong(): IfValid<string, null, IsValid>;

    /**
     * Get whether this zone's offset ever changes, as in a DST.
     */
    get isOffsetFixed(): IfValid<boolean, null, IsValid>;

    /**
     * Get whether the DateTime is in a DST.
     */
    get isInDST(): IfValid<boolean, false, IsValid>;

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
    get daysInMonth(): IfValid<PossibleDaysInMonth, undefined, IsValid>;

    /**
     * Returns the number of days in this DateTime's year
     *
     * @example
     * DateTime.local(2016).daysInYear //=> 366
     * @example
     * DateTime.local(2013).daysInYear //=> 365
     */
    get daysInYear(): IfValid<PossibleDaysInYear, typeof NaN, IsValid>;

    /**
     * Returns the number of weeks in this DateTime's year
     * @see https://en.wikipedia.org/wiki/ISO_week_date
     *
     * @example
     * DateTime.local(2004).weeksInWeekYear //=> 53
     * @example
     * DateTime.local(2013).weeksInWeekYear //=> 52
     */
    get weeksInWeekYear(): IfValid<PossibleWeeksInYear, typeof NaN, IsValid>;

    /**
     * Returns the number of weeks in this DateTime's local week year
     *
     * @example
     * DateTime.local(2020, 6, {locale: 'en-US'}).weeksInLocalWeekYear //=> 52
     * @example
     * DateTime.local(2020, 6, {locale: 'de-DE'}).weeksInLocalWeekYear //=> 53
     */
    get weeksInLocalWeekYear(): IfValid<PossibleWeeksInYear, typeof NaN, IsValid>;

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
    toUTC(offset?: number, opts?: ZoneOptions): this;

    /**
     * "Set" the DateTime's zone to the host's local zone. Returns a newly-constructed DateTime.
     *
     * Equivalent to `setZone('local')`
     */
    toLocal(): this;

    /**
     * "Set" the DateTime's zone to specified zone. Returns a newly-constructed DateTime.
     *
     * By default, the setter keeps the underlying time the same (as in, the same timestamp), but the new instance will report different local times and consider DSTs when making computations,
     * as with {@link DateTime.plus}. You may wish to use {@link DateTime.toLocal} and {@link DateTime.toUTC} which provide simple convenience wrappers for commonly used zones.
     *
     * @param zone - a zone identifier. As a string, that can be any IANA zone supported by the host environment, or a fixed-offset name of the form 'UTC+3', or the strings 'local' or 'utc'.
     * You may also supply an instance of a {@link Zone} class. Defaults to 'local'.
     * @param opts - options
     * @param opts.keepLocalTime - If true, adjust the underlying time so that the local time stays the same, but in the target zone. You should rarely need this. Defaults to false.
     */
    setZone(zone?: string | Zone, opts?: ZoneOptions): DateTimeMaybeValid;

    /**
     * "Set" the locale, numberingSystem, or outputCalendar. Returns a newly-constructed DateTime.
     *
     * @param properties - the properties to set
     *
     * @example
     * DateTime.local(2017, 5, 25).reconfigure({ locale: 'en-GB' })
     */
    reconfigure(properties: LocaleOptions): this;

    /**
     * "Set" the locale. Returns a newly-constructed DateTime.
     * Just a convenient alias for reconfigure({ locale })
     *
     * @example
     * DateTime.local(2017, 5, 25).setLocale('en-GB')
     */
    setLocale(locale: string): this;

    /**
     * "Set" the values of specified units. Returns a newly-constructed DateTime.
     * You can only set units with this method; for "setting" metadata, see {@link DateTime.reconfigure} and {@link DateTime.setZone}.
     *
     * This method also supports setting locale-based week units, i.e. `localWeekday`, `localWeekNumber` and `localWeekYear`.
     * They cannot be mixed with ISO-week units like `weekday`.
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
    set(values: DateObjectUnits): this;

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
    plus(duration: DurationLike): this;

    /**
     * See {@link DateTime.plus}
     *
     * @param duration - The amount to subtract. Either a Luxon Duration, a number of milliseconds, the object argument to Duration.fromObject()
     */
    minus(duration: DurationLike): this;

    /**
     * "Set" this DateTime to the beginning of the given unit.
     *
     * @param unit - The unit to go to the beginning of. Can be 'year', 'quarter', 'month', 'week', 'day', 'hour', 'minute', 'second', or 'millisecond'.
     * @param opts - options
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
    startOf(unit: DateTimeUnit, opts?: StartOfOptions): this;

    /**
     * "Set" this DateTime to the end (meaning the last millisecond) of a unit of time
     *
     * @param unit - The unit to go to the end of. Can be 'year', 'quarter', 'month', 'week', 'day', 'hour', 'minute', 'second', or 'millisecond'.
     * @param opts - options
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
    endOf(unit: DateTimeUnit, opts?: EndOfOptions): this;

    // OUTPUT

    /**
     * Returns a string representation of this DateTime formatted according to the specified format string.
     * **You may not want this.** See {@link DateTime.toLocaleString} for a more flexible formatting tool. For a table of tokens and their interpretations,
     * see [here](https://moment.github.io/luxon/#/formatting?id=table-of-tokens).
     * Defaults to en-US if no locale has been specified, regardless of the system's locale.
     *
     * @param format - the format string - see {@link Tokens}
     * @param options - opts to override the configuration options on this DateTime
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
    toFormat(format: Tokens, options?: LocaleOptions): IfValid<string, "Invalid DateTime", IsValid>;

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
    toLocaleString(
        formatOpts?: DateTimeFormatOptions,
        opts?: LocaleOptions,
    ): IfValid<string, "Invalid DateTime", IsValid>;

    /**
     * Returns an array of format "parts", meaning individual tokens along with metadata. This is allows callers to post-process individual sections of the formatted output.
     * Defaults to the system's locale if no locale has been specified
     * @see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/DateTimeFormat/formatToParts
     *
     * @example
     * DateTime.now().toLocaleParts(); //=> [
     *                                 //=>   { type: 'day', value: '25' },
     *                                 //=>   { type: 'literal', value: '/' },
     *                                 //=>   { type: 'month', value: '05' },
     *                                 //=>   { type: 'literal', value: '/' },
     *                                 //=>   { type: 'year', value: '1982' }
     *                                 //=> ]
     * @example
     * DateTime.invalid('').toLocaleParts(); //=> []
     */
    toLocaleParts(opts?: DateTimeFormatOptions): Intl.DateTimeFormatPart[];

    /**
     * Returns an ISO 8601-compliant string representation of this DateTime
     *
     * @example
     * DateTime.utc(1982, 5, 25).toISO() //=> '1982-05-25T00:00:00.000Z'
     * @example
     * DateTime.now().toISO() //=> '2017-04-22T20:47:05.335-04:00'
     * @example
     * DateTime.now().toISO({ includeOffset: false }) //=> '2017-04-22T20:47:05.335'
     * @example
     * DateTime.now().toISO({ format: 'basic' }) //=> '20170422T204705.335-0400'
     * @example
     * DateTime.now().toISO({ precision: 'day' }) //=> '2017-04-22Z'
     * @example
     * DateTime.now().toISO({ precision: 'minute' }) //=> '2017-04-22T20:47Z'
     */
    toISO(opts?: ToISOTimeOptions): IfValid<string, null, IsValid>;

    /**
     * Returns an ISO 8601-compliant string representation of this DateTime's date component
     *
     * @example
     * DateTime.utc(1982, 5, 25).toISODate() //=> '1982-05-25'
     * @example
     * DateTime.utc(1982, 5, 25).toISODate({ format: 'basic' }) //=> '19820525'
     * @example
     * DateTime.utc(1982, 5, 25).toISODate({ precision: 'month' }) //=> '1982-05'
     */
    toISODate(opts?: ToISODateOptions): IfValid<string, null, IsValid>;

    /**
     * Returns an ISO 8601-compliant string representation of this DateTime's week date
     *
     * @example
     * DateTime.utc(1982, 5, 25).toISOWeekDate() //=> '1982-W21-2'
     */
    toISOWeekDate(): IfValid<string, null, IsValid>;

    /**
     * Returns an ISO 8601-compliant string representation of this DateTime's time component
     *
     * @example
     * DateTime.utc().set({ hour: 7, minute: 34 }).toISOTime() //=> '07:34:19.361Z'
     * @example
     * DateTime.utc().set({ hour: 7, minute: 34, seconds: 0, milliseconds: 0 }).toISOTime({ suppressSeconds: true }) //=> '07:34Z'
     * @example
     * DateTime.utc().set({ hour: 7, minute: 34 }).toISOTime({ format: 'basic' }) //=> '073419.361Z'
     * @example
     * DateTime.utc().set({ hour: 7, minute: 34 }).toISOTime({ includePrefix: true }) //=> 'T07:34:19.361Z'
     * @example
     * DateTime.utc().set({ hour: 7, minute: 34, second: 56 }).toISOTime({ precision: 'minute' }) //=> '07:34Z'
     */
    toISOTime(opts?: ToISOTimeOptions): IfValid<string, null, IsValid>;

    /**
     * Returns an RFC 2822-compatible string representation of this DateTime, always in UTC
     *
     * @example
     * DateTime.utc(2014, 7, 13).toRFC2822() //=> 'Sun, 13 Jul 2014 00:00:00 +0000'
     * @example
     * DateTime.local(2014, 7, 13).toRFC2822() //=> 'Sun, 13 Jul 2014 00:00:00 -0400'
     */
    toRFC2822(): IfValid<string, null, IsValid>;

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
    toHTTP(): IfValid<string, null, IsValid>;

    /**
     * Returns a string representation of this DateTime appropriate for use in SQL Date
     *
     * @example
     * DateTime.utc(2014, 7, 13).toSQLDate() //=> '2014-07-13'
     */
    toSQLDate(): IfValid<string, null, IsValid>;

    /**
     * Returns a string representation of this DateTime appropriate for use in SQL Time
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
    toSQLTime(opts?: ToSQLOptions): IfValid<string, null, IsValid>;

    /**
     * Returns a string representation of this DateTime for use in SQL DateTime
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
    toSQL(opts?: ToSQLOptions): IfValid<string, null, IsValid>;

    /**
     * Returns a string representation of this DateTime appropriate for debugging
     */
    toString(): IfValid<string, "Invalid DateTime", IsValid>;

    /**
     * Returns the epoch milliseconds of this DateTime. Alias of {@link DateTime.toMillis}
     */
    valueOf(): IfValid<number, typeof NaN, IsValid>;

    /**
     * Returns the epoch milliseconds of this DateTime.
     */
    toMillis(): IfValid<number, typeof NaN, IsValid>;

    /**
     * Returns the epoch seconds of this DateTime.
     */
    toSeconds(): IfValid<number, typeof NaN, IsValid>;

    /**
     * Returns the epoch seconds (as a whole number) of this DateTime.
     */
    toUnixInteger(): IfValid<number, typeof NaN, IsValid>;

    /**
     * Returns an ISO 8601 representation of this DateTime appropriate for use in JSON.
     */
    toJSON(): IfValid<string, null, IsValid>;

    /**
     * Returns a BSON-serializable equivalent to this DateTime.
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
    toObject<IncludeConfig extends boolean | undefined>(opts?: {
        /**
         * Include configuration attributes in the output
         * @defaultValue false
         */
        includeConfig?: IncludeConfig;
    }): ToObjectOutput<IncludeConfig, IsValid>;

    /**
     * Returns a JavaScript Date equivalent to this DateTime.
     */
    toJSDate(): Date;

    // COMPARE

    /**
     * Return the difference between two DateTimes as a Duration.
     *
     * @param otherDateTime - the DateTime to compare this one to
     * @param unit - the unit or array of units to include in the duration.
     * Defaults to ['milliseconds'].
     * @param opts - options that affect the creation of the Duration
     * @param opts.conversionAccuracy - the conversion system to use.
     * Defaults to 'casual'.
     *
     * @example
     * let i1 = DateTime.fromISO('1982-05-25T09:45'),
     *     i2 = DateTime.fromISO('1983-10-14T10:30');
     * i2.diff(i1).toObject() //=> { milliseconds: 43807500000 }
     * i2.diff(i1, 'hours').toObject() //=> { hours: 12168.75 }
     * i2.diff(i1, ['months', 'days']).toObject() //=> { months: 16, days: 19.03125 }
     * i2.diff(i1, ['months', 'days', 'hours']).toObject() //=> { months: 16, days: 19, hours: 0.75 }
     */
    diff(otherDateTime: DateTime, unit?: DurationUnits, opts?: DiffOptions): Duration<IsValid>;

    /**
     * Return the difference between this DateTime and right now.
     * See {@link DateTime.diff}
     *
     * @param unit - the unit(s) to include in the duration. Defaults to ['milliseconds'].
     * @param opts - options that affect the creation of the Duration
     * @param opts.conversionAccuracy - the conversion system to use. Defaults to 'casual'.
     */
    diffNow(unit?: DurationUnits, opts?: DiffOptions): Duration<Valid>;

    /**
     * Return an Interval spanning between this DateTime and another DateTime
     *
     * @param otherDateTime - the other end point of the Interval
     */
    until(otherDateTime: DateTime): IfValid<Interval<Valid>, DateTime<Invalid>, IsValid>;

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
    hasSame(otherDateTime: DateTime, unit: DateTimeUnit, opts?: HasSameOptions): IfValid<boolean, false, IsValid>;

    /**
     * An equality check.
     * Two DateTimes are equal if and only if they represent the same millisecond, have the same zone and location, and are both valid.
     * To compare just the millisecond values, use `+dt1 === +dt2`.
     *
     * @param other - the other DateTime
     */
    equals(other: DateTime): IfValid<boolean, false, IsValid>;

    /**
     * Returns a string representation of this time relative to now, such as "in two days".
     * Can only internationalize if your platform supports Intl.RelativeTimeFormat.
     * Rounds towards zero by default.
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
    toRelative(options?: ToRelativeOptions): IfValid<string, null, IsValid>;

    /**
     * Returns a string representation of this date relative to today, such as "yesterday" or "next month".
     * Only internationalizes on platforms that support Intl.RelativeTimeFormat.
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
    toRelativeCalendar(options?: ToRelativeCalendarOptions): IfValid<string, null, IsValid>;

    /**
     * Return the min of several date times
     *
     * @param dateTimes - the DateTimes from which to choose the minimum
     */
    static min<Values extends ManyDateTimes>(...dateTimes: Values): PickedDateTime<Values>;

    /**
     * Return the max of several date times
     *
     * @param dateTimes - the DateTimes from which to choose the maximum
     */
    static max<Values extends ManyDateTimes>(...dateTimes: Values): PickedDateTime<Values>;

    // MISC

    /**
     * Explain how a string would be parsed by {@link fromFormat}
     *
     * @param text - the string to parse
     * @param format - the format the string is expected to be in - see {@link Tokens}
     * @param options - options taken by {@link fromFormat}
     */
    static fromFormatExplain(text: string, format: Tokens, options?: DateTimeOptions): ExplainedFormat;

    /**
     * @deprecated use {@link fromFormatExplain} instead
     */
    static fromStringExplain(text: string, format: Tokens, options?: DateTimeOptions): ExplainedFormat;

    /**
     * Build a parser for a given format using the given locale.
     *
     * This parser can be passed to {@link fromFormatParser} to a parse a date in this format.
     * This can be used to optimize cases where many dates need to be parsed in a specific format.
     *
     * @param format - the format the string is expected to be in - see {@link Tokens}
     * @param options - the Locale options
     */
    static buildFormatParser(format: Tokens, options?: LocaleOptions): TokenParser;

    /**
     * Create a DateTime from an input string and format parser.
     *
     * The format parser must have been created with the same locale as this call.
     *
     * @param text the string to parse
     * @param parser - parser from {@link buildFormatParser}
     * @param options options taken by {@link fromFormat}
     */
    static fromFormatParser(text: string, parser: TokenParser, options?: DateTimeOptions): DateTimeMaybeValid;

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
