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

import {BuddhistCalendar} from './calendars/BuddhistCalendar';
import {Calendar, CalendarIdentifier} from './types';
import {CopticCalendar, EthiopicAmeteAlemCalendar, EthiopicCalendar} from './calendars/EthiopicCalendar';
import {GregorianCalendar} from './calendars/GregorianCalendar';
import {HebrewCalendar} from './calendars/HebrewCalendar';
import {IndianCalendar} from './calendars/IndianCalendar';
import {IslamicCivilCalendar, IslamicTabularCalendar, IslamicUmalquraCalendar} from './calendars/IslamicCalendar';
import {JapaneseCalendar} from './calendars/JapaneseCalendar';
import {PersianCalendar} from './calendars/PersianCalendar';
import {TaiwanCalendar} from './calendars/TaiwanCalendar';

/** Creates a `Calendar` instance from a Unicode calendar identifier string. */
export function createCalendar(name: CalendarIdentifier): Calendar {
  switch (name) {
    case 'buddhist':
      return new BuddhistCalendar();
    case 'ethiopic':
      return new EthiopicCalendar();
    case 'ethioaa':
      return new EthiopicAmeteAlemCalendar();
    case 'coptic':
      return new CopticCalendar();
    case 'hebrew':
      return new HebrewCalendar();
    case 'indian':
      return new IndianCalendar();
    case 'islamic-civil':
      return new IslamicCivilCalendar();
    case 'islamic-tbla':
      return new IslamicTabularCalendar();
    case 'islamic-umalqura':
      return new IslamicUmalquraCalendar();
    case 'japanese':
      return new JapaneseCalendar();
    case 'persian':
      return new PersianCalendar();
    case 'roc':
      return new TaiwanCalendar();
    case 'gregory':
    default:
      return new GregorianCalendar();
  }
}
