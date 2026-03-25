type Mutable<T> = {
    -readonly [P in keyof T]: T[P];
};
/**
 * The Gregorian calendar is the most commonly used calendar system in the world. It supports two eras: BC, and AD.
 * Years always contain 12 months, and 365 or 366 days depending on whether it is a leap year.
 */
export class GregorianCalendar implements Calendar {
    identifier: CalendarIdentifier;
    fromJulianDay(jd: number): CalendarDate;
    toJulianDay(date: AnyCalendarDate): number;
    getDaysInMonth(date: AnyCalendarDate): number;
    getMonthsInYear(date: AnyCalendarDate): number;
    getDaysInYear(date: AnyCalendarDate): number;
    getYearsInEra(date: AnyCalendarDate): number;
    getEras(): string[];
    isInverseEra(date: AnyCalendarDate): boolean;
    balanceDate(date: Mutable<AnyCalendarDate>): void;
}
type DateValue = CalendarDate | CalendarDateTime | ZonedDateTime;
/** Returns whether the given dates occur on the same day, regardless of the time or calendar system. */
export function isSameDay(a: DateValue, b: DateValue): boolean;
/** Returns whether the given dates occur in the same month, using the calendar system of the first date. */
export function isSameMonth(a: DateValue, b: DateValue): boolean;
/** Returns whether the given dates occur in the same year, using the calendar system of the first date. */
export function isSameYear(a: DateValue, b: DateValue): boolean;
/** Returns whether the given dates occur on the same day, and are of the same calendar system. */
export function isEqualDay(a: DateValue, b: DateValue): boolean;
/** Returns whether the given dates occur in the same month, and are of the same calendar system. */
export function isEqualMonth(a: DateValue, b: DateValue): boolean;
/** Returns whether the given dates occur in the same year, and are of the same calendar system. */
export function isEqualYear(a: DateValue, b: DateValue): boolean;
/** Returns whether two calendars are the same. */
export function isEqualCalendar(a: Calendar, b: Calendar): boolean;
/** Returns whether the date is today in the given time zone. */
export function isToday(date: DateValue, timeZone: string): boolean;
type DayOfWeek = 'sun' | 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat';
/**
 * Returns the day of week for the given date and locale. Days are numbered from zero to six,
 * where zero is the first day of the week in the given locale. For example, in the United States,
 * the first day of the week is Sunday, but in France it is Monday.
 */
export function getDayOfWeek(date: DateValue, locale: string, firstDayOfWeek?: DayOfWeek): number;
/** Returns the current time in the given time zone. */
export function now(timeZone: string): ZonedDateTime;
/** Returns today's date in the given time zone. */
export function today(timeZone: string): CalendarDate;
/**
 * Returns the number of hours in the given date and time zone.
 * Usually this is 24, but it could be 23 or 25 if the date is on a daylight saving transition.
 */
