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

// Portions of the code in this file are based on code from the TC39 Temporal proposal.
// Original licensing can be found in the NOTICE file in the root directory of this source tree.

import {AnyCalendarDate, AnyDateTime, AnyTime, Calendar, DateFields, Disambiguation, TimeFields} from './types';
import {CalendarDate, CalendarDateTime, Time, ZonedDateTime} from './CalendarDate';
import {constrain} from './manipulation';
import {getExtendedYear, GregorianCalendar} from './calendars/GregorianCalendar';
import {getLocalTimeZone, isEqualCalendar} from './queries';
import {Mutable} from './utils';

export function epochFromDate(date: AnyDateTime): number {
  date = toCalendar(date, new GregorianCalendar());
  let year = getExtendedYear(date.era, date.year);
  return epochFromParts(year, date.month, date.day, date.hour, date.minute, date.second, date.millisecond);
}

function epochFromParts(year: number, month: number, day: number, hour: number, minute: number, second: number, millisecond: number): number {
  // Note: Date.UTC() interprets one and two-digit years as being in the
  // 20th century, so don't use it
  let date = new Date();
  date.setUTCHours(hour, minute, second, millisecond);
  date.setUTCFullYear(year, month - 1, day);
  return date.getTime();
}

export function getTimeZoneOffset(ms: number, timeZone: string): number {
  // Fast path for UTC.
  if (timeZone === 'UTC') {
    return 0;
  }

  // Fast path: for local timezone after 1970, use native Date.
  if (ms > 0 && timeZone === getLocalTimeZone()) {
    return new Date(ms).getTimezoneOffset() * -60 * 1000;
  }

  let {year, month, day, hour, minute, second} = getTimeZoneParts(ms, timeZone);
  let utc = epochFromParts(year, month, day, hour, minute, second, 0);
  return utc - Math.floor(ms / 1000) * 1000;
}

const formattersByTimeZone = new Map<string, Intl.DateTimeFormat>();

function getTimeZoneParts(ms: number, timeZone: string) {
  let formatter = formattersByTimeZone.get(timeZone);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat('en-US', {
      timeZone,
      hour12: false,
      era: 'short',
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      second: 'numeric'
    });

    formattersByTimeZone.set(timeZone, formatter);
  }

  let parts = formatter.formatToParts(new Date(ms));
  let namedParts: {[name: string]: string} = {};
  for (let part of parts) {
    if (part.type !== 'literal') {
      namedParts[part.type] = part.value;
    }
  }


  return {
    // Firefox returns B instead of BC... https://bugzilla.mozilla.org/show_bug.cgi?id=1752253
    year: namedParts.era === 'BC' || namedParts.era === 'B' ? -namedParts.year + 1 : +namedParts.year,
    month: +namedParts.month,
    day: +namedParts.day,
    hour: namedParts.hour === '24' ? 0 : +namedParts.hour, // bugs.chromium.org/p/chromium/issues/detail?id=1045791
    minute: +namedParts.minute,
    second: +namedParts.second
  };
}

const DAYMILLIS = 86400000;

export function possibleAbsolutes(date: CalendarDateTime, timeZone: string): number[] {
  let ms = epochFromDate(date);
  let earlier = ms - getTimeZoneOffset(ms - DAYMILLIS, timeZone);
  let later = ms - getTimeZoneOffset(ms + DAYMILLIS, timeZone);
  return getValidWallTimes(date, timeZone, earlier, later);
}

function getValidWallTimes(date: CalendarDateTime, timeZone: string, earlier: number, later: number): number[] {
  let found = earlier === later ? [earlier] : [earlier, later];
  return found.filter(absolute => isValidWallTime(date, timeZone, absolute));
}

function isValidWallTime(date: CalendarDateTime, timeZone: string, absolute: number) {
  let parts = getTimeZoneParts(absolute, timeZone);
  return date.year === parts.year
    && date.month === parts.month
    && date.day === parts.day
    && date.hour === parts.hour
    && date.minute === parts.minute
    && date.second === parts.second;
}

export function toAbsolute(date: CalendarDate | CalendarDateTime, timeZone: string, disambiguation: Disambiguation = 'compatible'): number {
  let dateTime = toCalendarDateTime(date);

  // Fast path: if the time zone is UTC, use native Date.
  if (timeZone === 'UTC') {
    return epochFromDate(dateTime);
  }

  // Fast path: if the time zone is the local timezone and disambiguation is compatible, use native Date.
  if (timeZone === getLocalTimeZone() && disambiguation === 'compatible') {
    dateTime = toCalendar(dateTime, new GregorianCalendar());

    // Don't use Date constructor here because two-digit years are interpreted in the 20th century.
    let date = new Date();
    let year = getExtendedYear(dateTime.era, dateTime.year);
    date.setFullYear(year, dateTime.month - 1, dateTime.day);
    date.setHours(dateTime.hour, dateTime.minute, dateTime.second, dateTime.millisecond);
    return date.getTime();
  }

  let ms = epochFromDate(dateTime);
  let offsetBefore = getTimeZoneOffset(ms - DAYMILLIS, timeZone);
  let offsetAfter = getTimeZoneOffset(ms + DAYMILLIS, timeZone);
  let valid = getValidWallTimes(dateTime, timeZone, ms - offsetBefore, ms - offsetAfter);

  if (valid.length === 1) {
    return valid[0];
  }

  if (valid.length > 1) {
    switch (disambiguation) {
      // 'compatible' means 'earlier' for "fall back" transitions
      case 'compatible':
      case 'earlier':
        return valid[0];
      case 'later':
        return valid[valid.length - 1];
      case 'reject':
        throw new RangeError('Multiple possible absolute times found');
    }
  }

  switch (disambiguation) {
    case 'earlier':
      return Math.min(ms - offsetBefore, ms - offsetAfter);
    // 'compatible' means 'later' for "spring forward" transitions
    case 'compatible':
    case 'later':
      return Math.max(ms - offsetBefore, ms - offsetAfter);
    case 'reject':
      throw new RangeError('No such absolute time found');
  }
}

