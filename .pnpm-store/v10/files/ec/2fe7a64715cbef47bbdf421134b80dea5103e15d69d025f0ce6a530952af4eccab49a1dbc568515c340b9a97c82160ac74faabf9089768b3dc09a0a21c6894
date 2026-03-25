import {add as $735220c2d4774dd3$export$e16d8520af44a096, addTime as $735220c2d4774dd3$export$7ed87b6bc2506470, addZoned as $735220c2d4774dd3$export$96b1d28349274637, constrain as $735220c2d4774dd3$export$c4e2ecac49351ef2, constrainTime as $735220c2d4774dd3$export$7555de1e070510cb, cycleDate as $735220c2d4774dd3$export$d52ced6badfb9a4c, cycleTime as $735220c2d4774dd3$export$dd02b3e0007dfe28, cycleZoned as $735220c2d4774dd3$export$9a297d111fc86b79, set as $735220c2d4774dd3$export$adaa4cf7ef1b65be, setTime as $735220c2d4774dd3$export$e5d5e1c1822b6e56, setZoned as $735220c2d4774dd3$export$31b5430eb18be4f8, subtract as $735220c2d4774dd3$export$4e2d2ead65e5f7e3, subtractTime as $735220c2d4774dd3$export$fe34d3a381cd7501, subtractZoned as $735220c2d4774dd3$export$6814caac34ca03c7} from "./manipulation.mjs";
import {compareDate as $14e0f24ef4ac5c92$export$68781ddf31c0090f, compareTime as $14e0f24ef4ac5c92$export$c19a80a9721b80f6} from "./queries.mjs";
import {dateTimeToString as $fae977aafc393c5c$export$4223de14708adc63, dateToString as $fae977aafc393c5c$export$60dfd74aa96791bd, timeToString as $fae977aafc393c5c$export$f59dee82248f5ad4, zonedDateTimeToString as $fae977aafc393c5c$export$bf79f1ebf4b18792} from "./string.mjs";
import {GregorianCalendar as $3b62074eb05584b2$export$80ee6245ec4f29ec} from "./GregorianCalendar.mjs";
import {toCalendarDateTime as $11d87f3f76e88657$export$b21e0b124e224484, toDate as $11d87f3f76e88657$export$e67a095c620b86fe, toZoned as $11d87f3f76e88657$export$84c95a83c799e074, zonedToDate as $11d87f3f76e88657$export$83aac07b4c37b25} from "./conversion.mjs";
import {_ as $aksy1$_} from "@swc/helpers/_/_class_private_field_init";

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