export function getHoursInDay(a: CalendarDate, timeZone: string): number;
/** Returns the time zone identifier for the current user. */
export function getLocalTimeZone(): string;
/** Sets the time zone identifier for the current user. */
export function setLocalTimeZone(timeZone: string): void;
/** Resets the time zone identifier for the current user. */
export function resetLocalTimeZone(): void;
/** Returns the first date of the month for the given date. */
export function startOfMonth(date: ZonedDateTime): ZonedDateTime;
export function startOfMonth(date: CalendarDateTime): CalendarDateTime;
export function startOfMonth(date: CalendarDate): CalendarDate;
export function startOfMonth(date: DateValue): DateValue;
/** Returns the last date of the month for the given date. */
export function endOfMonth(date: ZonedDateTime): ZonedDateTime;
export function endOfMonth(date: CalendarDateTime): CalendarDateTime;
export function endOfMonth(date: CalendarDate): CalendarDate;
export function endOfMonth(date: DateValue): DateValue;
/** Returns the first day of the year for the given date. */
export function startOfYear(date: ZonedDateTime): ZonedDateTime;
export function startOfYear(date: CalendarDateTime): CalendarDateTime;
export function startOfYear(date: CalendarDate): CalendarDate;
export function startOfYear(date: DateValue): DateValue;
/** Returns the last day of the year for the given date. */
export function endOfYear(date: ZonedDateTime): ZonedDateTime;
export function endOfYear(date: CalendarDateTime): CalendarDateTime;
export function endOfYear(date: CalendarDate): CalendarDate;
export function endOfYear(date: DateValue): DateValue;
export function getMinimumMonthInYear(date: AnyCalendarDate): number;
export function getMinimumDayInMonth(date: AnyCalendarDate): number;
/** Returns the first date of the week for the given date and locale. */
export function startOfWeek(date: ZonedDateTime, locale: string, firstDayOfWeek?: DayOfWeek): ZonedDateTime;
export function startOfWeek(date: CalendarDateTime, locale: string, firstDayOfWeek?: DayOfWeek): CalendarDateTime;
export function startOfWeek(date: CalendarDate, locale: string, firstDayOfWeek?: DayOfWeek): CalendarDate;
export function startOfWeek(date: DateValue, locale: string, firstDayOfWeek?: DayOfWeek): DateValue;
/** Returns the last date of the week for the given date and locale. */
export function endOfWeek(date: ZonedDateTime, locale: string, firstDayOfWeek?: DayOfWeek): ZonedDateTime;
export function endOfWeek(date: CalendarDateTime, locale: string, firstDayOfWeek?: DayOfWeek): CalendarDateTime;
export function endOfWeek(date: CalendarDate, locale: string, firstDayOfWeek?: DayOfWeek): CalendarDate;
export function endOfWeek(date: DateValue, locale: string, firstDayOfWeek?: DayOfWeek): DateValue;
/** Returns the number of weeks in the given month and locale. */
export function getWeeksInMonth(date: DateValue, locale: string, firstDayOfWeek?: DayOfWeek): number;
/** Returns the lesser of the two provider dates. */
export function minDate<A extends DateValue, B extends DateValue>(a?: A | null, b?: B | null): A | B | null | undefined;
/** Returns the greater of the two provider dates. */
export function maxDate<A extends DateValue, B extends DateValue>(a?: A | null, b?: B | null): A | B | null | undefined;
/** Returns whether the given date is on a weekend in the given locale. */
export function isWeekend(date: DateValue, locale: string): boolean;
/** Returns whether the given date is on a weekday in the given locale. */
export function isWeekday(date: DateValue, locale: string): boolean;
/**
 * Takes a Unix epoch (milliseconds since 1970) and converts it to the provided time zone.
 */
export function fromAbsolute(ms: number, timeZone: string): ZonedDateTime;
/**
 * Takes a `Date` object and converts it to the provided time zone.
 */
export function fromDate(date: Date, timeZone: string): ZonedDateTime;
/** Converts a value with date components such as a `CalendarDateTime` or `ZonedDateTime` into a `CalendarDate`. */
export function toCalendarDate(dateTime: AnyCalendarDate): CalendarDate;
/**
 * Converts a date value to a `CalendarDateTime`. An optional `Time` value can be passed to set the time
 * of the resulting value, otherwise it will default to midnight.
 */
export function toCalendarDateTime(date: CalendarDate | CalendarDateTime | ZonedDateTime, time?: AnyTime): CalendarDateTime;
/** Extracts the time components from a value containing a date and time. */
export function toTime(dateTime: CalendarDateTime | ZonedDateTime): Time;
/** Converts a date from one calendar system to another. */
export function toCalendar<T extends AnyCalendarDate>(date: T, calendar: Calendar): T;
/**
 * Converts a date value to a `ZonedDateTime` in the provided time zone. The `disambiguation` option can be set
 * to control how values that fall on daylight saving time changes are interpreted.
 */
export function toZoned(date: CalendarDate | CalendarDateTime | ZonedDateTime, timeZone: string, disambiguation?: Disambiguation): ZonedDateTime;
/** Converts a `ZonedDateTime` from one time zone to another. */
export function toTimeZone(date: ZonedDateTime, timeZone: string): ZonedDateTime;
/** Converts the given `ZonedDateTime` into the user's local time zone. */
export function toLocalTimeZone(date: ZonedDateTime): ZonedDateTime;
/** Parses an ISO 8601 time string. */
export function parseTime(value: string): Time;
/** Parses an ISO 8601 date string, with no time components. */
export function parseDate(value: string): CalendarDate;
/** Parses an ISO 8601 date and time string, with no time zone. */
export function parseDateTime(value: string): CalendarDateTime;
/**
 * Parses an ISO 8601 date and time string with a time zone extension and optional UTC offset
 * (e.g. "2021-11-07T00:45[America/Los_Angeles]" or "2021-11-07T00:45-07:00[America/Los_Angeles]").
 * Ambiguous times due to daylight saving time transitions are resolved according to the `disambiguation`
 * parameter.
 */
