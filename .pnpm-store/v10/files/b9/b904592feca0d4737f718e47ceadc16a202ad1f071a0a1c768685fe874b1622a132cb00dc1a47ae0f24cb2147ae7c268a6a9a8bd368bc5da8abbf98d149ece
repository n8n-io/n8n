import { freqIsDailyOrGreater } from '../types';
import { combine, fromOrdinal, MAXYEAR } from '../dateutil';
import Iterinfo from '../iterinfo/index';
import { RRule } from '../rrule';
import { buildTimeset } from '../parseoptions';
import { notEmpty, includes, isPresent } from '../helpers';
import { DateWithZone } from '../datewithzone';
import { buildPoslist } from './poslist';
import { DateTime } from '../datetime';
export function iter(iterResult, options) {
    var dtstart = options.dtstart, freq = options.freq, interval = options.interval, until = options.until, bysetpos = options.bysetpos;
    var count = options.count;
    if (count === 0 || interval === 0) {
        return emitResult(iterResult);
    }
    var counterDate = DateTime.fromDate(dtstart);
    var ii = new Iterinfo(options);
    ii.rebuild(counterDate.year, counterDate.month);
    var timeset = makeTimeset(ii, counterDate, options);
    for (;;) {
        var _a = ii.getdayset(freq)(counterDate.year, counterDate.month, counterDate.day), dayset = _a[0], start = _a[1], end = _a[2];
        var filtered = removeFilteredDays(dayset, start, end, ii, options);
        if (notEmpty(bysetpos)) {
            var poslist = buildPoslist(bysetpos, timeset, start, end, ii, dayset);
            for (var j = 0; j < poslist.length; j++) {
                var res = poslist[j];
                if (until && res > until) {
                    return emitResult(iterResult);
                }
                if (res >= dtstart) {
                    var rezonedDate = rezoneIfNeeded(res, options);
                    if (!iterResult.accept(rezonedDate)) {
                        return emitResult(iterResult);
                    }
                    if (count) {
                        --count;
                        if (!count) {
                            return emitResult(iterResult);
                        }
                    }
                }
            }
        }
        else {
            for (var j = start; j < end; j++) {
                var currentDay = dayset[j];
                if (!isPresent(currentDay)) {
                    continue;
                }
                var date = fromOrdinal(ii.yearordinal + currentDay);
                for (var k = 0; k < timeset.length; k++) {
                    var time = timeset[k];
                    var res = combine(date, time);
                    if (until && res > until) {
                        return emitResult(iterResult);
                    }
                    if (res >= dtstart) {
                        var rezonedDate = rezoneIfNeeded(res, options);
                        if (!iterResult.accept(rezonedDate)) {
                            return emitResult(iterResult);
                        }
                        if (count) {
                            --count;
                            if (!count) {
                                return emitResult(iterResult);
                            }
                        }
                    }
                }
            }
        }
        if (options.interval === 0) {
            return emitResult(iterResult);
        }
        // Handle frequency and interval
        counterDate.add(options, filtered);
        if (counterDate.year > MAXYEAR) {
            return emitResult(iterResult);
        }
        if (!freqIsDailyOrGreater(freq)) {
            timeset = ii.gettimeset(freq)(counterDate.hour, counterDate.minute, counterDate.second, 0);
        }
        ii.rebuild(counterDate.year, counterDate.month);
    }
}
function isFiltered(ii, currentDay, options) {
    var bymonth = options.bymonth, byweekno = options.byweekno, byweekday = options.byweekday, byeaster = options.byeaster, bymonthday = options.bymonthday, bynmonthday = options.bynmonthday, byyearday = options.byyearday;
    return ((notEmpty(bymonth) && !includes(bymonth, ii.mmask[currentDay])) ||
        (notEmpty(byweekno) && !ii.wnomask[currentDay]) ||
        (notEmpty(byweekday) && !includes(byweekday, ii.wdaymask[currentDay])) ||
        (notEmpty(ii.nwdaymask) && !ii.nwdaymask[currentDay]) ||
        (byeaster !== null && !includes(ii.eastermask, currentDay)) ||
        ((notEmpty(bymonthday) || notEmpty(bynmonthday)) &&
            !includes(bymonthday, ii.mdaymask[currentDay]) &&
            !includes(bynmonthday, ii.nmdaymask[currentDay])) ||
        (notEmpty(byyearday) &&
            ((currentDay < ii.yearlen &&
                !includes(byyearday, currentDay + 1) &&
                !includes(byyearday, -ii.yearlen + currentDay)) ||
                (currentDay >= ii.yearlen &&
                    !includes(byyearday, currentDay + 1 - ii.yearlen) &&
                    !includes(byyearday, -ii.nextyearlen + currentDay - ii.yearlen)))));
}
function rezoneIfNeeded(date, options) {
    return new DateWithZone(date, options.tzid).rezonedDate();
}
function emitResult(iterResult) {
    return iterResult.getValue();
}
function removeFilteredDays(dayset, start, end, ii, options) {
    var filtered = false;
    for (var dayCounter = start; dayCounter < end; dayCounter++) {
        var currentDay = dayset[dayCounter];
        filtered = isFiltered(ii, currentDay, options);
        if (filtered)
            dayset[currentDay] = null;
    }
    return filtered;
}
function makeTimeset(ii, counterDate, options) {
    var freq = options.freq, byhour = options.byhour, byminute = options.byminute, bysecond = options.bysecond;
    if (freqIsDailyOrGreater(freq)) {
        return buildTimeset(options);
    }
    if ((freq >= RRule.HOURLY &&
        notEmpty(byhour) &&
        !includes(byhour, counterDate.hour)) ||
        (freq >= RRule.MINUTELY &&
            notEmpty(byminute) &&
            !includes(byminute, counterDate.minute)) ||
        (freq >= RRule.SECONDLY &&
            notEmpty(bysecond) &&
            !includes(bysecond, counterDate.second))) {
        return [];
    }
    return ii.gettimeset(freq)(counterDate.hour, counterDate.minute, counterDate.second, counterDate.millisecond);
}
//# sourceMappingURL=index.js.map