import { isValidDate } from './dateutil';
import IterResult from './iterresult';
import CallbackIterResult from './callbackiterresult';
import { fromText, parseText, toText, isFullyConvertible } from './nlp/index';
import { Frequency, } from './types';
import { parseOptions, initializeOptions } from './parseoptions';
import { parseString } from './parsestring';
import { optionsToString } from './optionstostring';
import { Cache } from './cache';
import { Weekday } from './weekday';
import { iter } from './iter/index';
// =============================================================================
// RRule
// =============================================================================
export var Days = {
    MO: new Weekday(0),
    TU: new Weekday(1),
    WE: new Weekday(2),
    TH: new Weekday(3),
    FR: new Weekday(4),
    SA: new Weekday(5),
    SU: new Weekday(6),
};
export var DEFAULT_OPTIONS = {
    freq: Frequency.YEARLY,
    dtstart: null,
    interval: 1,
    wkst: Days.MO,
    count: null,
    until: null,
    tzid: null,
    bysetpos: null,
    bymonth: null,
    bymonthday: null,
    bynmonthday: null,
    byyearday: null,
    byweekno: null,
    byweekday: null,
    bynweekday: null,
    byhour: null,
    byminute: null,
    bysecond: null,
    byeaster: null,
};
export var defaultKeys = Object.keys(DEFAULT_OPTIONS);
/**
 *
 * @param {Options?} options - see <http://labix.org/python-dateutil/#head-cf004ee9a75592797e076752b2a889c10f445418>
 * - The only required option is `freq`, one of RRule.YEARLY, RRule.MONTHLY, ...
 * @constructor
 */
var RRule = /** @class */ (function () {
    function RRule(options, noCache) {
        if (options === void 0) { options = {}; }
        if (noCache === void 0) { noCache = false; }
        // RFC string
        this._cache = noCache ? null : new Cache();
        // used by toString()
        this.origOptions = initializeOptions(options);
        var parsedOptions = parseOptions(options).parsedOptions;
        this.options = parsedOptions;
    }
    RRule.parseText = function (text, language) {
        return parseText(text, language);
    };
    RRule.fromText = function (text, language) {
        return fromText(text, language);
    };
    RRule.fromString = function (str) {
        return new RRule(RRule.parseString(str) || undefined);
    };
    RRule.prototype._iter = function (iterResult) {
        return iter(iterResult, this.options);
    };
    RRule.prototype._cacheGet = function (what, args) {
        if (!this._cache)
            return false;
        return this._cache._cacheGet(what, args);
    };
    RRule.prototype._cacheAdd = function (what, value, args) {
        if (!this._cache)
            return;
        return this._cache._cacheAdd(what, value, args);
    };
    /**
     * @param {Function} iterator - optional function that will be called
     * on each date that is added. It can return false
     * to stop the iteration.
     * @return Array containing all recurrences.
     */
    RRule.prototype.all = function (iterator) {
        if (iterator) {
            return this._iter(new CallbackIterResult('all', {}, iterator));
        }
        var result = this._cacheGet('all');
        if (result === false) {
            result = this._iter(new IterResult('all', {}));
            this._cacheAdd('all', result);
        }
        return result;
    };
    /**
     * Returns all the occurrences of the rrule between after and before.
     * The inc keyword defines what happens if after and/or before are
     * themselves occurrences. With inc == True, they will be included in the
     * list, if they are found in the recurrence set.
     *
     * @return Array
     */
    RRule.prototype.between = function (after, before, inc, iterator) {
        if (inc === void 0) { inc = false; }
        if (!isValidDate(after) || !isValidDate(before)) {
            throw new Error('Invalid date passed in to RRule.between');
        }
        var args = {
            before: before,
            after: after,
            inc: inc,
        };
        if (iterator) {
            return this._iter(new CallbackIterResult('between', args, iterator));
        }
        var result = this._cacheGet('between', args);
        if (result === false) {
            result = this._iter(new IterResult('between', args));
            this._cacheAdd('between', result, args);
        }
        return result;
    };
    /**
     * Returns the last recurrence before the given datetime instance.
     * The inc keyword defines what happens if dt is an occurrence.
     * With inc == True, if dt itself is an occurrence, it will be returned.
     *
     * @return Date or null
     */
    RRule.prototype.before = function (dt, inc) {
        if (inc === void 0) { inc = false; }
        if (!isValidDate(dt)) {
            throw new Error('Invalid date passed in to RRule.before');
        }
        var args = { dt: dt, inc: inc };
        var result = this._cacheGet('before', args);
        if (result === false) {
            result = this._iter(new IterResult('before', args));
            this._cacheAdd('before', result, args);
        }
        return result;
    };
    /**
     * Returns the first recurrence after the given datetime instance.
     * The inc keyword defines what happens if dt is an occurrence.
     * With inc == True, if dt itself is an occurrence, it will be returned.
     *
     * @return Date or null
     */
    RRule.prototype.after = function (dt, inc) {
        if (inc === void 0) { inc = false; }
        if (!isValidDate(dt)) {
            throw new Error('Invalid date passed in to RRule.after');
        }
        var args = { dt: dt, inc: inc };
        var result = this._cacheGet('after', args);
        if (result === false) {
            result = this._iter(new IterResult('after', args));
            this._cacheAdd('after', result, args);
        }
        return result;
    };
    /**
     * Returns the number of recurrences in this set. It will have go trough
     * the whole recurrence, if this hasn't been done before.
     */
    RRule.prototype.count = function () {
        return this.all().length;
    };
    /**
     * Converts the rrule into its string representation
     *
     * @see <http://www.ietf.org/rfc/rfc2445.txt>
     * @return String
     */
    RRule.prototype.toString = function () {
        return optionsToString(this.origOptions);
    };
    /**
     * Will convert all rules described in nlp:ToText
     * to text.
     */
    RRule.prototype.toText = function (gettext, language, dateFormatter) {
        return toText(this, gettext, language, dateFormatter);
    };
    RRule.prototype.isFullyConvertibleToText = function () {
        return isFullyConvertible(this);
    };
    /**
     * @return a RRule instance with the same freq and options
     * as this one (cache is not cloned)
     */
    RRule.prototype.clone = function () {
        return new RRule(this.origOptions);
    };
    // RRule class 'constants'
    RRule.FREQUENCIES = [
        'YEARLY',
        'MONTHLY',
        'WEEKLY',
        'DAILY',
        'HOURLY',
        'MINUTELY',
        'SECONDLY',
    ];
    RRule.YEARLY = Frequency.YEARLY;
    RRule.MONTHLY = Frequency.MONTHLY;
    RRule.WEEKLY = Frequency.WEEKLY;
    RRule.DAILY = Frequency.DAILY;
    RRule.HOURLY = Frequency.HOURLY;
    RRule.MINUTELY = Frequency.MINUTELY;
    RRule.SECONDLY = Frequency.SECONDLY;
    RRule.MO = Days.MO;
    RRule.TU = Days.TU;
    RRule.WE = Days.WE;
    RRule.TH = Days.TH;
    RRule.FR = Days.FR;
    RRule.SA = Days.SA;
    RRule.SU = Days.SU;
    RRule.parseString = parseString;
    RRule.optionsToString = optionsToString;
    return RRule;
}());
export { RRule };
//# sourceMappingURL=rrule.js.map