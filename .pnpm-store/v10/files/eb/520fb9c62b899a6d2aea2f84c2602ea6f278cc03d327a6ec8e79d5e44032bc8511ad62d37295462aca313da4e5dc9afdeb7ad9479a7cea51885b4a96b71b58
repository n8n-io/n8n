import ENGLISH from './i18n';
import { RRule } from '../rrule';
import { isArray, isNumber, isPresent } from '../helpers';
// =============================================================================
// Helper functions
// =============================================================================
/**
 * Return true if a value is in an array
 */
var contains = function (arr, val) {
    return arr.indexOf(val) !== -1;
};
var defaultGetText = function (id) { return id.toString(); };
var defaultDateFormatter = function (year, month, day) { return "".concat(month, " ").concat(day, ", ").concat(year); };
/**
 *
 * @param {RRule} rrule
 * Optional:
 * @param {Function} gettext function
 * @param {Object} language definition
 * @constructor
 */
var ToText = /** @class */ (function () {
    function ToText(rrule, gettext, language, dateFormatter) {
        if (gettext === void 0) { gettext = defaultGetText; }
        if (language === void 0) { language = ENGLISH; }
        if (dateFormatter === void 0) { dateFormatter = defaultDateFormatter; }
        this.text = [];
        this.language = language || ENGLISH;
        this.gettext = gettext;
        this.dateFormatter = dateFormatter;
        this.rrule = rrule;
        this.options = rrule.options;
        this.origOptions = rrule.origOptions;
        if (this.origOptions.bymonthday) {
            var bymonthday = [].concat(this.options.bymonthday);
            var bynmonthday = [].concat(this.options.bynmonthday);
            bymonthday.sort(function (a, b) { return a - b; });
            bynmonthday.sort(function (a, b) { return b - a; });
            // 1, 2, 3, .., -5, -4, -3, ..
            this.bymonthday = bymonthday.concat(bynmonthday);
            if (!this.bymonthday.length)
                this.bymonthday = null;
        }
        if (isPresent(this.origOptions.byweekday)) {
            var byweekday = !isArray(this.origOptions.byweekday)
                ? [this.origOptions.byweekday]
                : this.origOptions.byweekday;
            var days = String(byweekday);
            this.byweekday = {
                allWeeks: byweekday.filter(function (weekday) {
                    return !weekday.n;
                }),
                someWeeks: byweekday.filter(function (weekday) {
                    return Boolean(weekday.n);
                }),
                isWeekdays: days.indexOf('MO') !== -1 &&
                    days.indexOf('TU') !== -1 &&
                    days.indexOf('WE') !== -1 &&
                    days.indexOf('TH') !== -1 &&
                    days.indexOf('FR') !== -1 &&
                    days.indexOf('SA') === -1 &&
                    days.indexOf('SU') === -1,
                isEveryDay: days.indexOf('MO') !== -1 &&
                    days.indexOf('TU') !== -1 &&
                    days.indexOf('WE') !== -1 &&
                    days.indexOf('TH') !== -1 &&
                    days.indexOf('FR') !== -1 &&
                    days.indexOf('SA') !== -1 &&
                    days.indexOf('SU') !== -1,
            };
            var sortWeekDays = function (a, b) {
                return a.weekday - b.weekday;
            };
            this.byweekday.allWeeks.sort(sortWeekDays);
            this.byweekday.someWeeks.sort(sortWeekDays);
            if (!this.byweekday.allWeeks.length)
                this.byweekday.allWeeks = null;
            if (!this.byweekday.someWeeks.length)
                this.byweekday.someWeeks = null;
        }
        else {
            this.byweekday = null;
        }
    }
    /**
     * Test whether the rrule can be fully converted to text.
     *
     * @param {RRule} rrule
     * @return {Boolean}
     */
    ToText.isFullyConvertible = function (rrule) {
        var canConvert = true;
        if (!(rrule.options.freq in ToText.IMPLEMENTED))
            return false;
        if (rrule.origOptions.until && rrule.origOptions.count)
            return false;
        for (var key in rrule.origOptions) {
            if (contains(['dtstart', 'tzid', 'wkst', 'freq'], key))
                return true;
            if (!contains(ToText.IMPLEMENTED[rrule.options.freq], key))
                return false;
        }
        return canConvert;
    };
    ToText.prototype.isFullyConvertible = function () {
        return ToText.isFullyConvertible(this.rrule);
    };
    /**
     * Perform the conversion. Only some of the frequencies are supported.
     * If some of the rrule's options aren't supported, they'll
     * be omitted from the output an "(~ approximate)" will be appended.
     *
     * @return {*}
     */
    ToText.prototype.toString = function () {
        var gettext = this.gettext;
        if (!(this.options.freq in ToText.IMPLEMENTED)) {
            return gettext('RRule error: Unable to fully convert this rrule to text');
        }
        this.text = [gettext('every')];
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        this[RRule.FREQUENCIES[this.options.freq]]();
        if (this.options.until) {
            this.add(gettext('until'));
            var until = this.options.until;
            this.add(this.dateFormatter(until.getUTCFullYear(), this.language.monthNames[until.getUTCMonth()], until.getUTCDate()));
        }
        else if (this.options.count) {
            this.add(gettext('for'))
                .add(this.options.count.toString())
                .add(this.plural(this.options.count) ? gettext('times') : gettext('time'));
        }
        if (!this.isFullyConvertible())
            this.add(gettext('(~ approximate)'));
        return this.text.join('');
    };
    ToText.prototype.HOURLY = function () {
        var gettext = this.gettext;
        if (this.options.interval !== 1)
            this.add(this.options.interval.toString());
        this.add(this.plural(this.options.interval) ? gettext('hours') : gettext('hour'));
    };
    ToText.prototype.MINUTELY = function () {
        var gettext = this.gettext;
        if (this.options.interval !== 1)
            this.add(this.options.interval.toString());
        this.add(this.plural(this.options.interval)
            ? gettext('minutes')
            : gettext('minute'));
    };
    ToText.prototype.DAILY = function () {
        var gettext = this.gettext;
        if (this.options.interval !== 1)
            this.add(this.options.interval.toString());
        if (this.byweekday && this.byweekday.isWeekdays) {
            this.add(this.plural(this.options.interval)
                ? gettext('weekdays')
                : gettext('weekday'));
        }
        else {
            this.add(this.plural(this.options.interval) ? gettext('days') : gettext('day'));
        }
        if (this.origOptions.bymonth) {
            this.add(gettext('in'));
            this._bymonth();
        }
        if (this.bymonthday) {
            this._bymonthday();
        }
        else if (this.byweekday) {
            this._byweekday();
        }
        else if (this.origOptions.byhour) {
            this._byhour();
        }
    };
    ToText.prototype.WEEKLY = function () {
        var gettext = this.gettext;
        if (this.options.interval !== 1) {
            this.add(this.options.interval.toString()).add(this.plural(this.options.interval) ? gettext('weeks') : gettext('week'));
        }
        if (this.byweekday && this.byweekday.isWeekdays) {
            if (this.options.interval === 1) {
                this.add(this.plural(this.options.interval)
                    ? gettext('weekdays')
                    : gettext('weekday'));
            }
            else {
                this.add(gettext('on')).add(gettext('weekdays'));
            }
        }
        else if (this.byweekday && this.byweekday.isEveryDay) {
            this.add(this.plural(this.options.interval) ? gettext('days') : gettext('day'));
        }
        else {
            if (this.options.interval === 1)
                this.add(gettext('week'));
            if (this.origOptions.bymonth) {
                this.add(gettext('in'));
                this._bymonth();
            }
            if (this.bymonthday) {
                this._bymonthday();
            }
            else if (this.byweekday) {
                this._byweekday();
            }
            if (this.origOptions.byhour) {
                this._byhour();
            }
        }
    };
    ToText.prototype.MONTHLY = function () {
        var gettext = this.gettext;
        if (this.origOptions.bymonth) {
            if (this.options.interval !== 1) {
                this.add(this.options.interval.toString()).add(gettext('months'));
                if (this.plural(this.options.interval))
                    this.add(gettext('in'));
            }
            else {
                // this.add(gettext('MONTH'))
            }
            this._bymonth();
        }
        else {
            if (this.options.interval !== 1) {
                this.add(this.options.interval.toString());
            }
            this.add(this.plural(this.options.interval)
                ? gettext('months')
                : gettext('month'));
        }
        if (this.bymonthday) {
            this._bymonthday();
        }
        else if (this.byweekday && this.byweekday.isWeekdays) {
            this.add(gettext('on')).add(gettext('weekdays'));
        }
        else if (this.byweekday) {
            this._byweekday();
        }
    };
    ToText.prototype.YEARLY = function () {
        var gettext = this.gettext;
        if (this.origOptions.bymonth) {
            if (this.options.interval !== 1) {
                this.add(this.options.interval.toString());
                this.add(gettext('years'));
            }
            else {
                // this.add(gettext('YEAR'))
            }
            this._bymonth();
        }
        else {
            if (this.options.interval !== 1) {
                this.add(this.options.interval.toString());
            }
            this.add(this.plural(this.options.interval) ? gettext('years') : gettext('year'));
        }
        if (this.bymonthday) {
            this._bymonthday();
        }
        else if (this.byweekday) {
            this._byweekday();
        }
        if (this.options.byyearday) {
            this.add(gettext('on the'))
                .add(this.list(this.options.byyearday, this.nth, gettext('and')))
                .add(gettext('day'));
        }
        if (this.options.byweekno) {
            this.add(gettext('in'))
                .add(this.plural(this.options.byweekno.length)
                ? gettext('weeks')
                : gettext('week'))
                .add(this.list(this.options.byweekno, undefined, gettext('and')));
        }
    };
    ToText.prototype._bymonthday = function () {
        var gettext = this.gettext;
        if (this.byweekday && this.byweekday.allWeeks) {
            this.add(gettext('on'))
                .add(this.list(this.byweekday.allWeeks, this.weekdaytext, gettext('or')))
                .add(gettext('the'))
                .add(this.list(this.bymonthday, this.nth, gettext('or')));
        }
        else {
            this.add(gettext('on the')).add(this.list(this.bymonthday, this.nth, gettext('and')));
        }
        // this.add(gettext('DAY'))
    };
    ToText.prototype._byweekday = function () {
        var gettext = this.gettext;
        if (this.byweekday.allWeeks && !this.byweekday.isWeekdays) {
            this.add(gettext('on')).add(this.list(this.byweekday.allWeeks, this.weekdaytext));
        }
        if (this.byweekday.someWeeks) {
            if (this.byweekday.allWeeks)
                this.add(gettext('and'));
            this.add(gettext('on the')).add(this.list(this.byweekday.someWeeks, this.weekdaytext, gettext('and')));
        }
    };
    ToText.prototype._byhour = function () {
        var gettext = this.gettext;
        this.add(gettext('at')).add(this.list(this.origOptions.byhour, undefined, gettext('and')));
    };
    ToText.prototype._bymonth = function () {
        this.add(this.list(this.options.bymonth, this.monthtext, this.gettext('and')));
    };
    ToText.prototype.nth = function (n) {
        n = parseInt(n.toString(), 10);
        var nth;
        var gettext = this.gettext;
        if (n === -1)
            return gettext('last');
        var npos = Math.abs(n);
        switch (npos) {
            case 1:
            case 21:
            case 31:
                nth = npos + gettext('st');
                break;
            case 2:
            case 22:
                nth = npos + gettext('nd');
                break;
            case 3:
            case 23:
                nth = npos + gettext('rd');
                break;
            default:
                nth = npos + gettext('th');
        }
        return n < 0 ? nth + ' ' + gettext('last') : nth;
    };
    ToText.prototype.monthtext = function (m) {
        return this.language.monthNames[m - 1];
    };
    ToText.prototype.weekdaytext = function (wday) {
        var weekday = isNumber(wday) ? (wday + 1) % 7 : wday.getJsWeekday();
        return ((wday.n ? this.nth(wday.n) + ' ' : '') +
            this.language.dayNames[weekday]);
    };
    ToText.prototype.plural = function (n) {
        return n % 100 !== 1;
    };
    ToText.prototype.add = function (s) {
        this.text.push(' ');
        this.text.push(s);
        return this;
    };
    ToText.prototype.list = function (arr, callback, finalDelim, delim) {
        var _this = this;
        if (delim === void 0) { delim = ','; }
        if (!isArray(arr)) {
            arr = [arr];
        }
        var delimJoin = function (array, delimiter, finalDelimiter) {
            var list = '';
            for (var i = 0; i < array.length; i++) {
                if (i !== 0) {
                    if (i === array.length - 1) {
                        list += ' ' + finalDelimiter + ' ';
                    }
                    else {
                        list += delimiter + ' ';
                    }
                }
                list += array[i];
            }
            return list;
        };
        callback =
            callback ||
                function (o) {
                    return o.toString();
                };
        var realCallback = function (arg) {
            return callback && callback.call(_this, arg);
        };
        if (finalDelim) {
            return delimJoin(arr.map(realCallback), delim, finalDelim);
        }
        else {
            return arr.map(realCallback).join(delim + ' ');
        }
    };
    return ToText;
}());
export default ToText;
//# sourceMappingURL=totext.js.map