export function parseZonedDateTime(value: string, disambiguation?: Disambiguation): ZonedDateTime;
/**
 * Parses an ISO 8601 date and time string with a UTC offset (e.g. "2021-11-07T07:45:00Z"
 * or "2021-11-07T07:45:00-07:00"). The result is converted to the provided time zone.
 */
export function parseAbsolute(value: string, timeZone: string): ZonedDateTime;
/**
 * Parses an ISO 8601 date and time string with a UTC offset (e.g. "2021-11-07T07:45:00Z"
 * or "2021-11-07T07:45:00-07:00"). The result is converted to the user's local time zone.
 */
export function parseAbsoluteToLocal(value: string): ZonedDateTime;
/**
 * Parses an ISO 8601 duration string (e.g. "P3Y6M6W4DT12H30M5S").
 * @param value An ISO 8601 duration string.
 * @returns A DateTimeDuration object.
 */
export function parseDuration(value: string): Required<DateTimeDuration>;
/** A CalendarDate represents a date without any time components in a specific calendar system. */
export class CalendarDate {
    #private;
    /** The calendar system associated with this date, e.g. Gregorian. */
    readonly calendar: Calendar;
    /** The calendar era for this date, e.g. "BC" or "AD". */
    readonly era: string;
    /** The year of this date within the era. */
    readonly year: number;
    /**
     * The month number within the year. Note that some calendar systems such as Hebrew
     * may have a variable number of months per year. Therefore, month numbers may not
     * always correspond to the same month names in different years.
     */
    readonly month: number;
    /** The day number within the month. */
    readonly day: number;
    constructor(year: number, month: number, day: number);
    constructor(era: string, year: number, month: number, day: number);
    constructor(calendar: Calendar, year: number, month: number, day: number);
    constructor(calendar: Calendar, era: string, year: number, month: number, day: number);
    /** Returns a copy of this date. */
    copy(): CalendarDate;
    /** Returns a new `CalendarDate` with the given duration added to it. */
    add(duration: DateDuration): CalendarDate;
    /** Returns a new `CalendarDate` with the given duration subtracted from it. */
    subtract(duration: DateDuration): CalendarDate;
    /** Returns a new `CalendarDate` with the given fields set to the provided values. Other fields will be constrained accordingly. */
    set(fields: DateFields): CalendarDate;
    /**
     * Returns a new `CalendarDate` with the given field adjusted by a specified amount.
     * When the resulting value reaches the limits of the field, it wraps around.
     */
    cycle(field: DateField, amount: number, options?: CycleOptions): CalendarDate;
    /** Converts the date to a native JavaScript Date object, with the time set to midnight in the given time zone. */
    toDate(timeZone: string): Date;
    /** Converts the date to an ISO 8601 formatted string. */
    toString(): string;
    /** Compares this date with another. A negative result indicates that this date is before the given one, and a positive date indicates that it is after. */
    compare(b: AnyCalendarDate): number;
}
/** A Time represents a clock time without any date components. */
export class Time {
    #private;
    /** The hour, numbered from 0 to 23. */
    readonly hour: number;
    /** The minute in the hour. */
    readonly minute: number;
    /** The second in the minute. */
    readonly second: number;
    /** The millisecond in the second. */
    readonly millisecond: number;
    constructor(hour?: number, minute?: number, second?: number, millisecond?: number);
    /** Returns a copy of this time. */
    copy(): Time;
    /** Returns a new `Time` with the given duration added to it. */
    add(duration: TimeDuration): Time;
    /** Returns a new `Time` with the given duration subtracted from it. */
    subtract(duration: TimeDuration): Time;
    /** Returns a new `Time` with the given fields set to the provided values. Other fields will be constrained accordingly. */
    set(fields: TimeFields): Time;
    /**
     * Returns a new `Time` with the given field adjusted by a specified amount.
     * When the resulting value reaches the limits of the field, it wraps around.
     */
    cycle(field: TimeField, amount: number, options?: CycleTimeOptions): Time;
    /** Converts the time to an ISO 8601 formatted string. */
    toString(): string;
    /** Compares this time with another. A negative result indicates that this time is before the given one, and a positive time indicates that it is after. */
    compare(b: AnyTime): number;
}
/** A CalendarDateTime represents a date and time without a time zone, in a specific calendar system. */
export class CalendarDateTime {
    #private;
    /** The calendar system associated with this date, e.g. Gregorian. */
    readonly calendar: Calendar;
    /** The calendar era for this date, e.g. "BC" or "AD". */
    readonly era: string;
    /** The year of this date within the era. */
    readonly year: number;
    /**
     * The month number within the year. Note that some calendar systems such as Hebrew
     * may have a variable number of months per year. Therefore, month numbers may not
     * always correspond to the same month names in different years.
     */
    readonly month: number;
    /** The day number within the month. */
    readonly day: number;
    /** The hour in the day, numbered from 0 to 23. */
    readonly hour: number;
    /** The minute in the hour. */
    readonly minute: number;
    /** The second in the minute. */
    readonly second: number;
    /** The millisecond in the second. */
    readonly millisecond: number;
    constructor(year: number, month: number, day: number, hour?: number, minute?: number, second?: number, millisecond?: number);
    constructor(era: string, year: number, month: number, day: number, hour?: number, minute?: number, second?: number, millisecond?: number);
    constructor(calendar: Calendar, year: number, month: number, day: number, hour?: number, minute?: number, second?: number, millisecond?: number);
    constructor(calendar: Calendar, era: string, year: number, month: number, day: number, hour?: number, minute?: number, second?: number, millisecond?: number);
    /** Returns a copy of this date. */
    copy(): CalendarDateTime;
    /** Returns a new `CalendarDateTime` with the given duration added to it. */
    add(duration: DateTimeDuration): CalendarDateTime;
    /** Returns a new `CalendarDateTime` with the given duration subtracted from it. */
    subtract(duration: DateTimeDuration): CalendarDateTime;
    /** Returns a new `CalendarDateTime` with the given fields set to the provided values. Other fields will be constrained accordingly. */
    set(fields: DateFields & TimeFields): CalendarDateTime;
    /**
     * Returns a new `CalendarDateTime` with the given field adjusted by a specified amount.
     * When the resulting value reaches the limits of the field, it wraps around.
     */
    cycle(field: DateField | TimeField, amount: number, options?: CycleTimeOptions): CalendarDateTime;
    /** Converts the date to a native JavaScript Date object in the given time zone. */
    toDate(timeZone: string, disambiguation?: Disambiguation): Date;
    /** Converts the date to an ISO 8601 formatted string. */
    toString(): string;
    /** Compares this date with another. A negative result indicates that this date is before the given one, and a positive date indicates that it is after. */
    compare(b: CalendarDate | CalendarDateTime | ZonedDateTime): number;
}
/** A ZonedDateTime represents a date and time in a specific time zone and calendar system. */
export class ZonedDateTime {
    #private;
    /** The calendar system associated with this date, e.g. Gregorian. */
    readonly calendar: Calendar;
    /** The calendar era for this date, e.g. "BC" or "AD". */
    readonly era: string;
    /** The year of this date within the era. */
    readonly year: number;
    /**
     * The month number within the year. Note that some calendar systems such as Hebrew
     * may have a variable number of months per year. Therefore, month numbers may not
     * always correspond to the same month names in different years.
     */
    readonly month: number;
    /** The day number within the month. */
    readonly day: number;
    /** The hour in the day, numbered from 0 to 23. */
    readonly hour: number;
    /** The minute in the hour. */
    readonly minute: number;
    /** The second in the minute. */
    readonly second: number;
    /** The millisecond in the second. */
    readonly millisecond: number;
    /** The IANA time zone identifier that this date and time is represented in. */
    readonly timeZone: string;
    /** The UTC offset for this time, in milliseconds. */
    readonly offset: number;
    constructor(year: number, month: number, day: number, timeZone: string, offset: number, hour?: number, minute?: number, second?: number, millisecond?: number);
    constructor(era: string, year: number, month: number, day: number, timeZone: string, offset: number, hour?: number, minute?: number, second?: number, millisecond?: number);
    constructor(calendar: Calendar, year: number, month: number, day: number, timeZone: string, offset: number, hour?: number, minute?: number, second?: number, millisecond?: number);
    constructor(calendar: Calendar, era: string, year: number, month: number, day: number, timeZone: string, offset: number, hour?: number, minute?: number, second?: number, millisecond?: number);
    /** Returns a copy of this date. */
    copy(): ZonedDateTime;
    /** Returns a new `ZonedDateTime` with the given duration added to it. */
    add(duration: DateTimeDuration): ZonedDateTime;
    /** Returns a new `ZonedDateTime` with the given duration subtracted from it. */
    subtract(duration: DateTimeDuration): ZonedDateTime;
    /** Returns a new `ZonedDateTime` with the given fields set to the provided values. Other fields will be constrained accordingly. */
    set(fields: DateFields & TimeFields, disambiguation?: Disambiguation): ZonedDateTime;
    /**
     * Returns a new `ZonedDateTime` with the given field adjusted by a specified amount.
     * When the resulting value reaches the limits of the field, it wraps around.
     */
    cycle(field: DateField | TimeField, amount: number, options?: CycleTimeOptions): ZonedDateTime;
    /** Converts the date to a native JavaScript Date object. */
    toDate(): Date;
    /** Converts the date to an ISO 8601 formatted string, including the UTC offset and time zone identifier. */
    toString(): string;
    /** Converts the date to an ISO 8601 formatted string in UTC. */
    toAbsoluteString(): string;
    /** Compares this date with another. A negative result indicates that this date is before the given one, and a positive date indicates that it is after. */
    compare(b: CalendarDate | CalendarDateTime | ZonedDateTime): number;
}
/** An interface that is compatible with any object with date fields. */
export interface AnyCalendarDate {
    readonly calendar: Calendar;
    readonly era: string;
    readonly year: number;
    readonly month: number;
    readonly day: number;
    copy(): this;
}
/** An interface that is compatible with any object with time fields. */
export interface AnyTime {
    readonly hour: number;
    readonly minute: number;
    readonly second: number;
    readonly millisecond: number;
    copy(): this;
}
/** An interface that is compatible with any object with both date and time fields. */
export interface AnyDateTime extends AnyCalendarDate, AnyTime {
}
export type CalendarIdentifier = 'gregory' | 'buddhist' | 'chinese' | 'coptic' | 'dangi' | 'ethioaa' | 'ethiopic' | 'hebrew' | 'indian' | 'islamic' | 'islamic-umalqura' | 'islamic-tbla' | 'islamic-civil' | 'islamic-rgsa' | 'iso8601' | 'japanese' | 'persian' | 'roc';
/**
 * The Calendar interface represents a calendar system, including information
 * about how days, months, years, and eras are organized, and methods to perform
 * arithmetic on dates.
 */
