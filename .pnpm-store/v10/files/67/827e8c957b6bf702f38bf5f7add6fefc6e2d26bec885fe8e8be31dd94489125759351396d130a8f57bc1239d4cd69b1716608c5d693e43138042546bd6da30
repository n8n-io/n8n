import { CalendarDateTime, DateValue, DateValue as DateValue$1, DateValue as DateValue$2, DayOfWeek, ZonedDateTime } from "@internationalized/date";

//#region src/date/types.d.ts
type Matcher = (date: DateValue$2) => boolean;
type Grid<T> = {
  /**
   * A `DateValue` used to represent the month. Since days
   * from the previous and next months may be included in the
   * calendar grid, we need a source of truth for the value
   * the grid is representing.
   */
  value: DateValue$2;
  /**
   * An array of arrays representing the weeks in the calendar.
   * Each sub-array represents a week, and contains the dates for each
   * day in that week. This structure is useful for rendering the calendar
   * grid using a table, where each row represents a week and each cell
   * represents a day.
   */
  rows: T[][];
  /**
   * An array of all the dates in the current month, including dates from
   * the previous and next months that are used to fill out the calendar grid.
   * This array is useful for rendering the calendar grid in a customizable way,
   * as it provides all the dates that should be displayed in the grid in a flat
   * array.
   */
  cells: T[];
};
//# sourceMappingURL=types.d.ts.map
//#endregion
//#region src/shared/date/types.d.ts
type DateStep = {
  year?: number;
  month?: number;
  day?: number;
  hour?: number;
  minute?: number;
  second?: number;
  millisecond?: number;
};
type DateRange = {
  start: DateValue$1 | undefined;
  end: DateValue$1 | undefined;
};
type HourCycle = 12 | 24 | undefined;
type DateSegmentPart = (typeof DATE_SEGMENT_PARTS)[number];
type TimeSegmentPart = (typeof TIME_SEGMENT_PARTS)[number];
type EditableSegmentPart = (typeof EDITABLE_SEGMENT_PARTS)[number];
type NonEditableSegmentPart = (typeof NON_EDITABLE_SEGMENT_PARTS)[number];
type SegmentPart = EditableSegmentPart | NonEditableSegmentPart;
type DayPeriod = 'AM' | 'PM' | null;
type DateSegmentObj = { [K in DateSegmentPart]: number | null };
type TimeSegmentObj = { [K in TimeSegmentPart]: K extends 'dayPeriod' ? DayPeriod : number | null };
type DateAndTimeSegmentObj = DateSegmentObj & TimeSegmentObj;
type SegmentValueObj = DateSegmentObj | DateAndTimeSegmentObj;
//#endregion
//#region src/shared/date/parts.d.ts
declare const DATE_SEGMENT_PARTS: readonly ["day", "month", "year"];
declare const TIME_SEGMENT_PARTS: readonly ["hour", "minute", "second", "dayPeriod"];
declare const NON_EDITABLE_SEGMENT_PARTS: readonly ["literal", "timeZoneName"];
declare const EDITABLE_SEGMENT_PARTS: readonly ["day", "month", "year", "hour", "minute", "second", "dayPeriod"];
//#endregion
//#region src/date/calendar.d.ts
type WeekDayFormat = 'narrow' | 'short' | 'long';
type CreateSelectProps = {
  /**
   * The date object representing the date (usually the first day of the month/year).
   */
  dateObj: DateValue;
};
type CreateMonthProps = {
  /**
   * The date object representing the month's date (usually the first day of the month).
   */
  dateObj: DateValue;
  /**
   * The day of the week to start the calendar on (0 for Sunday, 1 for Monday, etc.).
   */
  weekStartsOn: number;
  /**
   * Whether to always render 6 weeks in the calendar, even if the month doesn't
   * span 6 weeks.
   */
  fixedWeeks: boolean;
  /**
   * The locale to use when creating the calendar month.
   */
  locale: string;
};
/**
 * Retrieves an array of date values representing the days between
 * the provided start and end dates.
 */
declare function getDaysBetween(start: DateValue, end: DateValue): DateValue[];
declare function createMonth(props: CreateMonthProps): Grid<DateValue>;
type SetMonthProps = CreateMonthProps & {
  numberOfMonths: number | undefined;
  currentMonths?: Grid<DateValue>[];
};
type SetYearProps = CreateSelectProps & {
  numberOfMonths?: number;
  pagedNavigation?: boolean;
};
type SetDecadeProps = CreateSelectProps & {
  startIndex?: number;
  endIndex: number;
};
declare function startOfDecade(dateObj: DateValue): DateValue;
declare function endOfDecade(dateObj: DateValue): DateValue;
declare function createDecade(props: SetDecadeProps): DateValue[];
declare function createYear(props: SetYearProps): DateValue[];
declare function createMonths(props: SetMonthProps): Grid<DateValue>[];
declare function createYearRange({
  start,
  end
}: DateRange): DateValue[];
declare function createDateRange({
  start,
  end
}: DateRange): DateValue[];
/**
 * Returns the locale-specific week number
 */
