/*
 * Copyright 2020 Adobe. All rights reserved.
 * This file is licensed to you under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License. You may obtain a copy
 * of the License at http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software distributed under
 * the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
 * OF ANY KIND, either express or implied. See the License for the specific language
 * governing permissions and limitations under the License.
 */

import {AnyCalendarDate, AnyTime, Calendar} from './types';
import {CalendarDate, CalendarDateTime, ZonedDateTime} from './CalendarDate';
import {fromAbsolute, toAbsolute, toCalendar, toCalendarDate} from './conversion';
import {weekStartData} from './weekStartData';

type DateValue = CalendarDate | CalendarDateTime | ZonedDateTime;

/** Returns whether the given dates occur on the same day, regardless of the time or calendar system. */
export function isSameDay(a: DateValue, b: DateValue): boolean {
  b = toCalendar(b, a.calendar);
  return a.era === b.era && a.year === b.year && a.month === b.month && a.day === b.day;
}

/** Returns whether the given dates occur in the same month, using the calendar system of the first date. */
export function isSameMonth(a: DateValue, b: DateValue): boolean {
  b = toCalendar(b, a.calendar);
  // In the Japanese calendar, months can span multiple eras/years, so only compare the first of the month.
  a = startOfMonth(a);
  b = startOfMonth(b);
  return a.era === b.era && a.year === b.year && a.month === b.month;
}

/** Returns whether the given dates occur in the same year, using the calendar system of the first date. */
export function isSameYear(a: DateValue, b: DateValue): boolean {
  b = toCalendar(b, a.calendar);
  a = startOfYear(a);
  b = startOfYear(b);
  return a.era === b.era && a.year === b.year;
}

/** Returns whether the given dates occur on the same day, and are of the same calendar system. */
export function isEqualDay(a: DateValue, b: DateValue): boolean {
  return isEqualCalendar(a.calendar, b.calendar) && isSameDay(a, b);
}

/** Returns whether the given dates occur in the same month, and are of the same calendar system. */
export function isEqualMonth(a: DateValue, b: DateValue): boolean {
  return isEqualCalendar(a.calendar, b.calendar) && isSameMonth(a, b);
}

/** Returns whether the given dates occur in the same year, and are of the same calendar system. */
export function isEqualYear(a: DateValue, b: DateValue): boolean {
  return isEqualCalendar(a.calendar, b.calendar) && isSameYear(a, b);
}

/** Returns whether two calendars are the same. */
export function isEqualCalendar(a: Calendar, b: Calendar): boolean {
  return a.isEqual?.(b) ?? b.isEqual?.(a) ?? a.identifier === b.identifier;
}

/** Returns whether the date is today in the given time zone. */
export function isToday(date: DateValue, timeZone: string): boolean {
  return isSameDay(date, today(timeZone));
}

const DAY_MAP = {
  sun: 0,
  mon: 1,
  tue: 2,
  wed: 3,
  thu: 4,
  fri: 5,
  sat: 6
};

type DayOfWeek = 'sun' | 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat';

/**
 * Returns the day of week for the given date and locale. Days are numbered from zero to six,
 * where zero is the first day of the week in the given locale. For example, in the United States,
 * the first day of the week is Sunday, but in France it is Monday.
 */
export function getDayOfWeek(date: DateValue, locale: string, firstDayOfWeek?: DayOfWeek): number {
  let julian = date.calendar.toJulianDay(date);

  // If julian is negative, then julian % 7 will be negative, so we adjust
  // accordingly.  Julian day 0 is Monday.
  let weekStart = firstDayOfWeek ? DAY_MAP[firstDayOfWeek] : getWeekStart(locale);
  let dayOfWeek = Math.ceil(julian + 1 - weekStart) % 7;
  if (dayOfWeek < 0) {
    dayOfWeek += 7;
  }

  return dayOfWeek;
}

/** Returns the current time in the given time zone. */
export function now(timeZone: string): ZonedDateTime {
  return fromAbsolute(Date.now(), timeZone);
}

/** Returns today's date in the given time zone. */
export function today(timeZone: string): CalendarDate {
  return toCalendarDate(now(timeZone));
}

export function compareDate(a: AnyCalendarDate, b: AnyCalendarDate): number {
  return a.calendar.toJulianDay(a) - b.calendar.toJulianDay(b);
}