export interface Calendar {
    /**
     * A string identifier for the calendar, as defined by Unicode CLDR.
     * See [MDN](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/supportedValuesOf#supported_calendar_types).
     */
    identifier: CalendarIdentifier;
    /** Creates a CalendarDate in this calendar from the given Julian day number. */
    fromJulianDay(jd: number): CalendarDate;
    /** Converts a date in this calendar to a Julian day number. */
    toJulianDay(date: AnyCalendarDate): number;
    /** Returns the number of days in the month of the given date. */
    getDaysInMonth(date: AnyCalendarDate): number;
    /** Returns the number of months in the year of the given date. */
    getMonthsInYear(date: AnyCalendarDate): number;
    /** Returns the number of years in the era of the given date. */
    getYearsInEra(date: AnyCalendarDate): number;
    /** Returns a list of era identifiers for the calendar. */
    getEras(): string[];
    /**
     * Returns the minimum month number of the given date's year.
     * Normally, this is 1, but in some calendars such as the Japanese,
     * eras may begin in the middle of a year.
     */
    getMinimumMonthInYear?(date: AnyCalendarDate): number;
    /**
     * Returns the minimum day number of the given date's month.
     * Normally, this is 1, but in some calendars such as the Japanese,
     * eras may begin in the middle of a month.
     */
    getMinimumDayInMonth?(date: AnyCalendarDate): number;
    /**
     * Returns a date that is the first day of the month for the given date.
     * This is used to determine the month that the given date falls in, if
     * the calendar has months that do not align with the standard calendar months
     * (e.g. fiscal calendars).
     */
    getFormattableMonth?(date: AnyCalendarDate): CalendarDate;
    /** Returns whether the given calendar is the same as this calendar. */
    isEqual?(calendar: Calendar): boolean;
    /** @private */
    balanceDate?(date: AnyCalendarDate): void;
    /** @private */
    balanceYearMonth?(date: AnyCalendarDate, previousDate: AnyCalendarDate): void;
    /** @private */
    constrainDate?(date: AnyCalendarDate): void;
    /** @private */
    isInverseEra?(date: AnyCalendarDate): boolean;
}
/** Represents an amount of time in calendar-specific units, for use when performing arithmetic. */
export interface DateDuration {
    /** The number of years to add or subtract. */
    years?: number;
    /** The number of months to add or subtract. */
    months?: number;
    /** The number of weeks to add or subtract. */
    weeks?: number;
    /** The number of days to add or subtract. */
    days?: number;
}
/** Represents an amount of time, for use whe performing arithmetic. */
export interface TimeDuration {
    /** The number of hours to add or subtract. */
    hours?: number;
    /** The number of minutes to add or subtract. */
    minutes?: number;
    /** The number of seconds to add or subtract. */
    seconds?: number;
    /** The number of milliseconds to add or subtract. */
    milliseconds?: number;
}
/** Represents an amount of time with both date and time components, for use when performing arithmetic. */
export interface DateTimeDuration extends DateDuration, TimeDuration {
}
export interface DateFields {
    era?: string;
    year?: number;
    month?: number;
    day?: number;
}
export interface TimeFields {
    hour?: number;
    minute?: number;
    second?: number;
    millisecond?: number;
}
export type DateField = keyof DateFields;
export type TimeField = keyof TimeFields;
export type Disambiguation = 'compatible' | 'earlier' | 'later' | 'reject';
export interface CycleOptions {
    /** Whether to round the field value to the nearest interval of the amount. */
    round?: boolean;
}
export interface CycleTimeOptions extends CycleOptions {
    /**
     * Whether to use 12 or 24 hour time. If 12 hour time is chosen, the resulting value
     * will remain in the same day period as the original value (e.g. if the value is AM,
     * the resulting value also be AM).
     * @default 24
     */
    hourCycle?: 12 | 24;
}
/**
 * The Japanese calendar is based on the Gregorian calendar, but with eras for the reign of each Japanese emperor.
 * Whenever a new emperor ascends to the throne, a new era begins and the year starts again from 1.
 * Note that eras before 1868 (Gregorian) are not currently supported by this implementation.
 */