declare function getWeekNumber(date: DateValue, locale?: string, firstDayOfWeek?: DayOfWeek): number;
//#endregion
//#region src/date/comparators.d.ts
/**
 * Given a date string and a reference `DateValue` object, parse the
 * string to the same type as the reference object.
 *
 * Useful for parsing strings from data attributes, which are always
 * strings, to the same type being used by the date component.
 */
declare function parseStringToDateValue(dateStr: string, referenceVal: DateValue): DateValue;
/**
 * Given a `DateValue` object, convert it to a native `Date` object.
 * If a timezone is provided, the date will be converted to that timezone.
 * If no timezone is provided, the date will be converted to the local timezone.
 */
declare function toDate(dateValue: DateValue, tz?: string): Date;
declare function isCalendarDateTime(dateValue: DateValue): dateValue is CalendarDateTime;
declare function isZonedDateTime(dateValue: DateValue): dateValue is ZonedDateTime;
declare function hasTime(dateValue: DateValue): dateValue is CalendarDateTime | ZonedDateTime;
/**
 * Given a date, return the number of days in the month.
 */
declare function getDaysInMonth(date: Date | DateValue): number;
/**
 * Determine if a date is before the reference date.
 * @param dateToCompare - is this date before the `referenceDate`
 * @param referenceDate - is the `dateToCompare` before this date
 *
 * @see {@link isBeforeOrSame} for inclusive
 */
declare function isBefore(dateToCompare: DateValue, referenceDate: DateValue): boolean;
/**
 * Determine if a date is after the reference date.
 * @param dateToCompare - is this date after the `referenceDate`
 * @param referenceDate - is the `dateToCompare` after this date
 *
 * @see {@link isAfterOrSame} for inclusive
 */
declare function isAfter(dateToCompare: DateValue, referenceDate: DateValue): boolean;
/**
 * Determine if a date is before or the same as the reference date.
 *
 * @param dateToCompare - the date to compare
 * @param referenceDate - the reference date to make the comparison against
 *
 * @see {@link isBefore} for non-inclusive
 */
declare function isBeforeOrSame(dateToCompare: DateValue, referenceDate: DateValue): boolean;
/**
 * Determine if a date is after or the same as the reference date.
 *
 * @param dateToCompare - is this date after or the same as the `referenceDate`
 * @param referenceDate - is the `dateToCompare` after or the same as this date
 *
 * @see {@link isAfter} for non-inclusive
 */
declare function isAfterOrSame(dateToCompare: DateValue, referenceDate: DateValue): boolean;
/**
 * Determine if a date is inclusively between a start and end reference date.
 *
 * @param date - is this date inclusively between the `start` and `end` dates
 * @param start - the start reference date to make the comparison against
 * @param end - the end reference date to make the comparison against
 *
 * @see {@link isBetween} for non-inclusive
 */
declare function isBetweenInclusive(date: DateValue, start: DateValue, end: DateValue): boolean;
/**
 * Determine if a date is between a start and end reference date.
 *
 * @param date - is this date between the `start` and `end` dates
 * @param start - the start reference date to make the comparison against
 * @param end - the end reference date to make the comparison against
 *
 * @see {@link isBetweenInclusive} for inclusive
 */
declare function isBetween(date: DateValue, start: DateValue, end: DateValue): boolean;
declare function getLastFirstDayOfWeek<T extends DateValue = DateValue>(date: T, firstDayOfWeek: number, locale: string): T;
declare function getNextLastDayOfWeek<T extends DateValue = DateValue>(date: T, firstDayOfWeek: number, locale: string): T;
declare function areAllDaysBetweenValid(start: DateValue, end: DateValue, isUnavailable: Matcher | undefined, isDisabled: Matcher | undefined, isHighlightable?: Matcher | undefined): boolean;
//# sourceMappingURL=comparators.d.ts.map

//#endregion
export { CreateMonthProps, CreateSelectProps, DateRange, DateStep, DateValue$1 as DateValue, DateValue$2 as DateValue$1, Grid, HourCycle, Matcher, SegmentPart, SegmentValueObj, WeekDayFormat, areAllDaysBetweenValid, createDateRange, createDecade, createMonth, createMonths, createYear, createYearRange, endOfDecade, getDaysBetween, getDaysInMonth, getLastFirstDayOfWeek, getNextLastDayOfWeek, getWeekNumber, hasTime, isAfter, isAfterOrSame, isBefore, isBeforeOrSame, isBetween, isBetweenInclusive, isCalendarDateTime, isZonedDateTime, parseStringToDateValue, startOfDecade, toDate };
//# sourceMappingURL=index2.d.cts.map