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
import {Mutable} from '../utils';

const TAIWAN_ERA_START = 1911;

function gregorianYear(date: AnyCalendarDate) {
  return date.era === 'minguo'
    ? date.year + TAIWAN_ERA_START
    : 1 - date.year + TAIWAN_ERA_START;
}

function gregorianToTaiwan(year: number): [string, number] {
  let y = year - TAIWAN_ERA_START;
  if (y > 0) {
    return ['minguo', y];
  } else {
    return ['before_minguo', 1 - y];
  }
}

/**
 * The Taiwanese calendar is the same as the Gregorian calendar, but years
 * are numbered starting from 1912 (Gregorian). Two eras are supported:
 * 'before_minguo' and 'minguo'.
 */
export class TaiwanCalendar extends GregorianCalendar {
  identifier: CalendarIdentifier = 'roc'; // Republic of China

  fromJulianDay(jd: number): CalendarDate {
    let date = super.fromJulianDay(jd);
    let extendedYear = getExtendedYear(date.era, date.year);
    let [era, year] = gregorianToTaiwan(extendedYear);
    return new CalendarDate(this, era, year, date.month, date.day);
  }

  toJulianDay(date: AnyCalendarDate): number {
    return super.toJulianDay(toGregorian(date));
  }

  getEras(): string[] {
    return ['before_minguo', 'minguo'];
  }

  balanceDate(date: Mutable<AnyCalendarDate>): void {
    let [era, year] = gregorianToTaiwan(gregorianYear(date));
    date.era = era;
    date.year = year;
  }

  isInverseEra(date: AnyCalendarDate): boolean {
    return date.era === 'before_minguo';
  }

  getDaysInMonth(date: AnyCalendarDate): number {
    return super.getDaysInMonth(toGregorian(date));
  }

  getYearsInEra(date: AnyCalendarDate): number {
    return date.era === 'before_minguo' ? 9999 : 9999 - TAIWAN_ERA_START;
  }
}

function toGregorian(date: AnyCalendarDate) {
  let [era, year] = fromExtendedYear(gregorianYear(date));
  return new CalendarDate(
    era,
    year,
    date.month,
    date.day
  );
}