export function compareTime(a: AnyTime, b: AnyTime): number {
  return timeToMs(a) - timeToMs(b);
}

function timeToMs(a: AnyTime): number {
  return a.hour * 60 * 60 * 1000 + a.minute * 60 * 1000 + a.second * 1000 + a.millisecond;
}

/**
 * Returns the number of hours in the given date and time zone.
 * Usually this is 24, but it could be 23 or 25 if the date is on a daylight saving transition.
 */
export function getHoursInDay(a: CalendarDate, timeZone: string): number {
  let ms = toAbsolute(a, timeZone);
  let tomorrow = a.add({days: 1});
  let tomorrowMs = toAbsolute(tomorrow, timeZone);
  return (tomorrowMs - ms) / 3600000;
}

let localTimeZone: string | null = null;

/** Returns the time zone identifier for the current user. */
export function getLocalTimeZone(): string {
  if (localTimeZone == null) {
    localTimeZone = new Intl.DateTimeFormat().resolvedOptions().timeZone;
  }

  return localTimeZone!;
}

/** Sets the time zone identifier for the current user. */
export function setLocalTimeZone(timeZone: string): void {
  localTimeZone = timeZone;
}

/** Resets the time zone identifier for the current user. */
export function resetLocalTimeZone(): void {
  localTimeZone = null;
}

/** Returns the first date of the month for the given date. */
export function startOfMonth(date: ZonedDateTime): ZonedDateTime;
export function startOfMonth(date: CalendarDateTime): CalendarDateTime;
export function startOfMonth(date: CalendarDate): CalendarDate;
export function startOfMonth(date: DateValue): DateValue;
export function startOfMonth(date: DateValue): DateValue {
  // Use `subtract` instead of `set` so we don't get constrained in an era.
  return date.subtract({days: date.day - 1});
}

/** Returns the last date of the month for the given date. */
export function endOfMonth(date: ZonedDateTime): ZonedDateTime;
export function endOfMonth(date: CalendarDateTime): CalendarDateTime;
export function endOfMonth(date: CalendarDate): CalendarDate;
export function endOfMonth(date: DateValue): DateValue;
export function endOfMonth(date: DateValue): DateValue {
  return date.add({days: date.calendar.getDaysInMonth(date) - date.day});
}

/** Returns the first day of the year for the given date. */
export function startOfYear(date: ZonedDateTime): ZonedDateTime;
export function startOfYear(date: CalendarDateTime): CalendarDateTime;
export function startOfYear(date: CalendarDate): CalendarDate;
export function startOfYear(date: DateValue): DateValue;
export function startOfYear(date: DateValue): DateValue {
  return startOfMonth(date.subtract({months: date.month - 1}));
}

/** Returns the last day of the year for the given date. */
export function endOfYear(date: ZonedDateTime): ZonedDateTime;
export function endOfYear(date: CalendarDateTime): CalendarDateTime;
export function endOfYear(date: CalendarDate): CalendarDate;
export function endOfYear(date: DateValue): DateValue;
export function endOfYear(date: DateValue): DateValue {
  return endOfMonth(date.add({months: date.calendar.getMonthsInYear(date) - date.month}));
}

export function getMinimumMonthInYear(date: AnyCalendarDate): number {
  if (date.calendar.getMinimumMonthInYear) {
    return date.calendar.getMinimumMonthInYear(date);
  }

  return 1;
}

export function getMinimumDayInMonth(date: AnyCalendarDate): number {
  if (date.calendar.getMinimumDayInMonth) {
    return date.calendar.getMinimumDayInMonth(date);
  }

  return 1;
}

/** Returns the first date of the week for the given date and locale. */
export function startOfWeek(date: ZonedDateTime, locale: string, firstDayOfWeek?: DayOfWeek): ZonedDateTime;
export function startOfWeek(date: CalendarDateTime, locale: string, firstDayOfWeek?: DayOfWeek): CalendarDateTime;
export function startOfWeek(date: CalendarDate, locale: string, firstDayOfWeek?: DayOfWeek): CalendarDate;
export function startOfWeek(date: DateValue, locale: string, firstDayOfWeek?: DayOfWeek): DateValue;
export function startOfWeek(date: DateValue, locale: string, firstDayOfWeek?: DayOfWeek): DateValue {
  let dayOfWeek = getDayOfWeek(date, locale, firstDayOfWeek);
  return date.subtract({days: dayOfWeek});
}