function $35ea8db9cb2ccb90$var$shiftArgs(args) {
    let calendar = typeof args[0] === 'object' ? args.shift() : new (0, $3b62074eb05584b2$export$80ee6245ec4f29ec)();
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
$35ea8db9cb2ccb90$var$_type = /*#__PURE__*/ new WeakMap();
class $35ea8db9cb2ccb90$export$99faa760c7908e4f {
    /** Returns a copy of this date. */ copy() {
        if (this.era) return new $35ea8db9cb2ccb90$export$99faa760c7908e4f(this.calendar, this.era, this.year, this.month, this.day);
        else return new $35ea8db9cb2ccb90$export$99faa760c7908e4f(this.calendar, this.year, this.month, this.day);
    }
    /** Returns a new `CalendarDate` with the given duration added to it. */ add(duration) {
        return (0, $735220c2d4774dd3$export$e16d8520af44a096)(this, duration);
    }
    /** Returns a new `CalendarDate` with the given duration subtracted from it. */ subtract(duration) {
        return (0, $735220c2d4774dd3$export$4e2d2ead65e5f7e3)(this, duration);
    }
    /** Returns a new `CalendarDate` with the given fields set to the provided values. Other fields will be constrained accordingly. */ set(fields) {
        return (0, $735220c2d4774dd3$export$adaa4cf7ef1b65be)(this, fields);
    }
    /**
   * Returns a new `CalendarDate` with the given field adjusted by a specified amount.
   * When the resulting value reaches the limits of the field, it wraps around.
   */ cycle(field, amount, options) {
        return (0, $735220c2d4774dd3$export$d52ced6badfb9a4c)(this, field, amount, options);
    }
    /** Converts the date to a native JavaScript Date object, with the time set to midnight in the given time zone. */ toDate(timeZone) {
        return (0, $11d87f3f76e88657$export$e67a095c620b86fe)(this, timeZone);
    }
    /** Converts the date to an ISO 8601 formatted string. */ toString() {
        return (0, $fae977aafc393c5c$export$60dfd74aa96791bd)(this);
    }
    /** Compares this date with another. A negative result indicates that this date is before the given one, and a positive date indicates that it is after. */ compare(b) {
        return (0, $14e0f24ef4ac5c92$export$68781ddf31c0090f)(this, b);
    }
    constructor(...args){
        (0, $aksy1$_)(this, $35ea8db9cb2ccb90$var$_type, {
            writable: true,
            value: void 0
        });
        let [calendar, era, year, month, day] = $35ea8db9cb2ccb90$var$shiftArgs(args);
        this.calendar = calendar;
        this.era = era;
        this.year = year;
        this.month = month;
        this.day = day;
        (0, $735220c2d4774dd3$export$c4e2ecac49351ef2)(this);
    }
}
var // This prevents TypeScript from allowing other types with the same fields to match.
// @ts-ignore
$35ea8db9cb2ccb90$var$_type1 = /*#__PURE__*/ new WeakMap();
class $35ea8db9cb2ccb90$export$680ea196effce5f {
    /** Returns a copy of this time. */ copy() {
        return new $35ea8db9cb2ccb90$export$680ea196effce5f(this.hour, this.minute, this.second, this.millisecond);
    }
    /** Returns a new `Time` with the given duration added to it. */ add(duration) {
        return (0, $735220c2d4774dd3$export$7ed87b6bc2506470)(this, duration);
    }
    /** Returns a new `Time` with the given duration subtracted from it. */ subtract(duration) {
        return (0, $735220c2d4774dd3$export$fe34d3a381cd7501)(this, duration);
    }
    /** Returns a new `Time` with the given fields set to the provided values. Other fields will be constrained accordingly. */ set(fields) {
        return (0, $735220c2d4774dd3$export$e5d5e1c1822b6e56)(this, fields);
    }
    /**
   * Returns a new `Time` with the given field adjusted by a specified amount.
   * When the resulting value reaches the limits of the field, it wraps around.
   */ cycle(field, amount, options) {
        return (0, $735220c2d4774dd3$export$dd02b3e0007dfe28)(this, field, amount, options);
    }
    /** Converts the time to an ISO 8601 formatted string. */ toString() {
        return (0, $fae977aafc393c5c$export$f59dee82248f5ad4)(this);
    }
    /** Compares this time with another. A negative result indicates that this time is before the given one, and a positive time indicates that it is after. */ compare(b) {
        return (0, $14e0f24ef4ac5c92$export$c19a80a9721b80f6)(this, b);
    }
    constructor(hour = 0, minute = 0, second = 0, millisecond = 0){
        (0, $aksy1$_)(this, $35ea8db9cb2ccb90$var$_type1, {
            writable: true,
            value: void 0
        });
        this.hour = hour;
        this.minute = minute;
        this.second = second;
        this.millisecond = millisecond;
        (0, $735220c2d4774dd3$export$7555de1e070510cb)(this);
    }
}
var // This prevents TypeScript from allowing other types with the same fields to match.
// @ts-ignore
$35ea8db9cb2ccb90$var$_type2 = /*#__PURE__*/ new WeakMap();
class $35ea8db9cb2ccb90$export$ca871e8dbb80966f {
    /** Returns a copy of this date. */ copy() {
        if (this.era) return new $35ea8db9cb2ccb90$export$ca871e8dbb80966f(this.calendar, this.era, this.year, this.month, this.day, this.hour, this.minute, this.second, this.millisecond);
        else return new $35ea8db9cb2ccb90$export$ca871e8dbb80966f(this.calendar, this.year, this.month, this.day, this.hour, this.minute, this.second, this.millisecond);
    }
    /** Returns a new `CalendarDateTime` with the given duration added to it. */ add(duration) {
        return (0, $735220c2d4774dd3$export$e16d8520af44a096)(this, duration);
    }
    /** Returns a new `CalendarDateTime` with the given duration subtracted from it. */ subtract(duration) {
        return (0, $735220c2d4774dd3$export$4e2d2ead65e5f7e3)(this, duration);
    }
    /** Returns a new `CalendarDateTime` with the given fields set to the provided values. Other fields will be constrained accordingly. */ set(fields) {
        return (0, $735220c2d4774dd3$export$adaa4cf7ef1b65be)((0, $735220c2d4774dd3$export$e5d5e1c1822b6e56)(this, fields), fields);
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
                return (0, $735220c2d4774dd3$export$d52ced6badfb9a4c)(this, field, amount, options);
            default:
                return (0, $735220c2d4774dd3$export$dd02b3e0007dfe28)(this, field, amount, options);
        }
    }
    /** Converts the date to a native JavaScript Date object in the given time zone. */ toDate(timeZone, disambiguation) {
        return (0, $11d87f3f76e88657$export$e67a095c620b86fe)(this, timeZone, disambiguation);
    }
    /** Converts the date to an ISO 8601 formatted string. */ toString() {
        return (0, $fae977aafc393c5c$export$4223de14708adc63)(this);
    }
    /** Compares this date with another. A negative result indicates that this date is before the given one, and a positive date indicates that it is after. */ compare(b) {
        let res = (0, $14e0f24ef4ac5c92$export$68781ddf31c0090f)(this, b);
        if (res === 0) return (0, $14e0f24ef4ac5c92$export$c19a80a9721b80f6)(this, (0, $11d87f3f76e88657$export$b21e0b124e224484)(b));
        return res;
    }
    constructor(...args){
        (0, $aksy1$_)(this, $35ea8db9cb2ccb90$var$_type2, {
            writable: true,
            value: void 0
        });
        let [calendar, era, year, month, day] = $35ea8db9cb2ccb90$var$shiftArgs(args);
        this.calendar = calendar;
        this.era = era;
        this.year = year;
        this.month = month;
        this.day = day;
        this.hour = args.shift() || 0;
        this.minute = args.shift() || 0;
        this.second = args.shift() || 0;
        this.millisecond = args.shift() || 0;
        (0, $735220c2d4774dd3$export$c4e2ecac49351ef2)(this);
    }
}
var // This prevents TypeScript from allowing other types with the same fields to match.
// @ts-ignore
$35ea8db9cb2ccb90$var$_type3 = /*#__PURE__*/ new WeakMap();
class $35ea8db9cb2ccb90$export$d3b7288e7994edea {
    /** Returns a copy of this date. */ copy() {
        if (this.era) return new $35ea8db9cb2ccb90$export$d3b7288e7994edea(this.calendar, this.era, this.year, this.month, this.day, this.timeZone, this.offset, this.hour, this.minute, this.second, this.millisecond);
        else return new $35ea8db9cb2ccb90$export$d3b7288e7994edea(this.calendar, this.year, this.month, this.day, this.timeZone, this.offset, this.hour, this.minute, this.second, this.millisecond);
    }
    /** Returns a new `ZonedDateTime` with the given duration added to it. */ add(duration) {
        return (0, $735220c2d4774dd3$export$96b1d28349274637)(this, duration);
    }
    /** Returns a new `ZonedDateTime` with the given duration subtracted from it. */ subtract(duration) {
        return (0, $735220c2d4774dd3$export$6814caac34ca03c7)(this, duration);
    }
    /** Returns a new `ZonedDateTime` with the given fields set to the provided values. Other fields will be constrained accordingly. */ set(fields, disambiguation) {
        return (0, $735220c2d4774dd3$export$31b5430eb18be4f8)(this, fields, disambiguation);
    }
    /**
   * Returns a new `ZonedDateTime` with the given field adjusted by a specified amount.
   * When the resulting value reaches the limits of the field, it wraps around.
   */ cycle(field, amount, options) {
        return (0, $735220c2d4774dd3$export$9a297d111fc86b79)(this, field, amount, options);
    }
    /** Converts the date to a native JavaScript Date object. */ toDate() {
        return (0, $11d87f3f76e88657$export$83aac07b4c37b25)(this);
    }
    /** Converts the date to an ISO 8601 formatted string, including the UTC offset and time zone identifier. */ toString() {
        return (0, $fae977aafc393c5c$export$bf79f1ebf4b18792)(this);
    }
    /** Converts the date to an ISO 8601 formatted string in UTC. */ toAbsoluteString() {
        return this.toDate().toISOString();
    }
    /** Compares this date with another. A negative result indicates that this date is before the given one, and a positive date indicates that it is after. */ compare(b) {
        // TODO: Is this a bad idea??
        return this.toDate().getTime() - (0, $11d87f3f76e88657$export$84c95a83c799e074)(b, this.timeZone).toDate().getTime();
    }
    constructor(...args){
        (0, $aksy1$_)(this, $35ea8db9cb2ccb90$var$_type3, {
            writable: true,
            value: void 0
        });
        let [calendar, era, year, month, day] = $35ea8db9cb2ccb90$var$shiftArgs(args);
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
        (0, $735220c2d4774dd3$export$c4e2ecac49351ef2)(this);
    }
}


export {$35ea8db9cb2ccb90$export$99faa760c7908e4f as CalendarDate, $35ea8db9cb2ccb90$export$680ea196effce5f as Time, $35ea8db9cb2ccb90$export$ca871e8dbb80966f as CalendarDateTime, $35ea8db9cb2ccb90$export$d3b7288e7994edea as ZonedDateTime};
//# sourceMappingURL=CalendarDate.module.js.map
