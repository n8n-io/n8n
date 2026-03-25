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

import {AnyCalendarDate, CalendarIdentifier} from '../types';
import {CalendarDate} from '../CalendarDate';
import {fromExtendedYear, GregorianCalendar, gregorianToJulianDay, isLeapYear} from './GregorianCalendar';

// Starts in 78 AD,
const INDIAN_ERA_START = 78;

// The Indian year starts 80 days later than the Gregorian year.
const INDIAN_YEAR_START = 80;

/**
 * The Indian National Calendar is similar to the Gregorian calendar, but with
 * years numbered since the Saka era in 78 AD (Gregorian). There are 12 months
 * in each year, with either 30 or 31 days. Only one era identifier is supported: 'saka'.
 */
export class IndianCalendar extends GregorianCalendar {
  identifier: CalendarIdentifier = 'indian';

  fromJulianDay(jd: number): CalendarDate {
    // Gregorian date for Julian day
    let date = super.fromJulianDay(jd);

    // Year in Saka era
    let indianYear = date.year - INDIAN_ERA_START;

    // Day number in Gregorian year (starting from 0)
    let yDay = jd - gregorianToJulianDay(date.era, date.year, 1, 1);

    let leapMonth: number;
    if (yDay < INDIAN_YEAR_START) {
      //  Day is at the end of the preceding Saka year
      indianYear--;

      // Days in leapMonth this year, previous Gregorian year
      leapMonth = isLeapYear(date.year - 1) ? 31 : 30;
      yDay += leapMonth + (31 * 5) + (30 * 3) + 10;
    } else {
      // Days in leapMonth this year
      leapMonth = isLeapYear(date.year) ? 31 : 30;
      yDay -= INDIAN_YEAR_START;
    }

    let indianMonth: number;
    let indianDay: number;
    if (yDay < leapMonth) {
      indianMonth = 1;
      indianDay = yDay + 1;
    } else {
      let mDay = yDay - leapMonth;
      if (mDay < (31 * 5)) {
        indianMonth = Math.floor(mDay / 31) + 2;
        indianDay = (mDay % 31) + 1;
      } else {
        mDay -= 31 * 5;
        indianMonth = Math.floor(mDay / 30) + 7;
        indianDay = (mDay % 30) + 1;
      }
    }

    return new CalendarDate(this, indianYear, indianMonth, indianDay);
  }

  toJulianDay(date: AnyCalendarDate): number {
    let extendedYear = date.year + INDIAN_ERA_START;
    let [era, year] = fromExtendedYear(extendedYear);

    let leapMonth: number;
    let jd: number;
    if (isLeapYear(year)) {
      leapMonth = 31;
      jd = gregorianToJulianDay(era, year, 3, 21);
    } else {
      leapMonth = 30;
      jd = gregorianToJulianDay(era, year, 3, 22);
    }

    if (date.month === 1) {
      return jd + date.day - 1;
    }

    jd += leapMonth + Math.min(date.month - 2, 5) * 31;

    if (date.month >= 8) {
      jd += (date.month - 7) * 30;
    }

    jd += date.day - 1;
    return jd;
  }

  getDaysInMonth(date: AnyCalendarDate): number {
    if (date.month === 1 && isLeapYear(date.year + INDIAN_ERA_START)) {
      return 31;
    }

    if (date.month >= 2 && date.month <= 6) {
      return 31;
    }

    return 30;
  }

  getYearsInEra(): number {
    // 9999-12-31 gregorian is 9920-10-10 indian.
    // Round down to 9919 for the last full year.
    return 9919;
  }

  getEras(): string[] {
    return ['saka'];
  }

  balanceDate(): void {}
}