export class JapaneseCalendar extends GregorianCalendar {
    identifier: CalendarIdentifier;
    fromJulianDay(jd: number): CalendarDate;
    toJulianDay(date: AnyCalendarDate): number;
    balanceDate(date: Mutable<AnyCalendarDate>): void;
    constrainDate(date: Mutable<AnyCalendarDate>): void;
    getEras(): string[];
    getYearsInEra(date: AnyCalendarDate): number;
    getDaysInMonth(date: AnyCalendarDate): number;
    getMinimumMonthInYear(date: AnyCalendarDate): number;
    getMinimumDayInMonth(date: AnyCalendarDate): number;
}
/**
 * The Buddhist calendar is the same as the Gregorian calendar, but counts years
 * starting from the birth of Buddha in 543 BC (Gregorian). It supports only one
 * era, identified as 'BE'.
 */
export class BuddhistCalendar extends GregorianCalendar {
    identifier: CalendarIdentifier;
    fromJulianDay(jd: number): CalendarDate;
    toJulianDay(date: AnyCalendarDate): number;
    getEras(): string[];
    getDaysInMonth(date: AnyCalendarDate): number;
    balanceDate(): void;
}
/**
 * The Taiwanese calendar is the same as the Gregorian calendar, but years
 * are numbered starting from 1912 (Gregorian). Two eras are supported:
 * 'before_minguo' and 'minguo'.
 */
