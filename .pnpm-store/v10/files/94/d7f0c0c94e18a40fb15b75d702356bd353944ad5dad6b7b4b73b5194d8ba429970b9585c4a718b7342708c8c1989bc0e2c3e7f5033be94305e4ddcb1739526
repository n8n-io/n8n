import { RRule } from '../rrule';
import { empty, repeat, pymod } from '../helpers';
export function rebuildMonth(year, month, yearlen, mrange, wdaymask, options) {
    var result = {
        lastyear: year,
        lastmonth: month,
        nwdaymask: [],
    };
    var ranges = [];
    if (options.freq === RRule.YEARLY) {
        if (empty(options.bymonth)) {
            ranges = [[0, yearlen]];
        }
        else {
            for (var j = 0; j < options.bymonth.length; j++) {
                month = options.bymonth[j];
                ranges.push(mrange.slice(month - 1, month + 1));
            }
        }
    }
    else if (options.freq === RRule.MONTHLY) {
        ranges = [mrange.slice(month - 1, month + 1)];
    }
    if (empty(ranges)) {
        return result;
    }
    // Weekly frequency won't get here, so we may not
    // care about cross-year weekly periods.
    result.nwdaymask = repeat(0, yearlen);
    for (var j = 0; j < ranges.length; j++) {
        var rang = ranges[j];
        var first = rang[0];
        var last = rang[1] - 1;
        for (var k = 0; k < options.bynweekday.length; k++) {
            var i = void 0;
            var _a = options.bynweekday[k], wday = _a[0], n = _a[1];
            if (n < 0) {
                i = last + (n + 1) * 7;
                i -= pymod(wdaymask[i] - wday, 7);
            }
            else {
                i = first + (n - 1) * 7;
                i += pymod(7 - wdaymask[i] + wday, 7);
            }
            if (first <= i && i <= last)
                result.nwdaymask[i] = 1;
        }
    }
    return result;
}
//# sourceMappingURL=monthinfo.js.map