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

// Portions of the code in this file are based on code from ICU.
// Original licensing can be found in the NOTICE file in the root directory of this source tree.

import {AnyCalendarDate, Calendar, CalendarIdentifier} from '../types';
import {CalendarDate} from '../CalendarDate';
import {mod, Mutable} from '../utils';

const HEBREW_EPOCH = 347997;

// Hebrew date calculations are performed in terms of days, hours, and
// "parts" (or halakim), which are 1/1080 of an hour, or 3 1/3 seconds.
const HOUR_PARTS = 1080;
const DAY_PARTS  = 24 * HOUR_PARTS;

// An approximate value for the length of a lunar month.
// It is used to calculate the approximate year and month of a given
// absolute date.
const MONTH_DAYS = 29;
const MONTH_FRACT = 12 * HOUR_PARTS + 793;
const MONTH_PARTS = MONTH_DAYS * DAY_PARTS + MONTH_FRACT;

function isLeapYear(year: number) {
  return mod(year * 7 + 1, 19) < 7;
}

// Test for delay of start of new year and to avoid
// Sunday, Wednesday, and Friday as start of the new year.
function hebrewDelay1(year: number) {
  let months = Math.floor((235 * year - 234) / 19);
  let parts = 12084 + 13753 * months;
  let day = months * 29 + Math.floor(parts / 25920);

  if (mod(3 * (day + 1), 7) < 3) {
    day += 1;
  }

  return day;
}

// Check for delay in start of new year due to length of adjacent years
function hebrewDelay2(year: number) {
  let last = hebrewDelay1(year - 1);
  let present = hebrewDelay1(year);
  let next = hebrewDelay1(year + 1);

  if (next - present === 356) {
    return 2;
  }

  if (present - last === 382) {
    return 1;
  }

  return 0;
}

function startOfYear(year: number) {
  return hebrewDelay1(year) + hebrewDelay2(year);
}

function getDaysInYear(year: number) {
  return startOfYear(year + 1) - startOfYear(year);
}

function getYearType(year: number) {
  let yearLength = getDaysInYear(year);

  if (yearLength > 380) {
    yearLength -= 30; // Subtract length of leap month.
  }

  switch (yearLength) {
    case 353:
      return 0; // deficient
    case 354:
      return 1; // normal
    case 355:
      return 2; // complete
  }
}

function getDaysInMonth(year: number, month: number): number {
  // Normalize month numbers from 1 - 13, even on non-leap years
  if (month >= 6 && !isLeapYear(year)) {
    month++;
  }

  // First of all, dispose of fixed-length 29 day months
  if (month === 4 || month === 7 || month === 9 || month === 11 || month === 13) {
    return 29;
  }

  let yearType = getYearType(year);

  // If it's Heshvan, days depend on length of year
  if (month === 2) {
    return yearType === 2 ? 30 : 29;
  }

  // Similarly, Kislev varies with the length of year
  if (month === 3) {
    return yearType === 0 ? 29 : 30;
  }

  // Adar I only exists in leap years
  if (month === 6) {
    return isLeapYear(year) ? 30 : 0;
  }

  return 30;
}

/**
 * The Hebrew calendar is used in Israel and around the world by the Jewish faith.
 * Years include either 12 or 13 months depending on whether it is a leap year.
 * In leap years, an extra month is inserted at month 6.
 */
export class HebrewCalendar implements Calendar {
  identifier: CalendarIdentifier = 'hebrew';

  fromJulianDay(jd: number): CalendarDate {
    let d = jd - HEBREW_EPOCH;
    let m = (d * DAY_PARTS) / MONTH_PARTS;           // Months (approx)
    let year = Math.floor((19 * m + 234) / 235) + 1; // Years (approx)
    let ys = startOfYear(year);                      // 1st day of year
    let dayOfYear = Math.floor(d - ys);

    // Because of the postponement rules, it's possible to guess wrong.  Fix it.
    while (dayOfYear < 1) {
      year--;
      ys = startOfYear(year);
      dayOfYear = Math.floor(d - ys);
    }

    // Now figure out which month we're in, and the date within that month
    let month = 1;
    let monthStart = 0;
    while (monthStart < dayOfYear) {
      monthStart += getDaysInMonth(year, month);
      month++;
    }

    month--;
    monthStart -= getDaysInMonth(year, month);

    let day = dayOfYear - monthStart;
    return new CalendarDate(this, year, month, day);
  }

  toJulianDay(date: AnyCalendarDate): number {
    let jd = startOfYear(date.year);
    for (let month = 1; month < date.month; month++) {
      jd += getDaysInMonth(date.year, month);
    }

    return jd + date.day + HEBREW_EPOCH;
  }

  getDaysInMonth(date: AnyCalendarDate): number {
    return getDaysInMonth(date.year, date.month);
  }

  getMonthsInYear(date: AnyCalendarDate): number {
    return isLeapYear(date.year) ? 13 : 12;
  }

  getDaysInYear(date: AnyCalendarDate): number {
    return getDaysInYear(date.year);
  }

  getYearsInEra(): number {
    // 6239 gregorian
    return 9999;
  }

  getEras(): string[] {
    return ['AM'];
  }

  balanceYearMonth(date: Mutable<AnyCalendarDate>, previousDate: AnyCalendarDate): void {
    // Keep date in the same month when switching between leap years and non leap years
    if (previousDate.year !== date.year) {
      if (isLeapYear(previousDate.year) && !isLeapYear(date.year) && previousDate.month > 6) {
        date.month--;
      } else if (!isLeapYear(previousDate.year) && isLeapYear(date.year) && previousDate.month > 6) {
        date.month++;
      }
    }
  }
}
