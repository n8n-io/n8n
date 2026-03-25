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
import {mod} from '../utils';

const PERSIAN_EPOCH = 1948320;

// Number of days from the start of the year to the start of each month.
const MONTH_START = [
  0, // Farvardin
  31, // Ordibehesht
  62, // Khordad
  93, // Tir
  124, // Mordad
  155, // Shahrivar
  186, // Mehr
  216, // Aban
  246, // Azar
  276, // Dey
  306, // Bahman
  336  // Esfand
];

/**
 * The Persian calendar is the main calendar used in Iran and Afghanistan. It has 12 months
 * in each year, the first 6 of which have 31 days, and the next 5 have 30 days. The 12th month
 * has either 29 or 30 days depending on whether it is a leap year. The Persian year starts
 * around the March equinox.
 */
export class PersianCalendar implements Calendar {
  identifier: CalendarIdentifier = 'persian';

  fromJulianDay(jd: number): CalendarDate {
    let daysSinceEpoch = jd - PERSIAN_EPOCH;
    let year = 1 + Math.floor((33 * daysSinceEpoch + 3) / 12053);
    let farvardin1 = 365 * (year - 1) + Math.floor((8 * year + 21) / 33);
    let dayOfYear = daysSinceEpoch - farvardin1;
    let month = dayOfYear < 216
      ? Math.floor(dayOfYear / 31)
      : Math.floor((dayOfYear - 6) / 30);
    let day = dayOfYear - MONTH_START[month] + 1;
    return new CalendarDate(this, year, month + 1, day);
  }

  toJulianDay(date: AnyCalendarDate): number {
    let jd = PERSIAN_EPOCH - 1 + 365 * (date.year - 1) + Math.floor((8 * date.year + 21) / 33);
    jd += MONTH_START[date.month - 1];
    jd += date.day;
    return jd;
  }

  getMonthsInYear(): number {
    return 12;
  }

  getDaysInMonth(date: AnyCalendarDate): number {
    if (date.month <= 6) {
      return 31;
    }

    if (date.month <= 11) {
      return 30;
    }

    let isLeapYear = mod(25 * date.year + 11, 33) < 8;
    return isLeapYear ? 30 : 29;
  }

  getEras(): string[] {
    return ['AP'];
  }

  getYearsInEra(): number {
    // 9378-10-10 persian is 9999-12-31 gregorian.
    // Round down to 9377 to set the maximum full year.
    return 9377;
  }
}
