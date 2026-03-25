import type { Granularity } from './comparators'
import type { DateStep, HourCycle } from './types'
import { defu } from 'defu'

export function getOptsByGranularity(granularity: Granularity, hourCycle: HourCycle, isTimeValue: boolean = false) {
  const opts: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    timeZoneName: 'short',
    hourCycle: normalizeHourCycle(hourCycle),
    hour12: normalizeHour12(hourCycle),
  }
  if (isTimeValue) {
    delete opts.year
    delete opts.month
    delete opts.day
  }

  if (granularity === 'day') {
    delete opts.second
    delete opts.hour
    delete opts.minute
    delete opts.timeZoneName
  }
  if (granularity === 'hour') {
    delete opts.minute
    delete opts.second
  }

  if (granularity === 'minute')
    delete opts.second

  return opts
}

type GetDefaultDateStepProps = {
  step?: DateStep
}

export function normalizeDateStep(props?: GetDefaultDateStepProps): DateStep {
  return defu(props?.step, {
    year: 1,
    month: 1,
    day: 1,
    hour: 1,
    minute: 1,
    second: 1,
    millisecond: 1,
  } satisfies DateStep)
}

export function handleCalendarInitialFocus(calendar: HTMLElement) {
  const selectedDay = calendar.querySelector<HTMLElement>('[data-selected]')
  if (selectedDay)
    return selectedDay.focus()

  const today = calendar.querySelector<HTMLElement>('[data-today]')
  if (today)
    return today.focus()

  const firstDay = calendar.querySelector<HTMLElement>('[data-reka-calendar-day]')
  if (firstDay)
    return firstDay.focus()
}

export function normalizeHourCycle(hourCycle: HourCycle) {
  if (hourCycle === 24)
    return 'h23'
  if (hourCycle === 12)
    return 'h11'
  return undefined
}

export function normalizeHour12(hourCycle: HourCycle) {
  if (hourCycle === 24)
    return false
  if (hourCycle === 12)
    return true
  return undefined
}
