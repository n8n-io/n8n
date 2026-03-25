/*
 * Implementation ported from from from https://github.com/melt-ui/melt-ui/blob/develop/src/lib/builders/calendar/create.ts
*/

import type { DateValue, DayOfWeek } from '@internationalized/date'
import type { Grid } from './types'
import type { DateRange } from '@/shared'
import { CalendarDate, endOfMonth, endOfYear, getDayOfWeek, startOfMonth, startOfYear } from '@internationalized/date'
import { getDaysInMonth, getLastFirstDayOfWeek, getNextLastDayOfWeek } from './comparators'
import { chunk } from './utils'

export type WeekDayFormat = 'narrow' | 'short' | 'long'

export type CreateSelectProps = {
  /**
   * The date object representing the date (usually the first day of the month/year).
   */
  dateObj: DateValue
}

export type CreateMonthProps = {
  /**
   * The date object representing the month's date (usually the first day of the month).
   */
  dateObj: DateValue

  /**
   * The day of the week to start the calendar on (0 for Sunday, 1 for Monday, etc.).
   */
  weekStartsOn: number

  /**
   * Whether to always render 6 weeks in the calendar, even if the month doesn't
   * span 6 weeks.
   */
  fixedWeeks: boolean

  /**
   * The locale to use when creating the calendar month.
   */
  locale: string
}

/**
 * Retrieves an array of date values representing the days between
 * the provided start and end dates.
 */
export function getDaysBetween(start: DateValue, end: DateValue) {
  const days: DateValue[] = []
  let dCurrent = start.add({ days: 1 })
  const dEnd = end
  while (dCurrent.compare(dEnd) < 0) {
    days.push(dCurrent)
    dCurrent = dCurrent.add({ days: 1 })
  }
  return days
}

export function createMonth(props: CreateMonthProps): Grid<DateValue> {
  const { dateObj, weekStartsOn, fixedWeeks, locale } = props
  const daysInMonth = getDaysInMonth(dateObj)

  const datesArray = Array.from({ length: daysInMonth }, (_, i) => dateObj.set({ day: i + 1 }))

  const firstDayOfMonth = startOfMonth(dateObj)
  const lastDayOfMonth = endOfMonth(dateObj)

  const lastSunday = getLastFirstDayOfWeek(firstDayOfMonth, weekStartsOn, locale)
  const nextSaturday = getNextLastDayOfWeek(lastDayOfMonth, weekStartsOn, locale)

  const lastMonthDays = getDaysBetween(lastSunday.subtract({ days: 1 }), firstDayOfMonth)
  const nextMonthDays = getDaysBetween(lastDayOfMonth, nextSaturday.add({ days: 1 }))

  const totalDays = lastMonthDays.length + datesArray.length + nextMonthDays.length

  if (fixedWeeks && totalDays < 42) {
    const extraDays = 42 - totalDays

    let startFrom = nextMonthDays[nextMonthDays.length - 1]

    if (!startFrom)
      startFrom = endOfMonth(dateObj)

    const extraDaysArray = Array.from({ length: extraDays }, (_, i) => {
      const incr = i + 1
      return startFrom.add({ days: incr })
    })
    nextMonthDays.push(...extraDaysArray)
  }

  const allDays = lastMonthDays.concat(datesArray, nextMonthDays)

  const weeks = chunk(allDays, 7)

  return {
    value: dateObj,
    cells: allDays,
    rows: weeks,
  }
}

type SetMonthProps = CreateMonthProps & {
  numberOfMonths: number | undefined
  currentMonths?: Grid<DateValue>[]
}

type SetYearProps = CreateSelectProps & {
  numberOfMonths?: number
  pagedNavigation?: boolean
}

type SetDecadeProps = CreateSelectProps & {
  startIndex?: number
  endIndex: number
}

export function startOfDecade(dateObj: DateValue) {
  // round to the lowest nearest 10 when building the decade
  return startOfYear(dateObj.subtract({ years: dateObj.year - Math.floor(dateObj.year / 10) * 10 }).set({ day: 1, month: 1 }))
}

export function endOfDecade(dateObj: DateValue) {
  // round to the lowest nearest 10 when building the decade
  return endOfYear(dateObj.add({ years: Math.ceil((dateObj.year + 1) / 10) * 10 - dateObj.year - 1 }).set({ day: 35, month: 12 }))
}

export function createDecade(props: SetDecadeProps): DateValue[] {
  const { dateObj, startIndex, endIndex } = props

  const decadeArray = Array.from({ length: Math.abs(startIndex ?? 0) + endIndex }, (_, i) =>
    i <= Math.abs((startIndex ?? 0))
      ? dateObj.subtract({ years: i }).set({ day: 1, month: 1 })
      : dateObj.add({ years: i - endIndex }).set({ day: 1, month: 1 }))

  decadeArray.sort((a: DateValue, b: DateValue) => a.year - b.year)

  return decadeArray
}

export function createYear(props: SetYearProps): DateValue[] {
  const { dateObj, numberOfMonths = 1, pagedNavigation = false } = props

  if (numberOfMonths && pagedNavigation) {
    const monthsArray = Array.from({ length: Math.floor(12 / numberOfMonths) }, (_, i) => startOfMonth(dateObj.set({ month: i * numberOfMonths + 1 })))

    return monthsArray
  }

  const monthsArray = Array.from({ length: 12 }, (_, i) => startOfMonth(dateObj.set({ month: i + 1 })))
  return monthsArray
}

export function createMonths(props: SetMonthProps) {
  const { numberOfMonths, dateObj, ...monthProps } = props

  const months: Grid<DateValue>[] = []

  if (!numberOfMonths || numberOfMonths === 1) {
    months.push(
      createMonth({
        ...monthProps,
        dateObj,
      }),
    )
    return months
  }

  months.push(
    createMonth({
      ...monthProps,
      dateObj,
    }),
  )

  // Create all the months, starting with the current month
  for (let i = 1; i < numberOfMonths; i++) {
    const nextMonth = dateObj.add({ months: i })
    months.push(
      createMonth({
        ...monthProps,
        dateObj: nextMonth,
      }),
    )
  }

  return months
}

export function createYearRange({ start, end }: DateRange): DateValue[] {
  const years: DateValue[] = []

  if (!start || !end)
    return years

  let current = startOfYear(start)

  while (current.compare(end) <= 0) {
    years.push(current)
    // Move to the first day of the next year
    current = startOfYear(current.add({ years: 1 }))
  }

  return years
}

export function createDateRange({ start, end }: DateRange): DateValue[] {
  const dates: DateValue[] = []

  if (!start || !end)
    return dates

  let current = start

  while (current.compare(end) <= 0) {
    dates.push(current)
    current = current.add({ days: 1 })
  }

  return dates
}

/**
 * Returns the locale-specific week number
 */
export function getWeekNumber(date: DateValue, locale: string = 'en-US', firstDayOfWeek?: DayOfWeek): number {
  const firstDayOfYear = new CalendarDate(date.year, 1, 1)

  const firstDayOfYearWeekday = getDayOfWeek(firstDayOfYear, locale, firstDayOfWeek)

  const firstWeekStart = firstDayOfYear.subtract({ days: firstDayOfYearWeekday })

  // If date is before the first week start It belongs to the last week of the previous year
  if (date.compare(firstWeekStart) < 0) {
    const prevYearDate = new CalendarDate(date.year - 1, 12, 31)
    return getWeekNumber(prevYearDate, locale, firstDayOfWeek)
  }

  const days = getDaysBetween(firstWeekStart, date)

  // Week number is days divided by 7 plus 1
  return Math.floor(days.length / 7) + 1
}