export class TaiwanCalendar extends GregorianCalendar {
    identifier: CalendarIdentifier;
    fromJulianDay(jd: number): CalendarDate;
    toJulianDay(date: AnyCalendarDate): number;
    getEras(): string[];
    balanceDate(date: Mutable<AnyCalendarDate>): void;
    isInverseEra(date: AnyCalendarDate): boolean;
    getDaysInMonth(date: AnyCalendarDate): number;
    getYearsInEra(date: AnyCalendarDate): number;
}
/**
 * The Persian calendar is the main calendar used in Iran and Afghanistan. It has 12 months
 * in each year, the first 6 of which have 31 days, and the next 5 have 30 days. The 12th month
 * has either 29 or 30 days depending on whether it is a leap year. The Persian year starts
 * around the March equinox.
 */
export class PersianCalendar implements Calendar {
    identifier: CalendarIdentifier;
    fromJulianDay(jd: number): CalendarDate;
    toJulianDay(date: AnyCalendarDate): number;
    getMonthsInYear(): number;
    getDaysInMonth(date: AnyCalendarDate): number;
    getEras(): string[];
    getYearsInEra(): number;
}
/**
 * The Indian National Calendar is similar to the Gregorian calendar, but with
 * years numbered since the Saka era in 78 AD (Gregorian). There are 12 months
 * in each year, with either 30 or 31 days. Only one era identifier is supported: 'saka'.
 */
