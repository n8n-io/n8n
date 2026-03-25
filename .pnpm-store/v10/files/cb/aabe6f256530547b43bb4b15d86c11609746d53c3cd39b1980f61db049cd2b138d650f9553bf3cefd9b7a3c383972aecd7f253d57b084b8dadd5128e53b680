import { __assign } from "tslib";
import { Frequency } from './types';
import { Weekday } from './weekday';
import { untilStringToDate } from './dateutil';
import { Days } from './rrule';
export function parseString(rfcString) {
    var options = rfcString
        .split('\n')
        .map(parseLine)
        .filter(function (x) { return x !== null; });
    return __assign(__assign({}, options[0]), options[1]);
}
export function parseDtstart(line) {
    var options = {};
    var dtstartWithZone = /DTSTART(?:;TZID=([^:=]+?))?(?::|=)([^;\s]+)/i.exec(line);
    if (!dtstartWithZone) {
        return options;
    }
    var tzid = dtstartWithZone[1], dtstart = dtstartWithZone[2];
    if (tzid) {
        options.tzid = tzid;
    }
    options.dtstart = untilStringToDate(dtstart);
    return options;
}
function parseLine(rfcString) {
    rfcString = rfcString.replace(/^\s+|\s+$/, '');
    if (!rfcString.length)
        return null;
    var header = /^([A-Z]+?)[:;]/.exec(rfcString.toUpperCase());
    if (!header) {
        return parseRrule(rfcString);
    }
    var key = header[1];
    switch (key.toUpperCase()) {
        case 'RRULE':
        case 'EXRULE':
            return parseRrule(rfcString);
        case 'DTSTART':
            return parseDtstart(rfcString);
        default:
            throw new Error("Unsupported RFC prop ".concat(key, " in ").concat(rfcString));
    }
}
function parseRrule(line) {
    var strippedLine = line.replace(/^RRULE:/i, '');
    var options = parseDtstart(strippedLine);
    var attrs = line.replace(/^(?:RRULE|EXRULE):/i, '').split(';');
    attrs.forEach(function (attr) {
        var _a = attr.split('='), key = _a[0], value = _a[1];
        switch (key.toUpperCase()) {
            case 'FREQ':
                options.freq = Frequency[value.toUpperCase()];
                break;
            case 'WKST':
                options.wkst = Days[value.toUpperCase()];
                break;
            case 'COUNT':
            case 'INTERVAL':
            case 'BYSETPOS':
            case 'BYMONTH':
            case 'BYMONTHDAY':
            case 'BYYEARDAY':
            case 'BYWEEKNO':
            case 'BYHOUR':
            case 'BYMINUTE':
            case 'BYSECOND':
                var num = parseNumber(value);
                var optionKey = key.toLowerCase();
                // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                // @ts-ignore
                options[optionKey] = num;
                break;
            case 'BYWEEKDAY':
            case 'BYDAY':
                options.byweekday = parseWeekday(value);
                break;
            case 'DTSTART':
            case 'TZID':
                // for backwards compatibility
                var dtstart = parseDtstart(line);
                options.tzid = dtstart.tzid;
                options.dtstart = dtstart.dtstart;
                break;
            case 'UNTIL':
                options.until = untilStringToDate(value);
                break;
            case 'BYEASTER':
                options.byeaster = Number(value);
                break;
            default:
                throw new Error("Unknown RRULE property '" + key + "'");
        }
    });
    return options;
}
function parseNumber(value) {
    if (value.indexOf(',') !== -1) {
        var values = value.split(',');
        return values.map(parseIndividualNumber);
    }
    return parseIndividualNumber(value);
}
function parseIndividualNumber(value) {
    if (/^[+-]?\d+$/.test(value)) {
        return Number(value);
    }
    return value;
}
function parseWeekday(value) {
    var days = value.split(',');
    return days.map(function (day) {
        if (day.length === 2) {
            // MO, TU, ...
            return Days[day]; // wday instanceof Weekday
        }
        // -1MO, +3FR, 1SO, 13TU ...
        var parts = day.match(/^([+-]?\d{1,2})([A-Z]{2})$/);
        if (!parts || parts.length < 3) {
            throw new SyntaxError("Invalid weekday string: ".concat(day));
        }
        var n = Number(parts[1]);
        var wdaypart = parts[2];
        var wday = Days[wdaypart].weekday;
        return new Weekday(wday, n);
    });
}
//# sourceMappingURL=parsestring.js.map