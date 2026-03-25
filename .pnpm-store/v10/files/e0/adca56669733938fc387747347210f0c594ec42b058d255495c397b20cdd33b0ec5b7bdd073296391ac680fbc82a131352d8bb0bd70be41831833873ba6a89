var $625ad1e1f4c43bc1$exports = require("./CalendarDate.main.js");
var $5c0571aa5b6fb5da$exports = require("./manipulation.main.js");
var $af14c9812fdceb33$exports = require("./GregorianCalendar.main.js");
var $1f0f7ebf1ae6c530$exports = require("./queries.main.js");


function $parcel$export(e, n, v, s) {
  Object.defineProperty(e, n, {get: v, set: s, enumerable: true, configurable: true});
}

$parcel$export(module.exports, "epochFromDate", () => $4ae0260a69729f1d$export$bd4fb2bc8bb06fb);
$parcel$export(module.exports, "toCalendar", () => $4ae0260a69729f1d$export$b4a036af3fc0b032);
$parcel$export(module.exports, "possibleAbsolutes", () => $4ae0260a69729f1d$export$136f38efe7caf549);
$parcel$export(module.exports, "toAbsolute", () => $4ae0260a69729f1d$export$5107c82f94518f5c);
$parcel$export(module.exports, "toCalendarDateTime", () => $4ae0260a69729f1d$export$b21e0b124e224484);
$parcel$export(module.exports, "toDate", () => $4ae0260a69729f1d$export$e67a095c620b86fe);
$parcel$export(module.exports, "fromAbsolute", () => $4ae0260a69729f1d$export$1b96692a1ba042ac);
$parcel$export(module.exports, "fromDate", () => $4ae0260a69729f1d$export$e57ff100d91bd4b9);
$parcel$export(module.exports, "toCalendarDate", () => $4ae0260a69729f1d$export$93522d1a439f3617);
$parcel$export(module.exports, "toTime", () => $4ae0260a69729f1d$export$d33f79e3ffc3dc83);
$parcel$export(module.exports, "toZoned", () => $4ae0260a69729f1d$export$84c95a83c799e074);
$parcel$export(module.exports, "toTimeZone", () => $4ae0260a69729f1d$export$538b00033cc11c75);
$parcel$export(module.exports, "zonedToDate", () => $4ae0260a69729f1d$export$83aac07b4c37b25);
$parcel$export(module.exports, "toLocalTimeZone", () => $4ae0260a69729f1d$export$d9b67bc93c097491);
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