export class IndianCalendar extends GregorianCalendar {
    identifier: CalendarIdentifier;
    fromJulianDay(jd: number): CalendarDate;
    toJulianDay(date: AnyCalendarDate): number;
    getDaysInMonth(date: AnyCalendarDate): number;
    getYearsInEra(): number;
    getEras(): string[];
    balanceDate(): void;
}
/**
 * The Islamic calendar, also known as the "Hijri" calendar, is used throughout much of the Arab world.
 * The civil variant uses simple arithmetic rules rather than astronomical calculations to approximate
 * the traditional calendar, which is based on sighting of the crescent moon. It uses Friday, July 16 622 CE (Julian) as the epoch.
 * Each year has 12 months, with either 354 or 355 days depending on whether it is a leap year.
 * Learn more about the available Islamic calendars [here](https://cldr.unicode.org/development/development-process/design-proposals/islamic-calendar-types).
 */
export class IslamicCivilCalendar implements Calendar {
    identifier: CalendarIdentifier;
    fromJulianDay(jd: number): CalendarDate;
    toJulianDay(date: AnyCalendarDate): number;
    getDaysInMonth(date: AnyCalendarDate): number;
    getMonthsInYear(): number;
    getDaysInYear(date: AnyCalendarDate): number;
    getYearsInEra(): number;
    getEras(): string[];
}
/**
 * The Islamic calendar, also known as the "Hijri" calendar, is used throughout much of the Arab world.
 * The tabular variant uses simple arithmetic rules rather than astronomical calculations to approximate
 * the traditional calendar, which is based on sighting of the crescent moon. It uses Thursday, July 15 622 CE (Julian) as the epoch.
 * Each year has 12 months, with either 354 or 355 days depending on whether it is a leap year.
 * Learn more about the available Islamic calendars [here](https://cldr.unicode.org/development/development-process/design-proposals/islamic-calendar-types).
 */
export class IslamicTabularCalendar extends IslamicCivilCalendar {
    identifier: CalendarIdentifier;
    fromJulianDay(jd: number): CalendarDate;
    toJulianDay(date: AnyCalendarDate): number;
}
/**
 * The Islamic calendar, also known as the "Hijri" calendar, is used throughout much of the Arab world.
 * The Umalqura variant is primarily used in Saudi Arabia. It is a lunar calendar, based on astronomical
 * calculations that predict the sighting of a crescent moon. Month and year lengths vary between years
 * depending on these calculations.
 * Learn more about the available Islamic calendars [here](https://cldr.unicode.org/development/development-process/design-proposals/islamic-calendar-types).
 */
