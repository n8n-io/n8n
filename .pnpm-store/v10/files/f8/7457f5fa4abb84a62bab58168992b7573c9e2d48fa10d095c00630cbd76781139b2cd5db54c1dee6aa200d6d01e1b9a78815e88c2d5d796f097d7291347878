var $625ad1e1f4c43bc1$exports = require("./CalendarDate.main.js");
var $af14c9812fdceb33$exports = require("./GregorianCalendar.main.js");


function $parcel$export(e, n, v, s) {
  Object.defineProperty(e, n, {get: v, set: s, enumerable: true, configurable: true});
}

$parcel$export(module.exports, "JapaneseCalendar", () => $b0ac0602ef646b2c$export$b746ab2b60cdffbf);
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
 */ // Portions of the code in this file are based on code from the TC39 Temporal proposal.
// Original licensing can be found in the NOTICE file in the root directory of this source tree.


const $b0ac0602ef646b2c$var$ERA_START_DATES = [
    [
        1868,
        9,
        8
    ],
    [
        1912,
        7,
        30
    ],
    [
        1926,
        12,
        25
    ],
    [
        1989,
        1,
        8
    ],
    [
        2019,
        5,
        1
    ]
];
const $b0ac0602ef646b2c$var$ERA_END_DATES = [
    [
        1912,
        7,
        29
    ],
    [
        1926,
        12,
        24
    ],
    [
        1989,
        1,
        7
    ],
    [
        2019,
        4,
        30
    ]
];
const $b0ac0602ef646b2c$var$ERA_ADDENDS = [
    1867,
    1911,
    1925,
    1988,
    2018
];
const $b0ac0602ef646b2c$var$ERA_NAMES = [
    'meiji',
    'taisho',
    'showa',
    'heisei',
    'reiwa'
];
function $b0ac0602ef646b2c$var$findEraFromGregorianDate(date) {
    const idx = $b0ac0602ef646b2c$var$ERA_START_DATES.findIndex(([year, month, day])=>{
        if (date.year < year) return true;
        if (date.year === year && date.month < month) return true;
        if (date.year === year && date.month === month && date.day < day) return true;
        return false;
    });
    if (idx === -1) return $b0ac0602ef646b2c$var$ERA_START_DATES.length - 1;
    if (idx === 0) return 0;
    return idx - 1;
}
function $b0ac0602ef646b2c$var$toGregorian(date) {
    let eraAddend = $b0ac0602ef646b2c$var$ERA_ADDENDS[$b0ac0602ef646b2c$var$ERA_NAMES.indexOf(date.era)];
    if (!eraAddend) throw new Error('Unknown era: ' + date.era);
    return new (0, $625ad1e1f4c43bc1$exports.CalendarDate)(date.year + eraAddend, date.month, date.day);
}
class $b0ac0602ef646b2c$export$b746ab2b60cdffbf extends (0, $af14c9812fdceb33$exports.GregorianCalendar) {
    fromJulianDay(jd) {
        let date = super.fromJulianDay(jd);
        let era = $b0ac0602ef646b2c$var$findEraFromGregorianDate(date);
        return new (0, $625ad1e1f4c43bc1$exports.CalendarDate)(this, $b0ac0602ef646b2c$var$ERA_NAMES[era], date.year - $b0ac0602ef646b2c$var$ERA_ADDENDS[era], date.month, date.day);
    }
    toJulianDay(date) {
        return super.toJulianDay($b0ac0602ef646b2c$var$toGregorian(date));
    }
    balanceDate(date) {
        let gregorianDate = $b0ac0602ef646b2c$var$toGregorian(date);
        let era = $b0ac0602ef646b2c$var$findEraFromGregorianDate(gregorianDate);
        if ($b0ac0602ef646b2c$var$ERA_NAMES[era] !== date.era) {
            date.era = $b0ac0602ef646b2c$var$ERA_NAMES[era];
            date.year = gregorianDate.year - $b0ac0602ef646b2c$var$ERA_ADDENDS[era];
        }
        // Constrain in case we went before the first supported era.
        this.constrainDate(date);
    }
    constrainDate(date) {
        let idx = $b0ac0602ef646b2c$var$ERA_NAMES.indexOf(date.era);
        let end = $b0ac0602ef646b2c$var$ERA_END_DATES[idx];
        if (end != null) {
            let [endYear, endMonth, endDay] = end;
            // Constrain the year to the maximum possible value in the era.
            // Then constrain the month and day fields within that.
            let maxYear = endYear - $b0ac0602ef646b2c$var$ERA_ADDENDS[idx];
            date.year = Math.max(1, Math.min(maxYear, date.year));
            if (date.year === maxYear) {
                date.month = Math.min(endMonth, date.month);
                if (date.month === endMonth) date.day = Math.min(endDay, date.day);
            }
        }
        if (date.year === 1 && idx >= 0) {
            let [, startMonth, startDay] = $b0ac0602ef646b2c$var$ERA_START_DATES[idx];
            date.month = Math.max(startMonth, date.month);
            if (date.month === startMonth) date.day = Math.max(startDay, date.day);
        }
    }
    getEras() {
        return $b0ac0602ef646b2c$var$ERA_NAMES;
    }
    getYearsInEra(date) {
        // Get the number of years in the era, taking into account the date's month and day fields.
        let era = $b0ac0602ef646b2c$var$ERA_NAMES.indexOf(date.era);
        let cur = $b0ac0602ef646b2c$var$ERA_START_DATES[era];
        let next = $b0ac0602ef646b2c$var$ERA_START_DATES[era + 1];
        if (next == null) // 9999 gregorian is the maximum year allowed.
        return 9999 - cur[0] + 1;
        let years = next[0] - cur[0];
        if (date.month < next[1] || date.month === next[1] && date.day < next[2]) years++;
        return years;
    }
    getDaysInMonth(date) {
        return super.getDaysInMonth($b0ac0602ef646b2c$var$toGregorian(date));
    }
    getMinimumMonthInYear(date) {
        let start = $b0ac0602ef646b2c$var$getMinimums(date);
        return start ? start[1] : 1;
    }
    getMinimumDayInMonth(date) {
        let start = $b0ac0602ef646b2c$var$getMinimums(date);
        return start && date.month === start[1] ? start[2] : 1;
    }
    constructor(...args){
        super(...args), this.identifier = 'japanese';
    }
}
function $b0ac0602ef646b2c$var$getMinimums(date) {
    if (date.year === 1) {
        let idx = $b0ac0602ef646b2c$var$ERA_NAMES.indexOf(date.era);
        return $b0ac0602ef646b2c$var$ERA_START_DATES[idx];
    }
}


//# sourceMappingURL=JapaneseCalendar.main.js.map
