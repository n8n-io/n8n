"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CronTime = void 0;
const luxon_1 = require("luxon");
const constants_1 = require("./constants");
const errors_1 = require("./errors");
class CronTime {
    constructor(source, timeZone, utcOffset) {
        this.realDate = false;
        this.second = {};
        this.minute = {};
        this.hour = {};
        this.dayOfMonth = {};
        this.month = {};
        this.dayOfWeek = {};
        if (timeZone != null && utcOffset != null) {
            throw new errors_1.ExclusiveParametersError('timeZone', 'utcOffset');
        }
        if (timeZone) {
            const dt = luxon_1.DateTime.fromObject({}, { zone: timeZone });
            if (!dt.isValid) {
                throw new errors_1.CronError('Invalid timezone.');
            }
            this.timeZone = timeZone;
        }
        if (utcOffset != null) {
            this.utcOffset = utcOffset;
        }
        if (timeZone == null && utcOffset == null) {
            const systemTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
            this.timeZone = systemTimezone;
        }
        if (source instanceof Date || source instanceof luxon_1.DateTime) {
            this.source =
                source instanceof Date ? luxon_1.DateTime.fromJSDate(source) : source;
            this.realDate = true;
        }
        else {
            this.source = source;
            this._parse(this.source);
        }
    }
    static validateCronExpression(cronExpression) {
        try {
            new CronTime(cronExpression);
            return {
                valid: true
            };
        }
        catch (error) {
            return {
                valid: false,
                error
            };
        }
    }
    _getWeekDay(date) {
        return date.weekday === 7 ? 0 : date.weekday;
    }
    sendAt(i) {
        let date = this.realDate && this.source instanceof luxon_1.DateTime
            ? this.source
            : luxon_1.DateTime.utc();
        if (this.timeZone) {
            date = date.setZone(this.timeZone);
        }
        if (this.utcOffset !== undefined) {
            const sign = this.utcOffset < 0 ? '-' : '+';
            const offsetHours = Math.trunc(this.utcOffset / 60);
            const offsetHoursStr = String(Math.abs(offsetHours)).padStart(2, '0');
            const offsetMins = Math.abs(this.utcOffset - offsetHours * 60);
            const offsetMinsStr = String(offsetMins).padStart(2, '0');
            const utcZone = `UTC${sign}${offsetHoursStr}:${offsetMinsStr}`;
            date = date.setZone(utcZone);
            if (!date.isValid) {
                throw new errors_1.CronError('ERROR: You specified an invalid UTC offset.');
            }
        }
        if (this.realDate) {
            if (luxon_1.DateTime.local() > date) {
                throw new errors_1.CronError('WARNING: Date in past. Will never be fired.');
            }
            return date;
        }
        if (i === undefined || isNaN(i) || i < 0) {
            const nextDate = this.getNextDateFrom(date);
            return nextDate;
        }
        else {
            const dates = [];
            for (; i > 0; i--) {
                date = this.getNextDateFrom(date);
                dates.push(date);
            }
            return dates;
        }
    }
    getTimeout() {
        return this.sendAt().toMillis() - luxon_1.DateTime.local().toMillis();
    }
    toString() {
        return this.toJSON().join(' ');
    }
    toJSON() {
        return constants_1.TIME_UNITS.map(unit => {
            return this._wcOrAll(unit);
        });
    }
    getNextDateFrom(start, timeZone) {
        var _a, _b;
        if (start instanceof Date) {
            start = luxon_1.DateTime.fromJSDate(start);
        }
        if (timeZone) {
            start = start.setZone(timeZone);
        }
        else {
            timeZone = (_a = start.zone.zoneName) !== null && _a !== void 0 ? _a : start.zone.fixed;
        }
        let date = luxon_1.DateTime.fromFormat(`${start.year}-${start.month}-${start.day} ${start.hour}:${start.minute}:${start.second}`, 'yyyy-M-d H:m:s', {
            zone: 'UTC'
        });
        const firstDate = date.toMillis();
        if (!this.realDate) {
            if (date.millisecond > 0) {
                date = date.set({ millisecond: 0, second: date.second + 1 });
            }
        }
        if (!date.isValid) {
            throw new errors_1.CronError('ERROR: You specified an invalid date.');
        }
        const maxMatch = luxon_1.DateTime.now().plus({ years: 8 });
        while (true) {
            if (date > maxMatch) {
                throw new errors_1.CronError(`Something went wrong. No execution date was found in the next 8 years.
							Please provide the following string if you would like to help debug:
							Time Zone: ${(_b = timeZone === null || timeZone === void 0 ? void 0 : timeZone.toString()) !== null && _b !== void 0 ? _b : '""'} - Cron String: ${this.source.toString()} - UTC offset: ${date.offset} - current Date: ${luxon_1.DateTime.local().toString()}`);
            }
            if (!(date.month in this.month) &&
                Object.keys(this.month).length !== 12) {
                date = date.plus({ month: 1 });
                date = date.set({ day: 1, hour: 0, minute: 0, second: 0 });
                continue;
            }
            if ((!(date.day in this.dayOfMonth) &&
                Object.keys(this.dayOfMonth).length !== 31 &&
                !(this._getWeekDay(date) in this.dayOfWeek &&
                    Object.keys(this.dayOfWeek).length !== 7)) ||
                (!(this._getWeekDay(date) in this.dayOfWeek) &&
                    Object.keys(this.dayOfWeek).length !== 7 &&
                    !(date.day in this.dayOfMonth &&
                        Object.keys(this.dayOfMonth).length !== 31))) {
                date = date.plus({ days: 1 });
                date = date.set({ hour: 0, minute: 0, second: 0 });
                continue;
            }
            if (!(date.hour in this.hour) && Object.keys(this.hour).length !== 24) {
                date = date.plus({ hour: 1 });
                date = date.set({ minute: 0, second: 0 });
                continue;
            }
            if (!(date.minute in this.minute) &&
                Object.keys(this.minute).length !== 60) {
                date = date.plus({ minute: 1 });
                date = date.set({ second: 0 });
                continue;
            }
            if (date.toMillis() === firstDate ||
                (!(date.second in this.second) &&
                    Object.keys(this.second).length !== 60)) {
                date = date.plus({ second: 1 });
                continue;
            }
            break;
        }
        const expectedHour = date.hour;
        const expectedMinute = date.minute;
        date = luxon_1.DateTime.fromFormat(`${date.year}-${date.month}-${date.day} ${date.hour}:${date.minute}:${date.second}`, 'yyyy-M-d H:m:s', {
            zone: timeZone
        });
        const nonDSTReferenceDate = luxon_1.DateTime.fromFormat(`${date.year}-1-1 0:0:0`, 'yyyy-M-d H:m:s', { zone: timeZone });
        if ((expectedHour !== date.hour || expectedMinute !== date.minute) &&
            nonDSTReferenceDate.offset !== date.offset) {
            while (date.minus({ minute: 1 }).offset !== nonDSTReferenceDate.offset) {
                date = date.minus({ minute: 1 });
            }
            return date;
        }
        const hourTestDate = date.minus({ hour: 1 });
        const twoHourTestDate = date.minus({ hour: 2 });
        if ((hourTestDate.hour === date.hour ||
            twoHourTestDate.hour === hourTestDate.hour) &&
            hourTestDate > start) {
            date = hourTestDate;
        }
        const halfHourTestDate = date.minus({ minute: 30 });
        if ((halfHourTestDate.minute === date.minute ||
            hourTestDate.minute === halfHourTestDate.minute) &&
            halfHourTestDate > start) {
            date = halfHourTestDate;
        }
        return date;
    }
    _wcOrAll(unit) {
        if (this._hasAll(unit)) {
            return '*';
        }
        const all = [];
        for (const time in this[unit]) {
            all.push(time);
        }
        return all.join(',');
    }
    _hasAll(unit) {
        const constraints = constants_1.CONSTRAINTS[unit];
        const low = constraints[0];
        const high = unit === constants_1.TIME_UNITS_MAP.DAY_OF_WEEK ? constraints[1] - 1 : constraints[1];
        for (let i = low, n = high; i < n; i++) {
            if (!(i in this[unit])) {
                return false;
            }
        }
        return true;
    }
    _parse(source) {
        var _a;
        source = source.toLowerCase();
        if (Object.keys(constants_1.PRESETS).includes(source)) {
            source = constants_1.PRESETS[source];
        }
        source = source.replace(/[a-z]{1,3}/gi, (alias) => {
            if (Object.keys(constants_1.ALIASES).includes(alias)) {
                return constants_1.ALIASES[alias].toString();
            }
            throw new errors_1.CronError(`Unknown alias: ${alias}`);
        });
        const units = source.trim().split(/\s+/);
        if (units.length < constants_1.TIME_UNITS_LEN - 1) {
            throw new errors_1.CronError('Too few fields');
        }
        if (units.length > constants_1.TIME_UNITS_LEN) {
            throw new errors_1.CronError('Too many fields');
        }
        const unitsLen = units.length;
        for (const unit of constants_1.TIME_UNITS) {
            const i = constants_1.TIME_UNITS.indexOf(unit);
            const cur = (_a = units[i - (constants_1.TIME_UNITS_LEN - unitsLen)]) !== null && _a !== void 0 ? _a : constants_1.PARSE_DEFAULTS[unit];
            this._parseField(cur, unit);
        }
    }
    _parseField(value, unit) {
        const typeObj = this[unit];
        let pointer;
        const constraints = constants_1.CONSTRAINTS[unit];
        const low = constraints[0];
        const high = constraints[1];
        const fields = value.split(',');
        fields.forEach(field => {
            const wildcardIndex = field.indexOf('*');
            if (wildcardIndex !== -1 && wildcardIndex !== 0) {
                throw new errors_1.CronError(`Field (${field}) has an invalid wildcard expression`);
            }
        });
        value = value.replace(constants_1.RE_WILDCARDS, `${low}-${high}`);
        const allRanges = value.split(',');
        for (const range of allRanges) {
            const match = [...range.matchAll(constants_1.RE_RANGE)][0];
            if ((match === null || match === void 0 ? void 0 : match[1]) !== undefined) {
                const [, mLower, mUpper, mStep] = match;
                let lower = parseInt(mLower, 10);
                let upper = mUpper !== undefined ? parseInt(mUpper, 10) : undefined;
                const wasStepDefined = mStep !== undefined;
                const step = parseInt(mStep !== null && mStep !== void 0 ? mStep : '1', 10);
                if (step === 0) {
                    throw new errors_1.CronError(`Field (${unit}) has a step of zero`);
                }
                if (upper !== undefined && lower > upper) {
                    throw new errors_1.CronError(`Field (${unit}) has an invalid range`);
                }
                const isOutOfRange = lower < low ||
                    (upper !== undefined && upper > high) ||
                    (upper === undefined && lower > high);
                if (isOutOfRange) {
                    throw new errors_1.CronError(`Field value (${value}) is out of range`);
                }
                lower = Math.min(Math.max(low, ~~Math.abs(lower)), high);
                if (upper !== undefined) {
                    upper = Math.min(high, ~~Math.abs(upper));
                }
                else {
                    upper = wasStepDefined ? high : lower;
                }
                pointer = lower;
                do {
                    typeObj[pointer] = true;
                    pointer += step;
                } while (pointer <= upper);
                if (unit === 'dayOfWeek') {
                    if (!typeObj[0] && !!typeObj[7])
                        typeObj[0] = typeObj[7];
                    delete typeObj[7];
                }
            }
            else {
                throw new errors_1.CronError(`Field (${unit}) cannot be parsed`);
            }
        }
    }
}
exports.CronTime = CronTime;
