var $625ad1e1f4c43bc1$exports = require("./CalendarDate.main.js");
var $af14c9812fdceb33$exports = require("./GregorianCalendar.main.js");


function $parcel$export(e, n, v, s) {
  Object.defineProperty(e, n, {get: v, set: s, enumerable: true, configurable: true});
}

$parcel$export(module.exports, "IndianCalendar", () => $5f1dfa5c67609fe6$export$39f31c639fa15726);
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
 */ // Portions of the code in this file are based on code from ICU.
// Original licensing can be found in the NOTICE file in the root directory of this source tree.


// Starts in 78 AD,
const $5f1dfa5c67609fe6$var$INDIAN_ERA_START = 78;
// The Indian year starts 80 days later than the Gregorian year.
const $5f1dfa5c67609fe6$var$INDIAN_YEAR_START = 80;
class $5f1dfa5c67609fe6$export$39f31c639fa15726 extends (0, $af14c9812fdceb33$exports.GregorianCalendar) {
    fromJulianDay(jd) {
        // Gregorian date for Julian day
        let date = super.fromJulianDay(jd);
        // Year in Saka era
        let indianYear = date.year - $5f1dfa5c67609fe6$var$INDIAN_ERA_START;
        // Day number in Gregorian year (starting from 0)
        let yDay = jd - (0, $af14c9812fdceb33$exports.gregorianToJulianDay)(date.era, date.year, 1, 1);
        let leapMonth;
        if (yDay < $5f1dfa5c67609fe6$var$INDIAN_YEAR_START) {
            //  Day is at the end of the preceding Saka year
            indianYear--;
            // Days in leapMonth this year, previous Gregorian year
            leapMonth = (0, $af14c9812fdceb33$exports.isLeapYear)(date.year - 1) ? 31 : 30;
            yDay += leapMonth + 155 + 90 + 10;
        } else {
            // Days in leapMonth this year
            leapMonth = (0, $af14c9812fdceb33$exports.isLeapYear)(date.year) ? 31 : 30;
            yDay -= $5f1dfa5c67609fe6$var$INDIAN_YEAR_START;
        }
        let indianMonth;
        let indianDay;
        if (yDay < leapMonth) {
            indianMonth = 1;
            indianDay = yDay + 1;
        } else {
            let mDay = yDay - leapMonth;
            if (mDay < 155) {
                indianMonth = Math.floor(mDay / 31) + 2;
                indianDay = mDay % 31 + 1;
            } else {
                mDay -= 155;
                indianMonth = Math.floor(mDay / 30) + 7;
                indianDay = mDay % 30 + 1;
            }
        }
        return new (0, $625ad1e1f4c43bc1$exports.CalendarDate)(this, indianYear, indianMonth, indianDay);
    }
    toJulianDay(date) {
        let extendedYear = date.year + $5f1dfa5c67609fe6$var$INDIAN_ERA_START;
        let [era, year] = (0, $af14c9812fdceb33$exports.fromExtendedYear)(extendedYear);
        let leapMonth;
        let jd;
        if ((0, $af14c9812fdceb33$exports.isLeapYear)(year)) {
            leapMonth = 31;
            jd = (0, $af14c9812fdceb33$exports.gregorianToJulianDay)(era, year, 3, 21);
        } else {
            leapMonth = 30;
            jd = (0, $af14c9812fdceb33$exports.gregorianToJulianDay)(era, year, 3, 22);
        }
        if (date.month === 1) return jd + date.day - 1;
        jd += leapMonth + Math.min(date.month - 2, 5) * 31;
        if (date.month >= 8) jd += (date.month - 7) * 30;
        jd += date.day - 1;
        return jd;
    }
    getDaysInMonth(date) {
        if (date.month === 1 && (0, $af14c9812fdceb33$exports.isLeapYear)(date.year + $5f1dfa5c67609fe6$var$INDIAN_ERA_START)) return 31;
        if (date.month >= 2 && date.month <= 6) return 31;
        return 30;
    }
    getYearsInEra() {
        // 9999-12-31 gregorian is 9920-10-10 indian.
        // Round down to 9919 for the last full year.
        return 9919;
    }
    getEras() {
        return [
            'saka'
        ];
    }
    balanceDate() {}
    constructor(...args){
        super(...args), this.identifier = 'indian';
    }
}


//# sourceMappingURL=IndianCalendar.main.js.map