export function toDate(dateTime: CalendarDate | CalendarDateTime, timeZone: string, disambiguation: Disambiguation = 'compatible'): Date {
  return new Date(toAbsolute(dateTime, timeZone, disambiguation));
}

/**
 * Takes a Unix epoch (milliseconds since 1970) and converts it to the provided time zone.
 */
export function fromAbsolute(ms: number, timeZone: string): ZonedDateTime {
  let offset = getTimeZoneOffset(ms, timeZone);
  let date = new Date(ms + offset);
  let year = date.getUTCFullYear();
  let month = date.getUTCMonth() + 1;
  let day = date.getUTCDate();
  let hour = date.getUTCHours();
  let minute = date.getUTCMinutes();
  let second = date.getUTCSeconds();
  let millisecond = date.getUTCMilliseconds();

  return new ZonedDateTime(year < 1 ? 'BC' : 'AD', year < 1 ? -year + 1 : year, month, day, timeZone, offset, hour, minute, second, millisecond);
}

/**
 * Takes a `Date` object and converts it to the provided time zone.
 */
export function fromDate(date: Date, timeZone: string): ZonedDateTime {
  return fromAbsolute(date.getTime(), timeZone);
}

export function fromDateToLocal(date: Date): ZonedDateTime {
  return fromDate(date, getLocalTimeZone());
}

/** Converts a value with date components such as a `CalendarDateTime` or `ZonedDateTime` into a `CalendarDate`. */
export function toCalendarDate(dateTime: AnyCalendarDate): CalendarDate {
  return new CalendarDate(dateTime.calendar, dateTime.era, dateTime.year, dateTime.month, dateTime.day);
}

export function toDateFields(date: AnyCalendarDate): DateFields {
  return {
    era: date.era,
    year: date.year,
    month: date.month,
    day: date.day
  };
}

export function toTimeFields(date: AnyTime): TimeFields {
  return {
    hour: date.hour,
    minute: date.minute,
    second: date.second,
    millisecond: date.millisecond
  };
}

/**
 * Converts a date value to a `CalendarDateTime`. An optional `Time` value can be passed to set the time
 * of the resulting value, otherwise it will default to midnight.
 */
export function toCalendarDateTime(date: CalendarDate | CalendarDateTime | ZonedDateTime, time?: AnyTime): CalendarDateTime {
  let hour = 0, minute = 0, second = 0, millisecond = 0;
  if ('timeZone' in date) {
    ({hour, minute, second, millisecond} = date);
  } else if ('hour' in date && !time) {
    return date;
  }

  if (time) {
    ({hour, minute, second, millisecond} = time);
  }

  return new CalendarDateTime(
    date.calendar,
    date.era,
    date.year,
    date.month,
    date.day,
    hour,
    minute,
    second,
    millisecond
  );
}

/** Extracts the time components from a value containing a date and time. */
export function toTime(dateTime: CalendarDateTime | ZonedDateTime): Time {
  return new Time(dateTime.hour, dateTime.minute, dateTime.second, dateTime.millisecond);
}

/** Converts a date from one calendar system to another. */
export function toCalendar<T extends AnyCalendarDate>(date: T, calendar: Calendar): T {
  if (isEqualCalendar(date.calendar, calendar)) {
    return date;
  }

  let calendarDate = calendar.fromJulianDay(date.calendar.toJulianDay(date));
  let copy: Mutable<T> = date.copy();
  copy.calendar = calendar;
  copy.era = calendarDate.era;
  copy.year = calendarDate.year;
  copy.month = calendarDate.month;
  copy.day = calendarDate.day;
  constrain(copy);
  return copy;
}

/**
 * Converts a date value to a `ZonedDateTime` in the provided time zone. The `disambiguation` option can be set
 * to control how values that fall on daylight saving time changes are interpreted.
 */
export function toZoned(date: CalendarDate | CalendarDateTime | ZonedDateTime, timeZone: string, disambiguation?: Disambiguation): ZonedDateTime {
  if (date instanceof ZonedDateTime) {
    if (date.timeZone === timeZone) {
      return date;
    }

    return toTimeZone(date, timeZone);
  }

  let ms = toAbsolute(date, timeZone, disambiguation);
  return fromAbsolute(ms, timeZone);
}

export function zonedToDate(date: ZonedDateTime): Date {
  let ms = epochFromDate(date) - date.offset;
  return new Date(ms);
}

/** Converts a `ZonedDateTime` from one time zone to another. */
export function toTimeZone(date: ZonedDateTime, timeZone: string): ZonedDateTime {
  let ms = epochFromDate(date) - date.offset;
  return toCalendar(fromAbsolute(ms, timeZone), date.calendar);
}

/** Converts the given `ZonedDateTime` into the user's local time zone. */
export function toLocalTimeZone(date: ZonedDateTime): ZonedDateTime {
  return toTimeZone(date, getLocalTimeZone());
}
