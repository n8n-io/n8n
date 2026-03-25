var $5c0571aa5b6fb5da$exports = require("./manipulation.main.js");
var $1f0f7ebf1ae6c530$exports = require("./queries.main.js");
var $4c32e2d98e5a5134$exports = require("./string.main.js");
var $af14c9812fdceb33$exports = require("./GregorianCalendar.main.js");
var $4ae0260a69729f1d$exports = require("./conversion.main.js");
var $lislG$swchelperscjs_class_private_field_initcjs = require("@swc/helpers/cjs/_class_private_field_init.cjs");


function $parcel$export(e, n, v, s) {
  Object.defineProperty(e, n, {get: v, set: s, enumerable: true, configurable: true});
}

$parcel$export(module.exports, "CalendarDate", () => $625ad1e1f4c43bc1$export$99faa760c7908e4f);
$parcel$export(module.exports, "Time", () => $625ad1e1f4c43bc1$export$680ea196effce5f);
$parcel$export(module.exports, "CalendarDateTime", () => $625ad1e1f4c43bc1$export$ca871e8dbb80966f);
$parcel$export(module.exports, "ZonedDateTime", () => $625ad1e1f4c43bc1$export$d3b7288e7994edea);
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





function $625ad1e1f4c43bc1$var$shiftArgs(args) {
    let calendar = typeof args[0] === 'object' ? args.shift() : new (0, $af14c9812fdceb33$exports.GregorianCalendar)();
    let era;
    if (typeof args[0] === 'string') era = args.shift();
    else {
        let eras = calendar.getEras();
        era = eras[eras.length - 1];
    }
    let year = args.shift();
    let month = args.shift();
    let day = args.shift();
    return [
        calendar,
        era,
        year,
        month,
        day
    ];
}
var // This prevents TypeScript from allowing other types with the same fields to match.
// i.e. a ZonedDateTime should not be be passable to a parameter that expects CalendarDate.
// If that behavior is desired, use the AnyCalendarDate interface instead.
// @ts-ignore
$625ad1e1f4c43bc1$var$_type = /*#__PURE__*/ new WeakMap();
class $625ad1e1f4c43bc1$export$99faa760c7908e4f {
    /** Returns a copy of this date. */ copy() {
        if (this.era) return new $625ad1e1f4c43bc1$export$99faa760c7908e4f(this.calendar, this.era, this.year, this.month, this.day);
        else return new $625ad1e1f4c43bc1$export$99faa760c7908e4f(this.calendar, this.year, this.month, this.day);
    }
    /** Returns a new `CalendarDate` with the given duration added to it. */ add(duration) {
        return (0, $5c0571aa5b6fb5da$exports.add)(this, duration);
    }
    /** Returns a new `CalendarDate` with the given duration subtracted from it. */ subtract(duration) {
        return (0, $5c0571aa5b6fb5da$exports.subtract)(this, duration);
    }
    /** Returns a new `CalendarDate` with the given fields set to the provided values. Other fields will be constrained accordingly. */ set(fields) {
        return (0, $5c0571aa5b6fb5da$exports.set)(this, fields);
    }
    /**
   * Returns a new `CalendarDate` with the given field adjusted by a specified amount.
   * When the resulting value reaches the limits of the field, it wraps around.
   */ cycle(field, amount, options) {
        return (0, $5c0571aa5b6fb5da$exports.cycleDate)(this, field, amount, options);
    }
    /** Converts the date to a native JavaScript Date object, with the time set to midnight in the given time zone. */ toDate(timeZone) {
        return (0, $4ae0260a69729f1d$exports.toDate)(this, timeZone);
    }
    /** Converts the date to an ISO 8601 formatted string. */ toString() {
        return (0, $4c32e2d98e5a5134$exports.dateToString)(this);
    }
    /** Compares this date with another. A negative result indicates that this date is before the given one, and a positive date indicates that it is after. */ compare(b) {
        return (0, $1f0f7ebf1ae6c530$exports.compareDate)(this, b);
    }
    constructor(...args){
        (0, $lislG$swchelperscjs_class_private_field_initcjs._)(this, $625ad1e1f4c43bc1$var$_type, {
            writable: true,
            value: void 0
        });
        let [calendar, era, year, month, day] = $625ad1e1f4c43bc1$var$shiftArgs(args);
        this.calendar = calendar;
        this.era = era;
        this.year = year;
        this.month = month;
        this.day = day;
        (0, $5c0571aa5b6fb5da$exports.constrain)(this);
    }
}
var // This prevents TypeScript from allowing other types with the same fields to match.
// @ts-ignore
$625ad1e1f4c43bc1$var$_type1 = /*#__PURE__*/ new WeakMap();
class $625ad1e1f4c43bc1$export$680ea196effce5f {
    /** Returns a copy of this time. */ copy() {
        return new $625ad1e1f4c43bc1$export$680ea196effce5f(this.hour, this.minute, this.second, this.millisecond);
    }
    /** Returns a new `Time` with the given duration added to it. */ add(duration) {
        return (0, $5c0571aa5b6fb5da$exports.addTime)(this, duration);
    }
    /** Returns a new `Time` with the given duration subtracted from it. */ subtract(duration) {
        return (0, $5c0571aa5b6fb5da$exports.subtractTime)(this, duration);
    }
    /** Returns a new `Time` with the given fields set to the provided values. Other fields will be constrained accordingly. */ set(fields) {
        return (0, $5c0571aa5b6fb5da$exports.setTime)(this, fields);
    }
    /**
   * Returns a new `Time` with the given field adjusted by a specified amount.
   * When the resulting value reaches the limits of the field, it wraps around.
   */ cycle(field, amount, options) {
        return (0, $5c0571aa5b6fb5da$exports.cycleTime)(this, field, amount, options);
    }
    /** Converts the time to an ISO 8601 formatted string. */ toString() {
        return (0, $4c32e2d98e5a5134$exports.timeToString)(this);
    }
    /** Compares this time with another. A negative result indicates that this time is before the given one, and a positive time indicates that it is after. */ compare(b) {
        return (0, $1f0f7ebf1ae6c530$exports.compareTime)(this, b);
    }
    constructor(hour = 0, minute = 0, second = 0, millisecond = 0){
        (0, $lislG$swchelperscjs_class_private_field_initcjs._)(this, $625ad1e1f4c43bc1$var$_type1, {
            writable: true,
            value: void 0
        });
        this.hour = hour;
        this.minute = minute;
        this.second = second;
        this.millisecond = millisecond;
        (0, $5c0571aa5b6fb5da$exports.constrainTime)(this);
    }
}
var // This prevents TypeScript from allowing other types with the same fields to match.
// @ts-ignore
$625ad1e1f4c43bc1$var$_type2 = /*#__PURE__*/ new WeakMap();
class $625ad1e1f4c43bc1$export$ca871e8dbb80966f {
    /** Returns a copy of this date. */ copy() {
        if (this.era) return new $625ad1e1f4c43bc1$export$ca871e8dbb80966f(this.calendar, this.era, this.year, this.month, this.day, this.hour, this.minute, this.second, this.millisecond);
        else return new $625ad1e1f4c43bc1$export$ca871e8dbb80966f(this.calendar, this.year, this.month, this.day, this.hour, this.minute, this.second, this.millisecond);
    }
    /** Returns a new `CalendarDateTime` with the given duration added to it. */ add(duration) {
        return (0, $5c0571aa5b6fb5da$exports.add)(this, duration);
    }
    /** Returns a new `CalendarDateTime` with the given duration subtracted from it. */ subtract(duration) {
        return (0, $5c0571aa5b6fb5da$exports.subtract)(this, duration);
    }
    /** Returns a new `CalendarDateTime` with the given fields set to the provided values. Other fields will be constrained accordingly. */ set(fields) {
        return (0, $5c0571aa5b6fb5da$exports.set)((0, $5c0571aa5b6fb5da$exports.setTime)(this, fields), fields);
    }
    /**
   * Returns a new `CalendarDateTime` with the given field adjusted by a specified amount.
   * When the resulting value reaches the limits of the field, it wraps around.
   */ cycle(field, amount, options) {
        switch(field){
            case 'era':
            case 'year':
            case 'month':
            case 'day':
                return (0, $5c0571aa5b6fb5da$exports.cycleDate)(this, field, amount, options);
            default:
                return (0, $5c0571aa5b6fb5da$exports.cycleTime)(this, field, amount, options);
        }
    }
    /** Converts the date to a native JavaScript Date object in the given time zone. */ toDate(timeZone, disambiguation) {
        return (0, $4ae0260a69729f1d$exports.toDate)(this, timeZone, disambiguation);
    }
    /** Converts the date to an ISO 8601 formatted string. */ toString() {
        return (0, $4c32e2d98e5a5134$exports.dateTimeToString)(this);
    }
    /** Compares this date with another. A negative result indicates that this date is before the given one, and a positive date indicates that it is after. */ compare(b) {
        let res = (0, $1f0f7ebf1ae6c530$exports.compareDate)(this, b);
        if (res === 0) return (0, $1f0f7ebf1ae6c530$exports.compareTime)(this, (0, $4ae0260a69729f1d$exports.toCalendarDateTime)(b));
        return res;
    }
    constructor(...args){
        (0, $lislG$swchelperscjs_class_private_field_initcjs._)(this, $625ad1e1f4c43bc1$var$_type2, {
            writable: true,
            value: void 0
        });
        let [calendar, era, year, month, day] = $625ad1e1f4c43bc1$var$shiftArgs(args);
        this.calendar = calendar;
        this.era = era;
        this.year = year;
        this.month = month;
        this.day = day;
        this.hour = args.shift() || 0;
        this.minute = args.shift() || 0;
        this.second = args.shift() || 0;
        this.millisecond = args.shift() || 0;
        (0, $5c0571aa5b6fb5da$exports.constrain)(this);
    }
}
var // This prevents TypeScript from allowing other types with the same fields to match.
// @ts-ignore
$625ad1e1f4c43bc1$var$_type3 = /*#__PURE__*/ new WeakMap();
class $625ad1e1f4c43bc1$export$d3b7288e7994edea {
    /** Returns a copy of this date. */ copy() {
        if (this.era) return new $625ad1e1f4c43bc1$export$d3b7288e7994edea(this.calendar, this.era, this.year, this.month, this.day, this.timeZone, this.offset, this.hour, this.minute, this.second, this.millisecond);
        else return new $625ad1e1f4c43bc1$export$d3b7288e7994edea(this.calendar, this.year, this.month, this.day, this.timeZone, this.offset, this.hour, this.minute, this.second, this.millisecond);
    }
    /** Returns a new `ZonedDateTime` with the given duration added to it. */ add(duration) {
        return (0, $5c0571aa5b6fb5da$exports.addZoned)(this, duration);
    }
    /** Returns a new `ZonedDateTime` with the given duration subtracted from it. */ subtract(duration) {
        return (0, $5c0571aa5b6fb5da$exports.subtractZoned)(this, duration);
    }
    /** Returns a new `ZonedDateTime` with the given fields set to the provided values. Other fields will be constrained accordingly. */ set(fields, disambiguation) {
        return (0, $5c0571aa5b6fb5da$exports.setZoned)(this, fields, disambiguation);
    }
    /**
   * Returns a new `ZonedDateTime` with the given field adjusted by a specified amount.
   * When the resulting value reaches the limits of the field, it wraps around.
   */ cycle(field, amount, options) {
        return (0, $5c0571aa5b6fb5da$exports.cycleZoned)(this, field, amount, options);
    }
    /** Converts the date to a native JavaScript Date object. */ toDate() {
        return (0, $4ae0260a69729f1d$exports.zonedToDate)(this);
    }
    /** Converts the date to an ISO 8601 formatted string, including the UTC offset and time zone identifier. */ toString() {
        return (0, $4c32e2d98e5a5134$exports.zonedDateTimeToString)(this);
    }
    /** Converts the date to an ISO 8601 formatted string in UTC. */ toAbsoluteString() {
        return this.toDate().toISOString();
    }
    /** Compares this date with another. A negative result indicates that this date is before the given one, and a positive date indicates that it is after. */ compare(b) {
        // TODO: Is this a bad idea??
        return this.toDate().getTime() - (0, $4ae0260a69729f1d$exports.toZoned)(b, this.timeZone).toDate().getTime();
    }
    constructor(...args){
        (0, $lislG$swchelperscjs_class_private_field_initcjs._)(this, $625ad1e1f4c43bc1$var$_type3, {
            writable: true,
            value: void 0
        });
        let [calendar, era, year, month, day] = $625ad1e1f4c43bc1$var$shiftArgs(args);
        let timeZone = args.shift();
        let offset = args.shift();
        this.calendar = calendar;
        this.era = era;
        this.year = year;
        this.month = month;
        this.day = day;
        this.timeZone = timeZone;
        this.offset = offset;
        this.hour = args.shift() || 0;
        this.minute = args.shift() || 0;
        this.second = args.shift() || 0;
        this.millisecond = args.shift() || 0;
        (0, $5c0571aa5b6fb5da$exports.constrain)(this);
    }
}


//# sourceMappingURL=CalendarDate.main.js.map
