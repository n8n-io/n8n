import { __extends } from "tslib";
import { Frequency } from './types';
import { pymod, divmod, empty, includes } from './helpers';
import { getWeekday, MAXYEAR, monthRange } from './dateutil';
var Time = /** @class */ (function () {
    function Time(hour, minute, second, millisecond) {
        this.hour = hour;
        this.minute = minute;
        this.second = second;
        this.millisecond = millisecond || 0;
    }
    Time.prototype.getHours = function () {
        return this.hour;
    };
    Time.prototype.getMinutes = function () {
        return this.minute;
    };
    Time.prototype.getSeconds = function () {
        return this.second;
    };
    Time.prototype.getMilliseconds = function () {
        return this.millisecond;
    };
    Time.prototype.getTime = function () {
        return ((this.hour * 60 * 60 + this.minute * 60 + this.second) * 1000 +
            this.millisecond);
    };
    return Time;
}());
export { Time };
var DateTime = /** @class */ (function (_super) {
    __extends(DateTime, _super);
    function DateTime(year, month, day, hour, minute, second, millisecond) {
        var _this = _super.call(this, hour, minute, second, millisecond) || this;
        _this.year = year;
        _this.month = month;
        _this.day = day;
        return _this;
    }
    DateTime.fromDate = function (date) {
        return new this(date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate(), date.getUTCHours(), date.getUTCMinutes(), date.getUTCSeconds(), date.valueOf() % 1000);
    };
    DateTime.prototype.getWeekday = function () {
        return getWeekday(new Date(this.getTime()));
    };
    DateTime.prototype.getTime = function () {
        return new Date(Date.UTC(this.year, this.month - 1, this.day, this.hour, this.minute, this.second, this.millisecond)).getTime();
    };
    DateTime.prototype.getDay = function () {
        return this.day;
    };
    DateTime.prototype.getMonth = function () {
        return this.month;
    };
    DateTime.prototype.getYear = function () {
        return this.year;
    };
    DateTime.prototype.addYears = function (years) {
        this.year += years;
    };
    DateTime.prototype.addMonths = function (months) {
        this.month += months;
        if (this.month > 12) {
            var yearDiv = Math.floor(this.month / 12);
            var monthMod = pymod(this.month, 12);
            this.month = monthMod;
            this.year += yearDiv;
            if (this.month === 0) {
                this.month = 12;
                --this.year;
            }
        }
    };
    DateTime.prototype.addWeekly = function (days, wkst) {
        if (wkst > this.getWeekday()) {
            this.day += -(this.getWeekday() + 1 + (6 - wkst)) + days * 7;
        }
        else {
            this.day += -(this.getWeekday() - wkst) + days * 7;
        }
        this.fixDay();
    };
    DateTime.prototype.addDaily = function (days) {
        this.day += days;
        this.fixDay();
    };
    DateTime.prototype.addHours = function (hours, filtered, byhour) {
        if (filtered) {
            // Jump to one iteration before next day
            this.hour += Math.floor((23 - this.hour) / hours) * hours;
        }
        for (;;) {
            this.hour += hours;
            var _a = divmod(this.hour, 24), dayDiv = _a.div, hourMod = _a.mod;
            if (dayDiv) {
                this.hour = hourMod;
                this.addDaily(dayDiv);
            }
            if (empty(byhour) || includes(byhour, this.hour))
                break;
        }
    };
    DateTime.prototype.addMinutes = function (minutes, filtered, byhour, byminute) {
        if (filtered) {
            // Jump to one iteration before next day
            this.minute +=
                Math.floor((1439 - (this.hour * 60 + this.minute)) / minutes) * minutes;
        }
        for (;;) {
            this.minute += minutes;
            var _a = divmod(this.minute, 60), hourDiv = _a.div, minuteMod = _a.mod;
            if (hourDiv) {
                this.minute = minuteMod;
                this.addHours(hourDiv, false, byhour);
            }
            if ((empty(byhour) || includes(byhour, this.hour)) &&
                (empty(byminute) || includes(byminute, this.minute))) {
                break;
            }
        }
    };
    DateTime.prototype.addSeconds = function (seconds, filtered, byhour, byminute, bysecond) {
        if (filtered) {
            // Jump to one iteration before next day
            this.second +=
                Math.floor((86399 - (this.hour * 3600 + this.minute * 60 + this.second)) /
                    seconds) * seconds;
        }
        for (;;) {
            this.second += seconds;
            var _a = divmod(this.second, 60), minuteDiv = _a.div, secondMod = _a.mod;
            if (minuteDiv) {
                this.second = secondMod;
                this.addMinutes(minuteDiv, false, byhour, byminute);
            }
            if ((empty(byhour) || includes(byhour, this.hour)) &&
                (empty(byminute) || includes(byminute, this.minute)) &&
                (empty(bysecond) || includes(bysecond, this.second))) {
                break;
            }
        }
    };
    DateTime.prototype.fixDay = function () {
        if (this.day <= 28) {
            return;
        }
        var daysinmonth = monthRange(this.year, this.month - 1)[1];
        if (this.day <= daysinmonth) {
            return;
        }
        while (this.day > daysinmonth) {
            this.day -= daysinmonth;
            ++this.month;
            if (this.month === 13) {
                this.month = 1;
                ++this.year;
                if (this.year > MAXYEAR) {
                    return;
                }
            }
            daysinmonth = monthRange(this.year, this.month - 1)[1];
        }
    };
    DateTime.prototype.add = function (options, filtered) {
        var freq = options.freq, interval = options.interval, wkst = options.wkst, byhour = options.byhour, byminute = options.byminute, bysecond = options.bysecond;
        switch (freq) {
            case Frequency.YEARLY:
                return this.addYears(interval);
            case Frequency.MONTHLY:
                return this.addMonths(interval);
            case Frequency.WEEKLY:
                return this.addWeekly(interval, wkst);
            case Frequency.DAILY:
                return this.addDaily(interval);
            case Frequency.HOURLY:
                return this.addHours(interval, filtered, byhour);
            case Frequency.MINUTELY:
                return this.addMinutes(interval, filtered, byhour, byminute);
            case Frequency.SECONDLY:
                return this.addSeconds(interval, filtered, byhour, byminute, bysecond);
        }
    };
    return DateTime;
}(Time));
export { DateTime };
//# sourceMappingURL=datetime.js.map