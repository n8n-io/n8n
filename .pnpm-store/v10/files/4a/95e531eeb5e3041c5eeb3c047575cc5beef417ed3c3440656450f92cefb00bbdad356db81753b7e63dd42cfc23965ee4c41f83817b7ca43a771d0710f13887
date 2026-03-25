var $4ae0260a69729f1d$exports = require("./conversion.main.js");
var $4d88eff242b38a9e$exports = require("./weekStartData.main.js");


function $parcel$export(e, n, v, s) {
  Object.defineProperty(e, n, {get: v, set: s, enumerable: true, configurable: true});
}

$parcel$export(module.exports, "isSameDay", () => $1f0f7ebf1ae6c530$export$ea39ec197993aef0);
$parcel$export(module.exports, "isSameMonth", () => $1f0f7ebf1ae6c530$export$a18c89cbd24170ff);
$parcel$export(module.exports, "startOfMonth", () => $1f0f7ebf1ae6c530$export$a5a3b454ada2268e);
$parcel$export(module.exports, "isSameYear", () => $1f0f7ebf1ae6c530$export$5841f9eb9773f25f);
$parcel$export(module.exports, "startOfYear", () => $1f0f7ebf1ae6c530$export$f91e89d3d0406102);
$parcel$export(module.exports, "isEqualDay", () => $1f0f7ebf1ae6c530$export$91b62ebf2ba703ee);
$parcel$export(module.exports, "isEqualCalendar", () => $1f0f7ebf1ae6c530$export$dbc69fd56b53d5e);
$parcel$export(module.exports, "isEqualMonth", () => $1f0f7ebf1ae6c530$export$5a8da0c44a3afdf2);
$parcel$export(module.exports, "isEqualYear", () => $1f0f7ebf1ae6c530$export$ea840f5a6dda8147);
$parcel$export(module.exports, "isToday", () => $1f0f7ebf1ae6c530$export$629b0a497aa65267);
$parcel$export(module.exports, "today", () => $1f0f7ebf1ae6c530$export$d0bdf45af03a6ea3);
$parcel$export(module.exports, "getDayOfWeek", () => $1f0f7ebf1ae6c530$export$2061056d06d7cdf7);
$parcel$export(module.exports, "now", () => $1f0f7ebf1ae6c530$export$461939dd4422153);
$parcel$export(module.exports, "compareDate", () => $1f0f7ebf1ae6c530$export$68781ddf31c0090f);
$parcel$export(module.exports, "compareTime", () => $1f0f7ebf1ae6c530$export$c19a80a9721b80f6);
$parcel$export(module.exports, "getHoursInDay", () => $1f0f7ebf1ae6c530$export$126c91c941de7e);
$parcel$export(module.exports, "getLocalTimeZone", () => $1f0f7ebf1ae6c530$export$aa8b41735afcabd2);
$parcel$export(module.exports, "setLocalTimeZone", () => $1f0f7ebf1ae6c530$export$61a9d83ceb59a3dd);
$parcel$export(module.exports, "resetLocalTimeZone", () => $1f0f7ebf1ae6c530$export$55753838ffe79333);
$parcel$export(module.exports, "endOfMonth", () => $1f0f7ebf1ae6c530$export$a2258d9c4118825c);
$parcel$export(module.exports, "endOfYear", () => $1f0f7ebf1ae6c530$export$8b7aa55c66d5569e);
$parcel$export(module.exports, "getMinimumMonthInYear", () => $1f0f7ebf1ae6c530$export$5412ac11713b72ad);
$parcel$export(module.exports, "getMinimumDayInMonth", () => $1f0f7ebf1ae6c530$export$b2f4953d301981d5);
$parcel$export(module.exports, "startOfWeek", () => $1f0f7ebf1ae6c530$export$42c81a444fbfb5d4);
$parcel$export(module.exports, "endOfWeek", () => $1f0f7ebf1ae6c530$export$ef8b6d9133084f4e);
$parcel$export(module.exports, "getWeeksInMonth", () => $1f0f7ebf1ae6c530$export$ccc1b2479e7dd654);
$parcel$export(module.exports, "minDate", () => $1f0f7ebf1ae6c530$export$5c333a116e949cdd);
$parcel$export(module.exports, "maxDate", () => $1f0f7ebf1ae6c530$export$a75f2bff57811055);
$parcel$export(module.exports, "isWeekend", () => $1f0f7ebf1ae6c530$export$618d60ea299da42);
$parcel$export(module.exports, "isWeekday", () => $1f0f7ebf1ae6c530$export$ee9d87258e1d19ed);
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

