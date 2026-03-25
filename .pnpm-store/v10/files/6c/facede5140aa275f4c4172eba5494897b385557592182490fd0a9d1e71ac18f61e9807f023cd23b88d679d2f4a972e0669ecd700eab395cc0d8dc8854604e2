/*
  * Implementation ported from https://github.com/melt-ui/melt-ui/blob/develop/src/lib/internal/helpers/date/formatter.ts
*/

import type { DateValue, ZonedDateTime } from '@internationalized/date'
import { DateFormatter, getLocalTimeZone, today } from '@internationalized/date'
import { ref } from 'vue'
import { hasTime, isZonedDateTime, toDate } from '@/date'

export interface DateFormatterOptions extends Intl.DateTimeFormatOptions {
  calendar?: string
}

export type Formatter = {
  getLocale: () => string
  setLocale: (newLocale: string) => void
  custom: (date: Date, options: DateFormatterOptions) => string
  selectedDate: (date: DateValue, includeTime?: boolean) => string
  dayOfWeek: (date: Date, length?: DateFormatterOptions['weekday']) => string
  fullMonthAndYear: (date: Date, options?: DateFormatterOptions) => string
  fullMonth: (date: Date, options?: DateFormatterOptions) => string
  fullYear: (date: Date, options?: DateFormatterOptions) => string
  dayPeriod: (date: Date) => string
  part: (dateObj: DateValue, type: Intl.DateTimeFormatPartTypes, options?: DateFormatterOptions) => string
  toParts: (date: DateValue, options?: DateFormatterOptions) => Intl.DateTimeFormatPart[]
  getMonths: () => { label: string, value: number }[]
}

/**
 * Creates a wrapper around the `DateFormatter`, which is
 * an improved version of the {@link Intl.DateTimeFormat} API,
 * that is used internally by the various date builders to
 * easily format dates in a consistent way.
 *
 * @see [DateFormatter](https://react-spectrum.adobe.com/internationalized/date/DateFormatter.html)
 */
export function useDateFormatter(initialLocale: string, opts: DateFormatterOptions = {}): Formatter {
  const locale = ref(initialLocale)

  function getLocale() {
    return locale.value
  }

  function setLocale(newLocale: string) {
    locale.value = newLocale
  }

  function custom(date: Date, options: DateFormatterOptions) {
    return new DateFormatter(locale.value, { ...opts, ...options }).format(date)
  }

  function selectedDate(date: DateValue, includeTime = true) {
    if (hasTime(date) && includeTime) {
      return custom(toDate(date), {
        dateStyle: 'long',
        timeStyle: 'long',
      })
    }
    else {
      return custom(toDate(date), {
        dateStyle: 'long',
      })
    }
  }

  function fullMonthAndYear(date: Date, options: DateFormatterOptions = {}) {
    return new DateFormatter(locale.value, { ...opts, month: 'long', year: 'numeric', ...options }).format(date)
  }

  function fullMonth(date: Date, options: DateFormatterOptions = {}) {
    return new DateFormatter(locale.value, { ...opts, month: 'long', ...options }).format(date)
  }

  function getMonths() {
    const defaultDate = today(getLocalTimeZone())
    const months = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]
    return months.map(item => ({ label: fullMonth(toDate(defaultDate.set({ month: item }))), value: item }))
  }

  function fullYear(date: Date, options: DateFormatterOptions = {}) {
    return new DateFormatter(locale.value, { ...opts, year: 'numeric', ...options }).format(date)
  }

  function toParts(date: DateValue, options?: DateFormatterOptions) {
    if (isZonedDateTime(date)) {
      return new DateFormatter(locale.value, {
        ...opts,
        ...options,
        timeZone: (date as ZonedDateTime).timeZone,
      }).formatToParts(toDate(date))
    }
    else {
      return new DateFormatter(locale.value, { ...opts, ...options }).formatToParts(toDate(date))
    }
  }

  function dayOfWeek(date: Date, length: DateFormatterOptions['weekday'] = 'narrow') {
    return new DateFormatter(locale.value, { ...opts, weekday: length }).format(date)
  }

  function dayPeriod(date: Date) {
    const parts = new DateFormatter(locale.value, {
      ...opts,
      hour: 'numeric',
      minute: 'numeric',
    }).formatToParts(date)
    const value = parts.find(p => p.type === 'dayPeriod')?.value
    // Day period can be "AM"/"PM" or "a.m."/"p.m." in some locales
    if (value === 'PM' || value === 'p.m.')
      return 'PM'

    return 'AM'
  }

  const defaultPartOptions: DateFormatterOptions = {
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
  }

  function part(
    dateObj: DateValue,
    type: Intl.DateTimeFormatPartTypes,
    options: DateFormatterOptions = {},
  ) {
    const opts = { ...defaultPartOptions, ...options }
    const parts = toParts(dateObj, opts)
    const part = parts.find(p => p.type === type)
    return part ? part.value : ''
  }

  return {
    setLocale,
    getLocale,
    fullMonth,
    fullYear,
    fullMonthAndYear,
    toParts,
    custom,
    part,
    dayPeriod,
    selectedDate,
    dayOfWeek,
    getMonths,
  }
}
