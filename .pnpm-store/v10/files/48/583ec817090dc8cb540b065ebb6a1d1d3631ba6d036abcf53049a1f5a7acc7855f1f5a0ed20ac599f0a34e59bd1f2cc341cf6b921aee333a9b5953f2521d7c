import { __extends } from "tslib";
import { RRule } from './rrule';
import { sort, timeToUntilString } from './dateutil';
import { includes } from './helpers';
import { iterSet } from './iterset';
import { rrulestr } from './rrulestr';
import { optionsToString } from './optionstostring';
function createGetterSetter(fieldName) {
    var _this = this;
    return function (field) {
        if (field !== undefined) {
            _this["_".concat(fieldName)] = field;
        }
        if (_this["_".concat(fieldName)] !== undefined) {
            return _this["_".concat(fieldName)];
        }
        for (var i = 0; i < _this._rrule.length; i++) {
            var field_1 = _this._rrule[i].origOptions[fieldName];
            if (field_1) {
                return field_1;
            }
        }
    };
}
var RRuleSet = /** @class */ (function (_super) {
    __extends(RRuleSet, _super);
    /**
     *
     * @param {Boolean?} noCache
     * The same stratagy as RRule on cache, default to false
     * @constructor
     */
    function RRuleSet(noCache) {
        if (noCache === void 0) { noCache = false; }
        var _this = _super.call(this, {}, noCache) || this;
        _this.dtstart = createGetterSetter.apply(_this, ['dtstart']);
        _this.tzid = createGetterSetter.apply(_this, ['tzid']);
        _this._rrule = [];
        _this._rdate = [];
        _this._exrule = [];
        _this._exdate = [];
        return _this;
    }
    RRuleSet.prototype._iter = function (iterResult) {
        return iterSet(iterResult, this._rrule, this._exrule, this._rdate, this._exdate, this.tzid());
    };
    /**
     * Adds an RRule to the set
     *
     * @param {RRule}
     */
    RRuleSet.prototype.rrule = function (rrule) {
        _addRule(rrule, this._rrule);
    };
    /**
     * Adds an EXRULE to the set
     *
     * @param {RRule}
     */
    RRuleSet.prototype.exrule = function (rrule) {
        _addRule(rrule, this._exrule);
    };
    /**
     * Adds an RDate to the set
     *
     * @param {Date}
     */
    RRuleSet.prototype.rdate = function (date) {
        _addDate(date, this._rdate);
    };
    /**
     * Adds an EXDATE to the set
     *
     * @param {Date}
     */
    RRuleSet.prototype.exdate = function (date) {
        _addDate(date, this._exdate);
    };
    /**
     * Get list of included rrules in this recurrence set.
     *
     * @return List of rrules
     */
    RRuleSet.prototype.rrules = function () {
        return this._rrule.map(function (e) { return rrulestr(e.toString()); });
    };
    /**
     * Get list of excluded rrules in this recurrence set.
     *
     * @return List of exrules
     */
    RRuleSet.prototype.exrules = function () {
        return this._exrule.map(function (e) { return rrulestr(e.toString()); });
    };
    /**
     * Get list of included datetimes in this recurrence set.
     *
     * @return List of rdates
     */
    RRuleSet.prototype.rdates = function () {
        return this._rdate.map(function (e) { return new Date(e.getTime()); });
    };
    /**
     * Get list of included datetimes in this recurrence set.
     *
     * @return List of exdates
     */
    RRuleSet.prototype.exdates = function () {
        return this._exdate.map(function (e) { return new Date(e.getTime()); });
    };
    RRuleSet.prototype.valueOf = function () {
        var result = [];
        if (!this._rrule.length && this._dtstart) {
            result = result.concat(optionsToString({ dtstart: this._dtstart }));
        }
        this._rrule.forEach(function (rrule) {
            result = result.concat(rrule.toString().split('\n'));
        });
        this._exrule.forEach(function (exrule) {
            result = result.concat(exrule
                .toString()
                .split('\n')
                .map(function (line) { return line.replace(/^RRULE:/, 'EXRULE:'); })
                .filter(function (line) { return !/^DTSTART/.test(line); }));
        });
        if (this._rdate.length) {
            result.push(rdatesToString('RDATE', this._rdate, this.tzid()));
        }
        if (this._exdate.length) {
            result.push(rdatesToString('EXDATE', this._exdate, this.tzid()));
        }
        return result;
    };
    /**
     * to generate recurrence field such as:
     * DTSTART:19970902T010000Z
     * RRULE:FREQ=YEARLY;COUNT=2;BYDAY=TU
     * RRULE:FREQ=YEARLY;COUNT=1;BYDAY=TH
     */
    RRuleSet.prototype.toString = function () {
        return this.valueOf().join('\n');
    };
    /**
     * Create a new RRuleSet Object completely base on current instance
     */
    RRuleSet.prototype.clone = function () {
        var rrs = new RRuleSet(!!this._cache);
        this._rrule.forEach(function (rule) { return rrs.rrule(rule.clone()); });
        this._exrule.forEach(function (rule) { return rrs.exrule(rule.clone()); });
        this._rdate.forEach(function (date) { return rrs.rdate(new Date(date.getTime())); });
        this._exdate.forEach(function (date) { return rrs.exdate(new Date(date.getTime())); });
        return rrs;
    };
    return RRuleSet;
}(RRule));
export { RRuleSet };
function _addRule(rrule, collection) {
    if (!(rrule instanceof RRule)) {
        throw new TypeError(String(rrule) + ' is not RRule instance');
    }
    if (!includes(collection.map(String), String(rrule))) {
        collection.push(rrule);
    }
}
function _addDate(date, collection) {
    if (!(date instanceof Date)) {
        throw new TypeError(String(date) + ' is not Date instance');
    }
    if (!includes(collection.map(Number), Number(date))) {
        collection.push(date);
        sort(collection);
    }
}
function rdatesToString(param, rdates, tzid) {
    var isUTC = !tzid || tzid.toUpperCase() === 'UTC';
    var header = isUTC ? "".concat(param, ":") : "".concat(param, ";TZID=").concat(tzid, ":");
    var dateString = rdates
        .map(function (rdate) { return timeToUntilString(rdate.valueOf(), isUTC); })
        .join(',');
    return "".concat(header).concat(dateString);
}
//# sourceMappingURL=rruleset.js.map