function $1f0f7ebf1ae6c530$export$ea39ec197993aef0(a, b) {
    b = (0, $4ae0260a69729f1d$exports.toCalendar)(b, a.calendar);
    return a.era === b.era && a.year === b.year && a.month === b.month && a.day === b.day;
}
function $1f0f7ebf1ae6c530$export$a18c89cbd24170ff(a, b) {
    b = (0, $4ae0260a69729f1d$exports.toCalendar)(b, a.calendar);
    // In the Japanese calendar, months can span multiple eras/years, so only compare the first of the month.
    a = $1f0f7ebf1ae6c530$export$a5a3b454ada2268e(a);
    b = $1f0f7ebf1ae6c530$export$a5a3b454ada2268e(b);
    return a.era === b.era && a.year === b.year && a.month === b.month;
}
function $1f0f7ebf1ae6c530$export$5841f9eb9773f25f(a, b) {
    b = (0, $4ae0260a69729f1d$exports.toCalendar)(b, a.calendar);
    a = $1f0f7ebf1ae6c530$export$f91e89d3d0406102(a);
    b = $1f0f7ebf1ae6c530$export$f91e89d3d0406102(b);
    return a.era === b.era && a.year === b.year;
}
function $1f0f7ebf1ae6c530$export$91b62ebf2ba703ee(a, b) {
    return $1f0f7ebf1ae6c530$export$dbc69fd56b53d5e(a.calendar, b.calendar) && $1f0f7ebf1ae6c530$export$ea39ec197993aef0(a, b);
}
function $1f0f7ebf1ae6c530$export$5a8da0c44a3afdf2(a, b) {
    return $1f0f7ebf1ae6c530$export$dbc69fd56b53d5e(a.calendar, b.calendar) && $1f0f7ebf1ae6c530$export$a18c89cbd24170ff(a, b);
}
function $1f0f7ebf1ae6c530$export$ea840f5a6dda8147(a, b) {
    return $1f0f7ebf1ae6c530$export$dbc69fd56b53d5e(a.calendar, b.calendar) && $1f0f7ebf1ae6c530$export$5841f9eb9773f25f(a, b);
}
function $1f0f7ebf1ae6c530$export$dbc69fd56b53d5e(a, b) {
    var _a_isEqual, _b_isEqual;
    var _a_isEqual1, _ref;
    return (_ref = (_a_isEqual1 = (_a_isEqual = a.isEqual) === null || _a_isEqual === void 0 ? void 0 : _a_isEqual.call(a, b)) !== null && _a_isEqual1 !== void 0 ? _a_isEqual1 : (_b_isEqual = b.isEqual) === null || _b_isEqual === void 0 ? void 0 : _b_isEqual.call(b, a)) !== null && _ref !== void 0 ? _ref : a.identifier === b.identifier;
}
function $1f0f7ebf1ae6c530$export$629b0a497aa65267(date, timeZone) {
    return $1f0f7ebf1ae6c530$export$ea39ec197993aef0(date, $1f0f7ebf1ae6c530$export$d0bdf45af03a6ea3(timeZone));
}
const $1f0f7ebf1ae6c530$var$DAY_MAP = {
    sun: 0,
    mon: 1,
    tue: 2,
    wed: 3,
    thu: 4,
    fri: 5,
    sat: 6
};
function $1f0f7ebf1ae6c530$export$2061056d06d7cdf7(date, locale, firstDayOfWeek) {
    let julian = date.calendar.toJulianDay(date);
    // If julian is negative, then julian % 7 will be negative, so we adjust
    // accordingly.  Julian day 0 is Monday.
    let weekStart = firstDayOfWeek ? $1f0f7ebf1ae6c530$var$DAY_MAP[firstDayOfWeek] : $1f0f7ebf1ae6c530$var$getWeekStart(locale);
    let dayOfWeek = Math.ceil(julian + 1 - weekStart) % 7;
    if (dayOfWeek < 0) dayOfWeek += 7;
    return dayOfWeek;
}
function $1f0f7ebf1ae6c530$export$461939dd4422153(timeZone) {
    return (0, $4ae0260a69729f1d$exports.fromAbsolute)(Date.now(), timeZone);
}
function $1f0f7ebf1ae6c530$export$d0bdf45af03a6ea3(timeZone) {
    return (0, $4ae0260a69729f1d$exports.toCalendarDate)($1f0f7ebf1ae6c530$export$461939dd4422153(timeZone));
}
function $1f0f7ebf1ae6c530$export$68781ddf31c0090f(a, b) {
    return a.calendar.toJulianDay(a) - b.calendar.toJulianDay(b);
}
function $1f0f7ebf1ae6c530$export$c19a80a9721b80f6(a, b) {
    return $1f0f7ebf1ae6c530$var$timeToMs(a) - $1f0f7ebf1ae6c530$var$timeToMs(b);
}
function $1f0f7ebf1ae6c530$var$timeToMs(a) {
    return a.hour * 3600000 + a.minute * 60000 + a.second * 1000 + a.millisecond;
}
function $1f0f7ebf1ae6c530$export$126c91c941de7e(a, timeZone) {
    let ms = (0, $4ae0260a69729f1d$exports.toAbsolute)(a, timeZone);
    let tomorrow = a.add({
        days: 1
    });
    let tomorrowMs = (0, $4ae0260a69729f1d$exports.toAbsolute)(tomorrow, timeZone);
    return (tomorrowMs - ms) / 3600000;
}
let $1f0f7ebf1ae6c530$var$localTimeZone = null;
function $1f0f7ebf1ae6c530$export$aa8b41735afcabd2() {
    if ($1f0f7ebf1ae6c530$var$localTimeZone == null) $1f0f7ebf1ae6c530$var$localTimeZone = new Intl.DateTimeFormat().resolvedOptions().timeZone;
    return $1f0f7ebf1ae6c530$var$localTimeZone;
}
function $1f0f7ebf1ae6c530$export$61a9d83ceb59a3dd(timeZone) {
    $1f0f7ebf1ae6c530$var$localTimeZone = timeZone;
}
function $1f0f7ebf1ae6c530$export$55753838ffe79333() {
    $1f0f7ebf1ae6c530$var$localTimeZone = null;
}
function $1f0f7ebf1ae6c530$export$a5a3b454ada2268e(date) {
    // Use `subtract` instead of `set` so we don't get constrained in an era.
    return date.subtract({
        days: date.day - 1
    });
}
function $1f0f7ebf1ae6c530$export$a2258d9c4118825c(date) {
    return date.add({
        days: date.calendar.getDaysInMonth(date) - date.day
    });
}
function $1f0f7ebf1ae6c530$export$f91e89d3d0406102(date) {
    return $1f0f7ebf1ae6c530$export$a5a3b454ada2268e(date.subtract({
        months: date.month - 1
    }));
}
function $1f0f7ebf1ae6c530$export$8b7aa55c66d5569e(date) {
    return $1f0f7ebf1ae6c530$export$a2258d9c4118825c(date.add({
        months: date.calendar.getMonthsInYear(date) - date.month
    }));
}
function $1f0f7ebf1ae6c530$export$5412ac11713b72ad(date) {
    if (date.calendar.getMinimumMonthInYear) return date.calendar.getMinimumMonthInYear(date);
    return 1;
}
function $1f0f7ebf1ae6c530$export$b2f4953d301981d5(date) {
    if (date.calendar.getMinimumDayInMonth) return date.calendar.getMinimumDayInMonth(date);
    return 1;
}
function $1f0f7ebf1ae6c530$export$42c81a444fbfb5d4(date, locale, firstDayOfWeek) {
    let dayOfWeek = $1f0f7ebf1ae6c530$export$2061056d06d7cdf7(date, locale, firstDayOfWeek);
    return date.subtract({
        days: dayOfWeek
    });
}
function $1f0f7ebf1ae6c530$export$ef8b6d9133084f4e(date, locale, firstDayOfWeek) {
    return $1f0f7ebf1ae6c530$export$42c81a444fbfb5d4(date, locale, firstDayOfWeek).add({
        days: 6
    });
}
const $1f0f7ebf1ae6c530$var$cachedRegions = new Map();
function $1f0f7ebf1ae6c530$var$getRegion(locale) {
    // If the Intl.Locale API is available, use it to get the region for the locale.
    // @ts-ignore
    if (Intl.Locale) {
        // Constructing an Intl.Locale is expensive, so cache the result.
        let region = $1f0f7ebf1ae6c530$var$cachedRegions.get(locale);
        if (!region) {
            // @ts-ignore
            region = new Intl.Locale(locale).maximize().region;
            if (region) $1f0f7ebf1ae6c530$var$cachedRegions.set(locale, region);
        }
        return region;
    }
    // If not, just try splitting the string.
    // If the second part of the locale string is 'u',
    // then this is a unicode extension, so ignore it.
    // Otherwise, it should be the region.
    let part = locale.split('-')[1];
    return part === 'u' ? undefined : part;
}
function $1f0f7ebf1ae6c530$var$getWeekStart(locale) {
    // TODO: use Intl.Locale for this once browsers support the weekInfo property
    // https://github.com/tc39/proposal-intl-locale-info
    let region = $1f0f7ebf1ae6c530$var$getRegion(locale);
    return region ? (0, $4d88eff242b38a9e$exports.weekStartData)[region] || 0 : 0;
}
function $1f0f7ebf1ae6c530$export$ccc1b2479e7dd654(date, locale, firstDayOfWeek) {
    let days = date.calendar.getDaysInMonth(date);
    return Math.ceil(($1f0f7ebf1ae6c530$export$2061056d06d7cdf7($1f0f7ebf1ae6c530$export$a5a3b454ada2268e(date), locale, firstDayOfWeek) + days) / 7);
}
function $1f0f7ebf1ae6c530$export$5c333a116e949cdd(a, b) {
    if (a && b) return a.compare(b) <= 0 ? a : b;
    return a || b;
}
function $1f0f7ebf1ae6c530$export$a75f2bff57811055(a, b) {
    if (a && b) return a.compare(b) >= 0 ? a : b;
    return a || b;
}
const $1f0f7ebf1ae6c530$var$WEEKEND_DATA = {
    AF: [
        4,
        5
    ],
    AE: [
        5,
        6
    ],
    BH: [
        5,
        6
    ],
    DZ: [
        5,
        6
    ],
    EG: [
        5,
        6
    ],
    IL: [
        5,
        6
    ],
    IQ: [
        5,
        6
    ],
    IR: [
        5,
        5
    ],
    JO: [
        5,
        6
    ],
    KW: [
        5,
        6
    ],
    LY: [
        5,
        6
    ],
    OM: [
        5,
        6
    ],
    QA: [
        5,
        6
    ],
    SA: [
        5,
        6
    ],
    SD: [
        5,
        6
    ],
    SY: [
        5,
        6
    ],
    YE: [
        5,
        6
    ]
};
function $1f0f7ebf1ae6c530$export$618d60ea299da42(date, locale) {
    let julian = date.calendar.toJulianDay(date);
    // If julian is negative, then julian % 7 will be negative, so we adjust
    // accordingly.  Julian day 0 is Monday.
    let dayOfWeek = Math.ceil(julian + 1) % 7;
    if (dayOfWeek < 0) dayOfWeek += 7;
    let region = $1f0f7ebf1ae6c530$var$getRegion(locale);
    // Use Intl.Locale for this once weekInfo is supported.
    // https://github.com/tc39/proposal-intl-locale-info
    let [start, end] = $1f0f7ebf1ae6c530$var$WEEKEND_DATA[region] || [
        6,
        0
    ];
    return dayOfWeek === start || dayOfWeek === end;
}
function $1f0f7ebf1ae6c530$export$ee9d87258e1d19ed(date, locale) {
    return !$1f0f7ebf1ae6c530$export$618d60ea299da42(date, locale);
}


//# sourceMappingURL=queries.main.js.map
