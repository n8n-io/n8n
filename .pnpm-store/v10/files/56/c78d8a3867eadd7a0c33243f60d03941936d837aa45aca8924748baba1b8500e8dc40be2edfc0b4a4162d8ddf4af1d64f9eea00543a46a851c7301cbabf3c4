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
import {fromExtendedYear, getExtendedYear, GregorianCalendar} from './GregorianCalendar';

const BUDDHIST_ERA_START = -543;

/**
 * The Buddhist calendar is the same as the Gregorian calendar, but counts years
 * starting from the birth of Buddha in 543 BC (Gregorian). It supports only one
 * era, identified as 'BE'.
 */
export class BuddhistCalendar extends GregorianCalendar {
  identifier: CalendarIdentifier = 'buddhist';

  fromJulianDay(jd: number): CalendarDate {
    let gregorianDate = super.fromJulianDay(jd);
    let year = getExtendedYear(gregorianDate.era, gregorianDate.year);
    return new CalendarDate(
      this,
      year - BUDDHIST_ERA_START,
      gregorianDate.month,
      gregorianDate.day
    );
  }

  toJulianDay(date: AnyCalendarDate): number {
    return super.toJulianDay(toGregorian(date));
  }

  getEras(): string[] {
    return ['BE'];
  }

  getDaysInMonth(date: AnyCalendarDate): number {
    return super.getDaysInMonth(toGregorian(date));
  }

  balanceDate(): void {}
}

function toGregorian(date: AnyCalendarDate) {
  let [era, year] = fromExtendedYear(date.year + BUDDHIST_ERA_START);
  return new CalendarDate(
    era,
    year,
    date.month,
    date.day
  );
}
