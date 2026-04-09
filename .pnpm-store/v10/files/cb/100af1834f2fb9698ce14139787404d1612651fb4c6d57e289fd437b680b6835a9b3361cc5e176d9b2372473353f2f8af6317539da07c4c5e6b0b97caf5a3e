import type { DateValue } from '@internationalized/date'
import type { Matcher } from './types'
import { CalendarDateTime, getDayOfWeek, getLocalTimeZone, parseDate, parseDateTime, parseZonedDateTime, toCalendar, ZonedDateTime } from '@internationalized/date'

/**
 * Given a date string and a reference `DateValue` object, parse the
 * string to the same type as the reference object.
 *
 * Useful for parsing strings from data attributes, which are always
 * strings, to the same type being used by the date component.
 */
export function parseStringToDateValue(dateStr: string, referenceVal: DateValue): DateValue {
  let dateValue: DateValue
  if (isZonedDateTime(referenceVal))
    dateValue = parseZonedDateTime(dateStr)

  else if (isCalendarDateTime(referenceVal))
    dateValue = parseDateTime(dateStr)

  else
    dateValue = parseDate(dateStr)

  return dateValue.calendar !== referenceVal.calendar ? toCalendar(dateValue, referenceVal.calendar) : dateValue
}

/**
 * Given a `DateValue` object, convert it to a native `Date` object.
 * If a timezone is provided, the date will be converted to that timezone.
 * If no timezone is provided, the date will be converted to the local timezone.
 */
export function toDate(dateValue: DateValue, tz: string = getLocalTimeZone()) {
  if (isZonedDateTime(dateValue))
    return dateValue.toDate()
  else
    return dateValue.toDate(tz)
}

export function isCalendarDateTime(dateValue: DateValue): dateValue is CalendarDateTime {
  return dateValue instanceof CalendarDateTime
}

export function isZonedDateTime(dateValue: DateValue): dateValue is ZonedDateTime {
  return dateValue instanceof ZonedDateTime
}

export function hasTime(dateValue: DateValue) {
  return isCalendarDateTime(dateValue) || isZonedDateTime(dateValue)
}

/**
 * Given a date, return the number of days in the month.
 */
export function getDaysInMonth(date: Date | DateValue) {
  if (date instanceof Date) {
    const year = date.getFullYear()
    const month = date.getMonth() + 1
    /**
     * By using zero as the day, we get the
     * last day of the previous month, which
     * is the month we originally passed in.
     */
    return new Date(year, month, 0).getDate()
  }
  else {
    return date.set({ day: 100 }).day
  }
}

/**
 * Determine if a date is before the reference date.
 * @param dateToCompare - is this date before the `referenceDate`
 * @param referenceDate - is the `dateToCompare` before this date
 *
 * @see {@link isBeforeOrSame} for inclusive
 */
export function isBefore(dateToCompare: DateValue, referenceDate: DateValue) {
  return dateToCompare.compare(referenceDate) < 0
}

/**
 * Determine if a date is after the reference date.
 * @param dateToCompare - is this date after the `referenceDate`
 * @param referenceDate - is the `dateToCompare` after this date
 *
 * @see {@link isAfterOrSame} for inclusive
 */
export function isAfter(dateToCompare: DateValue, referenceDate: DateValue) {
  return dateToCompare.compare(referenceDate) > 0
}

/**
 * Determine if a date is before or the same as the reference date.
 *
 * @param dateToCompare - the date to compare
 * @param referenceDate - the reference date to make the comparison against
 *
 * @see {@link isBefore} for non-inclusive
 */
export function isBeforeOrSame(dateToCompare: DateValue, referenceDate: DateValue) {
  return dateToCompare.compare(referenceDate) <= 0
}

/**
 * Determine if a date is after or the same as the reference date.
 *
 * @param dateToCompare - is this date after or the same as the `referenceDate`
 * @param referenceDate - is the `dateToCompare` after or the same as this date
 *
 * @see {@link isAfter} for non-inclusive
 */
export function isAfterOrSame(dateToCompare: DateValue, referenceDate: DateValue) {
  return dateToCompare.compare(referenceDate) >= 0
}

/**
 * Determine if a date is inclusively between a start and end reference date.
 *
 * @param date - is this date inclusively between the `start` and `end` dates
 * @param start - the start reference date to make the comparison against
 * @param end - the end reference date to make the comparison against
 *
 * @see {@link isBetween} for non-inclusive
 */
export function isBetweenInclusive(date: DateValue, start: DateValue, end: DateValue) {
  return isAfterOrSame(date, start) && isBeforeOrSame(date, end)
}

/**
 * Determine if a date is between a start and end reference date.
 *
 * @param date - is this date between the `start` and `end` dates
 * @param start - the start reference date to make the comparison against
 * @param end - the end reference date to make the comparison against
 *
 * @see {@link isBetweenInclusive} for inclusive
 */
export function isBetween(date: DateValue, start: DateValue, end: DateValue) {
  return isAfter(date, start) && isBefore(date, end)
}