function $4ae0260a69729f1d$export$bd4fb2bc8bb06fb(date) {
    date = $4ae0260a69729f1d$export$b4a036af3fc0b032(date, new (0, $af14c9812fdceb33$exports.GregorianCalendar)());
    let year = (0, $af14c9812fdceb33$exports.getExtendedYear)(date.era, date.year);
    return $4ae0260a69729f1d$var$epochFromParts(year, date.month, date.day, date.hour, date.minute, date.second, date.millisecond);
}
function $4ae0260a69729f1d$var$epochFromParts(year, month, day, hour, minute, second, millisecond) {
    // Note: Date.UTC() interprets one and two-digit years as being in the
    // 20th century, so don't use it
    let date = new Date();
    date.setUTCHours(hour, minute, second, millisecond);
    date.setUTCFullYear(year, month - 1, day);
    return date.getTime();
}
function $4ae0260a69729f1d$export$59c99f3515d3493f(ms, timeZone) {
    // Fast path for UTC.
    if (timeZone === 'UTC') return 0;
    // Fast path: for local timezone after 1970, use native Date.
    if (ms > 0 && timeZone === (0, $1f0f7ebf1ae6c530$exports.getLocalTimeZone)()) return new Date(ms).getTimezoneOffset() * -60000;
    let { year: year, month: month, day: day, hour: hour, minute: minute, second: second } = $4ae0260a69729f1d$var$getTimeZoneParts(ms, timeZone);
    let utc = $4ae0260a69729f1d$var$epochFromParts(year, month, day, hour, minute, second, 0);
    return utc - Math.floor(ms / 1000) * 1000;
}
const $4ae0260a69729f1d$var$formattersByTimeZone = new Map();
function $4ae0260a69729f1d$var$getTimeZoneParts(ms, timeZone) {
    let formatter = $4ae0260a69729f1d$var$formattersByTimeZone.get(timeZone);
    if (!formatter) {
        formatter = new Intl.DateTimeFormat('en-US', {
            timeZone: timeZone,
            hour12: false,
            era: 'short',
            year: 'numeric',
            month: 'numeric',
            day: 'numeric',
            hour: 'numeric',
            minute: 'numeric',
            second: 'numeric'
        });
        $4ae0260a69729f1d$var$formattersByTimeZone.set(timeZone, formatter);
    }
    let parts = formatter.formatToParts(new Date(ms));
    let namedParts = {};
    for (let part of parts)if (part.type !== 'literal') namedParts[part.type] = part.value;
    return {
        // Firefox returns B instead of BC... https://bugzilla.mozilla.org/show_bug.cgi?id=1752253
        year: namedParts.era === 'BC' || namedParts.era === 'B' ? -namedParts.year + 1 : +namedParts.year,
        month: +namedParts.month,
        day: +namedParts.day,
        hour: namedParts.hour === '24' ? 0 : +namedParts.hour,
        minute: +namedParts.minute,
        second: +namedParts.second
    };
}
const $4ae0260a69729f1d$var$DAYMILLIS = 86400000;
function $4ae0260a69729f1d$export$136f38efe7caf549(date, timeZone) {
    let ms = $4ae0260a69729f1d$export$bd4fb2bc8bb06fb(date);
    let earlier = ms - $4ae0260a69729f1d$export$59c99f3515d3493f(ms - $4ae0260a69729f1d$var$DAYMILLIS, timeZone);
    let later = ms - $4ae0260a69729f1d$export$59c99f3515d3493f(ms + $4ae0260a69729f1d$var$DAYMILLIS, timeZone);
    return $4ae0260a69729f1d$var$getValidWallTimes(date, timeZone, earlier, later);
}
function $4ae0260a69729f1d$var$getValidWallTimes(date, timeZone, earlier, later) {
    let found = earlier === later ? [
        earlier
    ] : [
        earlier,
        later
    ];
    return found.filter((absolute)=>$4ae0260a69729f1d$var$isValidWallTime(date, timeZone, absolute));
}
function $4ae0260a69729f1d$var$isValidWallTime(date, timeZone, absolute) {
    let parts = $4ae0260a69729f1d$var$getTimeZoneParts(absolute, timeZone);
    return date.year === parts.year && date.month === parts.month && date.day === parts.day && date.hour === parts.hour && date.minute === parts.minute && date.second === parts.second;
}
function $4ae0260a69729f1d$export$5107c82f94518f5c(date, timeZone, disambiguation = 'compatible') {
    let dateTime = $4ae0260a69729f1d$export$b21e0b124e224484(date);
    // Fast path: if the time zone is UTC, use native Date.
    if (timeZone === 'UTC') return $4ae0260a69729f1d$export$bd4fb2bc8bb06fb(dateTime);
    // Fast path: if the time zone is the local timezone and disambiguation is compatible, use native Date.
    if (timeZone === (0, $1f0f7ebf1ae6c530$exports.getLocalTimeZone)() && disambiguation === 'compatible') {
        dateTime = $4ae0260a69729f1d$export$b4a036af3fc0b032(dateTime, new (0, $af14c9812fdceb33$exports.GregorianCalendar)());
        // Don't use Date constructor here because two-digit years are interpreted in the 20th century.
        let date = new Date();
        let year = (0, $af14c9812fdceb33$exports.getExtendedYear)(dateTime.era, dateTime.year);
        date.setFullYear(year, dateTime.month - 1, dateTime.day);
        date.setHours(dateTime.hour, dateTime.minute, dateTime.second, dateTime.millisecond);
        return date.getTime();
    }
    let ms = $4ae0260a69729f1d$export$bd4fb2bc8bb06fb(dateTime);
    let offsetBefore = $4ae0260a69729f1d$export$59c99f3515d3493f(ms - $4ae0260a69729f1d$var$DAYMILLIS, timeZone);
    let offsetAfter = $4ae0260a69729f1d$export$59c99f3515d3493f(ms + $4ae0260a69729f1d$var$DAYMILLIS, timeZone);
    let valid = $4ae0260a69729f1d$var$getValidWallTimes(dateTime, timeZone, ms - offsetBefore, ms - offsetAfter);
    if (valid.length === 1) return valid[0];
    if (valid.length > 1) switch(disambiguation){
        // 'compatible' means 'earlier' for "fall back" transitions
        case 'compatible':
        case 'earlier':
            return valid[0];
        case 'later':
            return valid[valid.length - 1];
        case 'reject':
            throw new RangeError('Multiple possible absolute times found');
    }
    switch(disambiguation){
        case 'earlier':
            return Math.min(ms - offsetBefore, ms - offsetAfter);
        // 'compatible' means 'later' for "spring forward" transitions
        case 'compatible':
        case 'later':
            return Math.max(ms - offsetBefore, ms - offsetAfter);
        case 'reject':
            throw new RangeError('No such absolute time found');
    }
}
function $4ae0260a69729f1d$export$e67a095c620b86fe(dateTime, timeZone, disambiguation = 'compatible') {
    return new Date($4ae0260a69729f1d$export$5107c82f94518f5c(dateTime, timeZone, disambiguation));
}
function $4ae0260a69729f1d$export$1b96692a1ba042ac(ms, timeZone) {
    let offset = $4ae0260a69729f1d$export$59c99f3515d3493f(ms, timeZone);
    let date = new Date(ms + offset);
    let year = date.getUTCFullYear();
    let month = date.getUTCMonth() + 1;
    let day = date.getUTCDate();
    let hour = date.getUTCHours();
    let minute = date.getUTCMinutes();
    let second = date.getUTCSeconds();
    let millisecond = date.getUTCMilliseconds();
    return new (0, $625ad1e1f4c43bc1$exports.ZonedDateTime)(year < 1 ? 'BC' : 'AD', year < 1 ? -year + 1 : year, month, day, timeZone, offset, hour, minute, second, millisecond);
}
function $4ae0260a69729f1d$export$e57ff100d91bd4b9(date, timeZone) {
    return $4ae0260a69729f1d$export$1b96692a1ba042ac(date.getTime(), timeZone);
}
function $4ae0260a69729f1d$export$d7f92bcd3596b086(date) {
    return $4ae0260a69729f1d$export$e57ff100d91bd4b9(date, (0, $1f0f7ebf1ae6c530$exports.getLocalTimeZone)());
}
function $4ae0260a69729f1d$export$93522d1a439f3617(dateTime) {
    return new (0, $625ad1e1f4c43bc1$exports.CalendarDate)(dateTime.calendar, dateTime.era, dateTime.year, dateTime.month, dateTime.day);
}
function $4ae0260a69729f1d$export$6f4d78149f3f53ac(date) {
    return {
        era: date.era,
        year: date.year,
        month: date.month,
        day: date.day
    };
}
function $4ae0260a69729f1d$export$4d0393e732857be5(date) {
    return {
        hour: date.hour,
        minute: date.minute,
        second: date.second,
        millisecond: date.millisecond
    };
}
function $4ae0260a69729f1d$export$b21e0b124e224484(date, time) {
    let hour = 0, minute = 0, second = 0, millisecond = 0;
    if ('timeZone' in date) ({ hour: hour, minute: minute, second: second, millisecond: millisecond } = date);
    else if ('hour' in date && !time) return date;
    if (time) ({ hour: hour, minute: minute, second: second, millisecond: millisecond } = time);
    return new (0, $625ad1e1f4c43bc1$exports.CalendarDateTime)(date.calendar, date.era, date.year, date.month, date.day, hour, minute, second, millisecond);
}
function $4ae0260a69729f1d$export$d33f79e3ffc3dc83(dateTime) {
    return new (0, $625ad1e1f4c43bc1$exports.Time)(dateTime.hour, dateTime.minute, dateTime.second, dateTime.millisecond);
}
function $4ae0260a69729f1d$export$b4a036af3fc0b032(date, calendar) {
    if ((0, $1f0f7ebf1ae6c530$exports.isEqualCalendar)(date.calendar, calendar)) return date;
    let calendarDate = calendar.fromJulianDay(date.calendar.toJulianDay(date));
    let copy = date.copy();
    copy.calendar = calendar;
    copy.era = calendarDate.era;
    copy.year = calendarDate.year;
    copy.month = calendarDate.month;
    copy.day = calendarDate.day;
    (0, $5c0571aa5b6fb5da$exports.constrain)(copy);
    return copy;
}
function $4ae0260a69729f1d$export$84c95a83c799e074(date, timeZone, disambiguation) {
    if (date instanceof (0, $625ad1e1f4c43bc1$exports.ZonedDateTime)) {
        if (date.timeZone === timeZone) return date;
        return $4ae0260a69729f1d$export$538b00033cc11c75(date, timeZone);
    }
    let ms = $4ae0260a69729f1d$export$5107c82f94518f5c(date, timeZone, disambiguation);
    return $4ae0260a69729f1d$export$1b96692a1ba042ac(ms, timeZone);
}
function $4ae0260a69729f1d$export$83aac07b4c37b25(date) {
    let ms = $4ae0260a69729f1d$export$bd4fb2bc8bb06fb(date) - date.offset;
    return new Date(ms);
}
function $4ae0260a69729f1d$export$538b00033cc11c75(date, timeZone) {
    let ms = $4ae0260a69729f1d$export$bd4fb2bc8bb06fb(date) - date.offset;
    return $4ae0260a69729f1d$export$b4a036af3fc0b032($4ae0260a69729f1d$export$1b96692a1ba042ac(ms, timeZone), date.calendar);
}
function $4ae0260a69729f1d$export$d9b67bc93c097491(date) {
    return $4ae0260a69729f1d$export$538b00033cc11c75(date, (0, $1f0f7ebf1ae6c530$exports.getLocalTimeZone)());
}


//# sourceMappingURL=conversion.main.js.map