/** Returns the last date of the week for the given date and locale. */
export function endOfWeek(date: ZonedDateTime, locale: string, firstDayOfWeek?: DayOfWeek): ZonedDateTime;
export function endOfWeek(date: CalendarDateTime, locale: string, firstDayOfWeek?: DayOfWeek): CalendarDateTime;
export function endOfWeek(date: CalendarDate, locale: string, firstDayOfWeek?: DayOfWeek): CalendarDate;
export function endOfWeek(date: DateValue, locale: string, firstDayOfWeek?: DayOfWeek): DateValue;
export function endOfWeek(date: DateValue, locale: string, firstDayOfWeek?: DayOfWeek): DateValue {
  return startOfWeek(date, locale, firstDayOfWeek).add({days: 6});
}

const cachedRegions = new Map<string, string>();

function getRegion(locale: string): string | undefined {
  // If the Intl.Locale API is available, use it to get the region for the locale.
  // @ts-ignore
  if (Intl.Locale) {
    // Constructing an Intl.Locale is expensive, so cache the result.
    let region = cachedRegions.get(locale);
    if (!region) {
      // @ts-ignore
      region = new Intl.Locale(locale).maximize().region;
      if (region) {
        cachedRegions.set(locale, region);
      }
    }
    return region;
  }

  // If not, just try splitting the string.
  // If the second part of the locale string is 'u',
  // then this is a unicode extension, so ignore it.
  // Otherwise, it should be the region.
  let part = locale.split('-')[1];
  return part === 'u' ? undefined : part;
}

function getWeekStart(locale: string): number {
  // TODO: use Intl.Locale for this once browsers support the weekInfo property
  // https://github.com/tc39/proposal-intl-locale-info
  let region = getRegion(locale);
  return region ? weekStartData[region] || 0 : 0;
}

/** Returns the number of weeks in the given month and locale. */
export function getWeeksInMonth(date: DateValue, locale: string, firstDayOfWeek?: DayOfWeek): number {
  let days = date.calendar.getDaysInMonth(date);
  return Math.ceil((getDayOfWeek(startOfMonth(date), locale, firstDayOfWeek) + days) / 7);
}

/** Returns the lesser of the two provider dates. */
export function minDate<A extends DateValue, B extends DateValue>(a?: A | null, b?: B | null): A | B | null | undefined {
  if (a && b) {
    return a.compare(b) <= 0 ? a : b;
  }

  return a || b;
}

/** Returns the greater of the two provider dates. */
export function maxDate<A extends DateValue, B extends DateValue>(a?: A | null, b?: B | null): A | B | null | undefined {
  if (a && b) {
    return a.compare(b) >= 0 ? a : b;
  }

  return a || b;
}

const WEEKEND_DATA = {
  AF: [4, 5],
  AE: [5, 6],
  BH: [5, 6],
  DZ: [5, 6],
  EG: [5, 6],
  IL: [5, 6],
  IQ: [5, 6],
  IR: [5, 5],
  JO: [5, 6],
  KW: [5, 6],
  LY: [5, 6],
  OM: [5, 6],
  QA: [5, 6],
  SA: [5, 6],
  SD: [5, 6],
  SY: [5, 6],
  YE: [5, 6]
};

/** Returns whether the given date is on a weekend in the given locale. */
export function isWeekend(date: DateValue, locale: string): boolean {
  let julian = date.calendar.toJulianDay(date);

  // If julian is negative, then julian % 7 will be negative, so we adjust
  // accordingly.  Julian day 0 is Monday.
  let dayOfWeek = Math.ceil(julian + 1) % 7;
  if (dayOfWeek < 0) {
    dayOfWeek += 7;
  }

  let region = getRegion(locale);
  // Use Intl.Locale for this once weekInfo is supported.
  // https://github.com/tc39/proposal-intl-locale-info
  let [start, end] = WEEKEND_DATA[region!] || [6, 0];
  return dayOfWeek === start || dayOfWeek === end;
}

/** Returns whether the given date is on a weekday in the given locale. */
export function isWeekday(date: DateValue, locale: string): boolean {
  return !isWeekend(date, locale);
}