export function getLastFirstDayOfWeek<T extends DateValue = DateValue>(
  date: T,
  firstDayOfWeek: number,
  locale: string,
): T {
  /**
   * "firstDayOfWeek" is fixed to 0(Sunday) to avoid confusion regarding locales.
   * This also aligns with other date libraries, e.g., date-fns.
   *
   * #see https://github.com/unovue/reka-ui/issues/2157
   */
  const day = getDayOfWeek(date, locale, 'sun')

  if (firstDayOfWeek > day)
    return date.subtract({ days: day + 7 - firstDayOfWeek }) as T

  if (firstDayOfWeek === day)
    return date as T

  return date.subtract({ days: day - firstDayOfWeek }) as T
}

export function getNextLastDayOfWeek<T extends DateValue = DateValue>(
  date: T,
  firstDayOfWeek: number,
  locale: string,
): T {
  /**
   * "firstDayOfWeek" is fixed to 0(Sunday) to avoid confusion regarding locales.
   * This also aligns with other date libraries, e.g., date-fns.
   *
   * #see https://github.com/unovue/reka-ui/issues/2157
   */
  const day = getDayOfWeek(date, locale, 'sun')

  const lastDayOfWeek = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1

  if (day === lastDayOfWeek)
    return date as T

  if (day > lastDayOfWeek)
    return date.add({ days: 7 - day + lastDayOfWeek }) as T

  return date.add({ days: lastDayOfWeek - day }) as T
}

/**
 * Check if two dates are in the same year and month.
 */
export function isSameYearMonth(a: DateValue, b: DateValue): boolean {
  return a.year === b.year && a.month === b.month
}

/**
 * Check if two dates are in the same year.
 */
export function isSameYear(a: DateValue, b: DateValue): boolean {
  return a.year === b.year
}

export function areAllDaysBetweenValid(
  start: DateValue,
  end: DateValue,
  isUnavailable: Matcher | undefined,
  isDisabled: Matcher | undefined,
  isHighlightable?: Matcher | undefined,
) {
  if (isUnavailable === undefined && isDisabled === undefined && isHighlightable === undefined)
    return true

  let dCurrent = start.add({ days: 1 })
  if ((isDisabled?.(dCurrent) || isUnavailable?.(dCurrent))
    && !isHighlightable?.(dCurrent)) {
    return false
  }

  const dEnd = end
  while (dCurrent.compare(dEnd) < 0) {
    dCurrent = dCurrent.add({ days: 1 })
    if ((isDisabled?.(dCurrent) || isUnavailable?.(dCurrent))
      && !isHighlightable?.(dCurrent)) {
      return false
    }
  }
  return true
}

/**
 * Compare two dates by year and month only (ignoring day).
 */
export function compareYearMonth(a: DateValue, b: DateValue): number {
  if (a.year !== b.year)
    return a.year - b.year
  return a.month - b.month
}

/**
 * Check if a date's month is between start and end (inclusive), comparing year+month only.
 */
export function isMonthBetweenInclusive(date: DateValue, start: DateValue, end: DateValue): boolean {
  return compareYearMonth(date, start) >= 0 && compareYearMonth(date, end) <= 0
}

/**
 * Check if a date's year is between start and end (inclusive), comparing year only.
 */
export function isYearBetweenInclusive(date: DateValue, start: DateValue, end: DateValue): boolean {
  return date.year >= start.year && date.year <= end.year
}

/**
 * Get the number of months between two dates (inclusive).
 */
export function getMonthsBetween(start: DateValue, end: DateValue): number {
  return (end.year - start.year) * 12 + (end.month - start.month) + 1
}

/**
 * Get the number of years between two dates (inclusive).
 */
export function getYearsBetween(start: DateValue, end: DateValue): number {
  return end.year - start.year + 1
}

/**
 * Check if all months between start and end are valid (not unavailable/disabled).
 */
export function areAllMonthsBetweenValid(
  start: DateValue,
  end: DateValue,
  isUnavailable: Matcher | undefined,
  isDisabled: Matcher | undefined,
): boolean {
  if (isUnavailable === undefined && isDisabled === undefined)
    return true

  let current = start.set({ day: 1 })
  const endMonth = end.set({ day: 1 })

  while (compareYearMonth(current, endMonth) <= 0) {
    if (isDisabled?.(current) || isUnavailable?.(current))
      return false
    current = current.add({ months: 1 })
  }
  return true
}

/**
 * Check if all years between start and end are valid (not unavailable/disabled).
 */
export function areAllYearsBetweenValid(
  start: DateValue,
  end: DateValue,
  isUnavailable: Matcher | undefined,
  isDisabled: Matcher | undefined,
): boolean {
  if (isUnavailable === undefined && isDisabled === undefined)
    return true

  let current = start.set({ day: 1, month: 1 })
  const endYear = end.set({ day: 1, month: 1 })

  while (current.year <= endYear.year) {
    if (isDisabled?.(current) || isUnavailable?.(current))
      return false
    current = current.add({ years: 1 })
  }
  return true
}
