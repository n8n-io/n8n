import { __assign } from "tslib";
import { datetime, getWeekday, isLeapYear, toOrdinal } from '../dateutil';
import { empty, repeat, pymod, includes } from '../helpers';
import { M365MASK, MDAY365MASK, NMDAY365MASK, WDAYMASK, M365RANGE, M366MASK, MDAY366MASK, NMDAY366MASK, M366RANGE, } from '../masks';
export function rebuildYear(year, options) {
    var firstyday = datetime(year, 1, 1);
    var yearlen = isLeapYear(year) ? 366 : 365;
    var nextyearlen = isLeapYear(year + 1) ? 366 : 365;
    var yearordinal = toOrdinal(firstyday);
    var yearweekday = getWeekday(firstyday);
    var result = __assign(__assign({ yearlen: yearlen, nextyearlen: nextyearlen, yearordinal: yearordinal, yearweekday: yearweekday }, baseYearMasks(year)), { wnomask: null });
    if (empty(options.byweekno)) {
        return result;
    }
    result.wnomask = repeat(0, yearlen + 7);
    var firstwkst;
    var wyearlen;
    var no1wkst = (firstwkst = pymod(7 - yearweekday + options.wkst, 7));
    if (no1wkst >= 4) {
        no1wkst = 0;
        // Number of days in the year, plus the days we got
        // from last year.
        wyearlen = result.yearlen + pymod(yearweekday - options.wkst, 7);
    }
    else {
        // Number of days in the year, minus the days we
        // left in last year.
        wyearlen = yearlen - no1wkst;
    }
    var div = Math.floor(wyearlen / 7);
    var mod = pymod(wyearlen, 7);
    var numweeks = Math.floor(div + mod / 4);
    for (var j = 0; j < options.byweekno.length; j++) {
        var n = options.byweekno[j];
        if (n < 0) {
            n += numweeks + 1;
        }
        if (!(n > 0 && n <= numweeks)) {
            continue;
        }
        var i = void 0;
        if (n > 1) {
            i = no1wkst + (n - 1) * 7;
            if (no1wkst !== firstwkst) {
                i -= 7 - firstwkst;
            }
        }
        else {
            i = no1wkst;
        }
        for (var k = 0; k < 7; k++) {
            result.wnomask[i] = 1;
            i++;
            if (result.wdaymask[i] === options.wkst)
                break;
        }
    }
    if (includes(options.byweekno, 1)) {
        // Check week number 1 of next year as well
        // orig-TODO : Check -numweeks for next year.
        var i = no1wkst + numweeks * 7;
        if (no1wkst !== firstwkst)
            i -= 7 - firstwkst;
        if (i < yearlen) {
            // If week starts in next year, we
            // don't care about it.
            for (var j = 0; j < 7; j++) {
                result.wnomask[i] = 1;
                i += 1;
                if (result.wdaymask[i] === options.wkst)
                    break;
            }
        }
    }
    if (no1wkst) {
        // Check last week number of last year as
        // well. If no1wkst is 0, either the year
        // started on week start, or week number 1
        // got days from last year, so there are no
        // days from last year's last week number in
        // this year.
        var lnumweeks = void 0;
        if (!includes(options.byweekno, -1)) {
            var lyearweekday = getWeekday(datetime(year - 1, 1, 1));
            var lno1wkst = pymod(7 - lyearweekday.valueOf() + options.wkst, 7);
            var lyearlen = isLeapYear(year - 1) ? 366 : 365;
            var weekst = void 0;
            if (lno1wkst >= 4) {
                lno1wkst = 0;
                weekst = lyearlen + pymod(lyearweekday - options.wkst, 7);
            }
            else {
                weekst = yearlen - no1wkst;
            }
            lnumweeks = Math.floor(52 + pymod(weekst, 7) / 4);
        }
        else {
            lnumweeks = -1;
        }
        if (includes(options.byweekno, lnumweeks)) {
            for (var i = 0; i < no1wkst; i++)
                result.wnomask[i] = 1;
        }
    }
    return result;
}
function baseYearMasks(year) {
    var yearlen = isLeapYear(year) ? 366 : 365;
    var firstyday = datetime(year, 1, 1);
    var wday = getWeekday(firstyday);
    if (yearlen === 365) {
        return {
            mmask: M365MASK,
            mdaymask: MDAY365MASK,
            nmdaymask: NMDAY365MASK,
            wdaymask: WDAYMASK.slice(wday),
            mrange: M365RANGE,
        };
    }
    return {
        mmask: M366MASK,
        mdaymask: MDAY366MASK,
        nmdaymask: NMDAY366MASK,
        wdaymask: WDAYMASK.slice(wday),
        mrange: M366RANGE,
    };
}
//# sourceMappingURL=yearinfo.js.map