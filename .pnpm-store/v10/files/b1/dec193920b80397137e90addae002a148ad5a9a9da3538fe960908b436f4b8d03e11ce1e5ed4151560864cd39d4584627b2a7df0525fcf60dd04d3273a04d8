/*
 * Implementation ported from from from https://github.com/melt-ui/melt-ui/blob/develop/src/lib/builders/calendar/create.ts
*/

import type { DateValue, DayOfWeek } from '@internationalized/date'
import type { Grid } from './types'
import type { DateRange } from '@/shared'
import { CalendarDate, endOfMonth, endOfYear, getDayOfWeek, startOfMonth, startOfWeek, startOfYear } from '@internationalized/date'
import { getDaysInMonth, getLastFirstDayOfWeek, getNextLastDayOfWeek } from './comparators'
import { chunk } from './utils'

export type WeekDayFormat = 'narrow' | 'short' | 'long'

export type WeekStartsOn = 0 | 1 | 2 | 3 | 4 | 5 | 6

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
  weekStartsOn: WeekStartsOn

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

/**
 * Creates a 3x4 grid of months for a given year.
 */
export function createMonthGrid(props: CreateSelectProps): Grid<DateValue> {
  const { dateObj } = props
  const months = createYear({ dateObj })
  return { value: dateObj, cells: months, rows: chunk(months, 4) }
}

/**
 * Creates a 3x4 grid of years (decade-aligned).
 * The grid starts from the decade that contains the given date.
 */
export function createYearGrid(props: CreateSelectProps & { yearsPerPage?: number, decadeAligned?: boolean }): Grid<DateValue> {
  const { dateObj, yearsPerPage = 12, decadeAligned = true } = props

  let startYear: number
  if (decadeAligned) {
    startYear = startOfDecade(dateObj).year
  }
  else {
    startYear = dateObj.year
  }

  const years = Array.from({ length: yearsPerPage }, (_, i) => startOfYear(dateObj.set({ year: startYear + i })))
  const firstYear = years[0]
  return { value: firstYear, cells: years, rows: chunk(years, 4) }
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
 * It's better to use `getWeekStart` from `@internationalized/date`,
 * but sadly it is not yet exported from the package.
 * And the `Intl.Locale` API is not supported well enough yet.
 */
export function getWeekStartsOn(locale: string): WeekStartsOn {
  // Jan 6, 2025 is a Monday (ISO day = 1)
  const monday = new CalendarDate(2025, 1, 6)
  const dayOfWeek = getDayOfWeek(monday, locale)
  // dayOfWeek tells us Monday's position in the locale's week (0-indexed)
  // If Monday is position 0 → week starts Monday (1)
  // If Monday is position 1 → week starts Sunday (0)
  return (1 - dayOfWeek + 7) % 7 as WeekStartsOn
}

/**
 * Returns the locale-specific week number
 */
export function getWeekNumber(date: DateValue, locale: string = 'en-US', firstDayOfWeek?: DayOfWeek): number {
  const jan1 = new CalendarDate(date.year, 1, 1)

  // Detect ISO locale by comparing JS day of week with locale day of week
  const usesISOWeek = jan1.toDate('UTC').getUTCDay() !== getDayOfWeek(jan1, locale)
  const weekStartsOn = firstDayOfWeek ?? (usesISOWeek ? 'mon' : 'sun')
  const firstWeekContainsDate = usesISOWeek ? 4 : 1

  // Find the "deciding day" - its year determines which year's week numbering to use
  const dayOfWeek = getDayOfWeek(date, locale, weekStartsOn)
  const decidingDay = date.add({ days: 7 - firstWeekContainsDate - dayOfWeek })
  const weekYear = decidingDay.year

  // Calculate week number from week 1 start
  const week1Ref = new CalendarDate(weekYear, 1, firstWeekContainsDate)
  const week1Start = startOfWeek(week1Ref, locale, weekStartsOn)
  const currentWeekStart = startOfWeek(date, locale, weekStartsOn)

  const MS_PER_WEEK = 7 * 24 * 60 * 60 * 1000
  const daysDiff = Math.round(
    (currentWeekStart.toDate('UTC').getTime() - week1Start.toDate('UTC').getTime())
    / MS_PER_WEEK,
  )
  return daysDiff + 1
}