export class IslamicUmalquraCalendar extends IslamicCivilCalendar {
    identifier: CalendarIdentifier;
    constructor();
    fromJulianDay(jd: number): CalendarDate;
    toJulianDay(date: AnyCalendarDate): number;
    getDaysInMonth(date: AnyCalendarDate): number;
    getDaysInYear(date: AnyCalendarDate): number;
}
/**
 * The Hebrew calendar is used in Israel and around the world by the Jewish faith.
 * Years include either 12 or 13 months depending on whether it is a leap year.
 * In leap years, an extra month is inserted at month 6.
 */
export class HebrewCalendar implements Calendar {
    identifier: CalendarIdentifier;
    fromJulianDay(jd: number): CalendarDate;
    toJulianDay(date: AnyCalendarDate): number;
    getDaysInMonth(date: AnyCalendarDate): number;
    getMonthsInYear(date: AnyCalendarDate): number;
    getDaysInYear(date: AnyCalendarDate): number;
    getYearsInEra(): number;
    getEras(): string[];
    balanceYearMonth(date: Mutable<AnyCalendarDate>, previousDate: AnyCalendarDate): void;
}
/**
 * The Ethiopic calendar system is the official calendar used in Ethiopia.
 * It includes 12 months of 30 days each, plus 5 or 6 intercalary days depending
 * on whether it is a leap year. Two eras are supported: 'AA' and 'AM'.
 */
export class EthiopicCalendar implements Calendar {
    identifier: CalendarIdentifier;
    fromJulianDay(jd: number): CalendarDate;
    toJulianDay(date: AnyCalendarDate): number;
    getDaysInMonth(date: AnyCalendarDate): number;
    getMonthsInYear(): number;
    getDaysInYear(date: AnyCalendarDate): number;
    getYearsInEra(date: AnyCalendarDate): number;
    getEras(): string[];
}
/**
 * The Ethiopic (Amete Alem) calendar is the same as the modern Ethiopic calendar,
 * except years were measured from a different epoch. Only one era is supported: 'AA'.
 */
export class EthiopicAmeteAlemCalendar extends EthiopicCalendar {
    identifier: CalendarIdentifier;
    fromJulianDay(jd: number): CalendarDate;
    getEras(): string[];
    getYearsInEra(): number;
}
/**
 * The Coptic calendar is similar to the Ethiopic calendar.
 * It includes 12 months of 30 days each, plus 5 or 6 intercalary days depending
 * on whether it is a leap year. Two eras are supported: 'BCE' and 'CE'.
 */
export class CopticCalendar extends EthiopicCalendar {
    identifier: CalendarIdentifier;
    fromJulianDay(jd: number): CalendarDate;
    toJulianDay(date: AnyCalendarDate): number;
    getDaysInMonth(date: AnyCalendarDate): number;
    isInverseEra(date: AnyCalendarDate): boolean;
    balanceDate(date: Mutable<AnyCalendarDate>): void;
    getEras(): string[];
    getYearsInEra(date: AnyCalendarDate): number;
}
/** Creates a `Calendar` instance from a Unicode calendar identifier string. */
export function createCalendar(name: CalendarIdentifier): Calendar;
interface DateRangeFormatPart extends Intl.DateTimeFormatPart {
    source: 'startRange' | 'endRange' | 'shared';
}
/** A wrapper around Intl.DateTimeFormat that fixes various browser bugs, and polyfills new features. */
export class DateFormatter implements Intl.DateTimeFormat {
    constructor(locale: string, options?: Intl.DateTimeFormatOptions);
    /** Formats a date as a string according to the locale and format options passed to the constructor. */
    format(value: Date): string;
    /** Formats a date to an array of parts such as separators, numbers, punctuation, and more. */
    formatToParts(value: Date): Intl.DateTimeFormatPart[];
    /** Formats a date range as a string. */
    formatRange(start: Date, end: Date): string;
    /** Formats a date range as an array of parts. */
    formatRangeToParts(start: Date, end: Date): DateRangeFormatPart[];
    /** Returns the resolved formatting options based on the values passed to the constructor. */
    resolvedOptions(): Intl.ResolvedDateTimeFormatOptions;
}

//# sourceMappingURL=types.d.ts.map
