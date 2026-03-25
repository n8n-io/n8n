var $625ad1e1f4c43bc1$exports = require("./CalendarDate.main.js");


function $parcel$export(e, n, v, s) {
  Object.defineProperty(e, n, {get: v, set: s, enumerable: true, configurable: true});
}

$parcel$export(module.exports, "EthiopicCalendar", () => $4db04d1051af0f2f$export$26ba6eab5e20cd7d);
$parcel$export(module.exports, "EthiopicAmeteAlemCalendar", () => $4db04d1051af0f2f$export$d72e0c37005a4914);
$parcel$export(module.exports, "CopticCalendar", () => $4db04d1051af0f2f$export$fe6243cbe1a4b7c1);
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

const $4db04d1051af0f2f$var$ETHIOPIC_EPOCH = 1723856;
const $4db04d1051af0f2f$var$COPTIC_EPOCH = 1824665;
// The delta between Amete Alem 1 and Amete Mihret 1
// AA 5501 = AM 1
const $4db04d1051af0f2f$var$AMETE_MIHRET_DELTA = 5500;
function $4db04d1051af0f2f$var$ceToJulianDay(epoch, year, month, day) {
    return epoch // difference from Julian epoch to 1,1,1
     + 365 * year // number of days from years
     + Math.floor(year / 4) // extra day of leap year
     + 30 * (month - 1 // number of days from months (1 based)
    ) + day - 1 // number of days for present month (1 based)
    ;
}
function $4db04d1051af0f2f$var$julianDayToCE(epoch, jd) {
    let year = Math.floor(4 * (jd - epoch) / 1461);
    let month = 1 + Math.floor((jd - $4db04d1051af0f2f$var$ceToJulianDay(epoch, year, 1, 1)) / 30);
    let day = jd + 1 - $4db04d1051af0f2f$var$ceToJulianDay(epoch, year, month, 1);
    return [
        year,
        month,
        day
    ];
}
function $4db04d1051af0f2f$var$getLeapDay(year) {
    return Math.floor(year % 4 / 3);
}
function $4db04d1051af0f2f$var$getDaysInMonth(year, month) {
    // The Ethiopian and Coptic calendars have 13 months, 12 of 30 days each and
    // an intercalary month at the end of the year of 5 or 6 days, depending whether
    // the year is a leap year or not. The Leap Year follows the same rules as the
    // Julian Calendar so that the extra month always has six days in the year before
    // a Julian Leap Year.
    if (month % 13 !== 0) // not intercalary month
    return 30;
    else // intercalary month 5 days + possible leap day
    return $4db04d1051af0f2f$var$getLeapDay(year) + 5;
}
class $4db04d1051af0f2f$export$26ba6eab5e20cd7d {
    fromJulianDay(jd) {
        let [year, month, day] = $4db04d1051af0f2f$var$julianDayToCE($4db04d1051af0f2f$var$ETHIOPIC_EPOCH, jd);
        let era = 'AM';
        if (year <= 0) {
            era = 'AA';
            year += $4db04d1051af0f2f$var$AMETE_MIHRET_DELTA;
        }
        return new (0, $625ad1e1f4c43bc1$exports.CalendarDate)(this, era, year, month, day);
    }
    toJulianDay(date) {
        let year = date.year;
        if (date.era === 'AA') year -= $4db04d1051af0f2f$var$AMETE_MIHRET_DELTA;
        return $4db04d1051af0f2f$var$ceToJulianDay($4db04d1051af0f2f$var$ETHIOPIC_EPOCH, year, date.month, date.day);
    }
    getDaysInMonth(date) {
        return $4db04d1051af0f2f$var$getDaysInMonth(date.year, date.month);
    }
    getMonthsInYear() {
        return 13;
    }
    getDaysInYear(date) {
        return 365 + $4db04d1051af0f2f$var$getLeapDay(date.year);
    }
    getYearsInEra(date) {
        // 9999-12-31 gregorian is 9992-20-02 ethiopic.
        // Round down to 9991 for the last full year.
        // AA 9999-01-01 ethiopic is 4506-09-30 gregorian.
        return date.era === 'AA' ? 9999 : 9991;
    }
    getEras() {
        return [
            'AA',
            'AM'
        ];
    }
    constructor(){
        this.identifier = 'ethiopic';
    }
}
class $4db04d1051af0f2f$export$d72e0c37005a4914 extends $4db04d1051af0f2f$export$26ba6eab5e20cd7d {
    fromJulianDay(jd) {
        let [year, month, day] = $4db04d1051af0f2f$var$julianDayToCE($4db04d1051af0f2f$var$ETHIOPIC_EPOCH, jd);
        year += $4db04d1051af0f2f$var$AMETE_MIHRET_DELTA;
        return new (0, $625ad1e1f4c43bc1$exports.CalendarDate)(this, 'AA', year, month, day);
    }
    getEras() {
        return [
            'AA'
        ];
    }
    getYearsInEra() {
        // 9999-13-04 ethioaa is the maximum date, which is equivalent to 4506-09-29 gregorian.
        return 9999;
    }
    constructor(...args){
        super(...args), this.identifier = 'ethioaa' // also known as 'ethiopic-amete-alem' in ICU
        ;
    }
}
class $4db04d1051af0f2f$export$fe6243cbe1a4b7c1 extends $4db04d1051af0f2f$export$26ba6eab5e20cd7d {
    fromJulianDay(jd) {
        let [year, month, day] = $4db04d1051af0f2f$var$julianDayToCE($4db04d1051af0f2f$var$COPTIC_EPOCH, jd);
        let era = 'CE';
        if (year <= 0) {
            era = 'BCE';
            year = 1 - year;
        }
        return new (0, $625ad1e1f4c43bc1$exports.CalendarDate)(this, era, year, month, day);
    }
    toJulianDay(date) {
        let year = date.year;
        if (date.era === 'BCE') year = 1 - year;
        return $4db04d1051af0f2f$var$ceToJulianDay($4db04d1051af0f2f$var$COPTIC_EPOCH, year, date.month, date.day);
    }
    getDaysInMonth(date) {
        let year = date.year;
        if (date.era === 'BCE') year = 1 - year;
        return $4db04d1051af0f2f$var$getDaysInMonth(year, date.month);
    }
    isInverseEra(date) {
        return date.era === 'BCE';
    }
    balanceDate(date) {
        if (date.year <= 0) {
            date.era = date.era === 'BCE' ? 'CE' : 'BCE';
            date.year = 1 - date.year;
        }
    }
    getEras() {
        return [
            'BCE',
            'CE'
        ];
    }
    getYearsInEra(date) {
        // 9999-12-30 gregorian is 9716-02-20 coptic.
        // Round down to 9715 for the last full year.
        // BCE 9999-01-01 coptic is BC 9716-06-15 gregorian.
        return date.era === 'BCE' ? 9999 : 9715;
    }
    constructor(...args){
        super(...args), this.identifier = 'coptic';
    }
}


//# sourceMappingURL=EthiopicCalendar.main.js.map
