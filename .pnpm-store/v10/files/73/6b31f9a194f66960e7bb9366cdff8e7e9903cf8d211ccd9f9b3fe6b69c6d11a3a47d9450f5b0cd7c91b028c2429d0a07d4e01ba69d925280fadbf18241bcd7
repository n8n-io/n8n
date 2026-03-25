import { notEmpty, repeat, range, isPresent } from '../helpers';
import { Frequency } from '../types';
import { rebuildYear } from './yearinfo';
import { rebuildMonth } from './monthinfo';
import { easter } from './easter';
import { Time } from '../datetime';
import { datetime, sort, toOrdinal } from '../dateutil';
// =============================================================================
// Iterinfo
// =============================================================================
var Iterinfo = /** @class */ (function () {
    // eslint-disable-next-line no-empty-function
    function Iterinfo(options) {
        this.options = options;
    }
    Iterinfo.prototype.rebuild = function (year, month) {
        var options = this.options;
        if (year !== this.lastyear) {
            this.yearinfo = rebuildYear(year, options);
        }
        if (notEmpty(options.bynweekday) &&
            (month !== this.lastmonth || year !== this.lastyear)) {
            var _a = this.yearinfo, yearlen = _a.yearlen, mrange = _a.mrange, wdaymask = _a.wdaymask;
            this.monthinfo = rebuildMonth(year, month, yearlen, mrange, wdaymask, options);
        }
        if (isPresent(options.byeaster)) {
            this.eastermask = easter(year, options.byeaster);
        }
    };
    Object.defineProperty(Iterinfo.prototype, "lastyear", {
        get: function () {
            return this.monthinfo ? this.monthinfo.lastyear : null;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(Iterinfo.prototype, "lastmonth", {
        get: function () {
            return this.monthinfo ? this.monthinfo.lastmonth : null;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(Iterinfo.prototype, "yearlen", {
        get: function () {
            return this.yearinfo.yearlen;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(Iterinfo.prototype, "yearordinal", {
        get: function () {
            return this.yearinfo.yearordinal;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(Iterinfo.prototype, "mrange", {
        get: function () {
            return this.yearinfo.mrange;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(Iterinfo.prototype, "wdaymask", {
        get: function () {
            return this.yearinfo.wdaymask;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(Iterinfo.prototype, "mmask", {
        get: function () {
            return this.yearinfo.mmask;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(Iterinfo.prototype, "wnomask", {
        get: function () {
            return this.yearinfo.wnomask;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(Iterinfo.prototype, "nwdaymask", {
        get: function () {
            return this.monthinfo ? this.monthinfo.nwdaymask : [];
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(Iterinfo.prototype, "nextyearlen", {
        get: function () {
            return this.yearinfo.nextyearlen;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(Iterinfo.prototype, "mdaymask", {
        get: function () {
            return this.yearinfo.mdaymask;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(Iterinfo.prototype, "nmdaymask", {
        get: function () {
            return this.yearinfo.nmdaymask;
        },
        enumerable: false,
        configurable: true
    });
    Iterinfo.prototype.ydayset = function () {
        return [range(this.yearlen), 0, this.yearlen];
    };
    Iterinfo.prototype.mdayset = function (_, month) {
        var start = this.mrange[month - 1];
        var end = this.mrange[month];
        var set = repeat(null, this.yearlen);
        for (var i = start; i < end; i++)
            set[i] = i;
        return [set, start, end];
    };
    Iterinfo.prototype.wdayset = function (year, month, day) {
        // We need to handle cross-year weeks here.
        var set = repeat(null, this.yearlen + 7);
        var i = toOrdinal(datetime(year, month, day)) - this.yearordinal;
        var start = i;
        for (var j = 0; j < 7; j++) {
            set[i] = i;
            ++i;
            if (this.wdaymask[i] === this.options.wkst)
                break;
        }
        return [set, start, i];
    };
    Iterinfo.prototype.ddayset = function (year, month, day) {
        var set = repeat(null, this.yearlen);
        var i = toOrdinal(datetime(year, month, day)) - this.yearordinal;
        set[i] = i;
        return [set, i, i + 1];
    };
    Iterinfo.prototype.htimeset = function (hour, _, second, millisecond) {
        var _this = this;
        var set = [];
        this.options.byminute.forEach(function (minute) {
            set = set.concat(_this.mtimeset(hour, minute, second, millisecond));
        });
        sort(set);
        return set;
    };
    Iterinfo.prototype.mtimeset = function (hour, minute, _, millisecond) {
        var set = this.options.bysecond.map(function (second) { return new Time(hour, minute, second, millisecond); });
        sort(set);
        return set;
    };
    Iterinfo.prototype.stimeset = function (hour, minute, second, millisecond) {
        return [new Time(hour, minute, second, millisecond)];
    };
    Iterinfo.prototype.getdayset = function (freq) {
        switch (freq) {
            case Frequency.YEARLY:
                return this.ydayset.bind(this);
            case Frequency.MONTHLY:
                return this.mdayset.bind(this);
            case Frequency.WEEKLY:
                return this.wdayset.bind(this);
            case Frequency.DAILY:
                return this.ddayset.bind(this);
            default:
                return this.ddayset.bind(this);
        }
    };
    Iterinfo.prototype.gettimeset = function (freq) {
        switch (freq) {
            case Frequency.HOURLY:
                return this.htimeset.bind(this);
            case Frequency.MINUTELY:
                return this.mtimeset.bind(this);
            case Frequency.SECONDLY:
                return this.stimeset.bind(this);
        }
    };
    return Iterinfo;
}());
export default Iterinfo;
//# sourceMappingURL=index.js.map