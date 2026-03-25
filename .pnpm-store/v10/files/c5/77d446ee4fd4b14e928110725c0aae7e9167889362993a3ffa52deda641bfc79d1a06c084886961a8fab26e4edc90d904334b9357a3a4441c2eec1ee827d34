import { padStart } from './helpers';
export var datetime = function (y, m, d, h, i, s) {
    if (h === void 0) { h = 0; }
    if (i === void 0) { i = 0; }
    if (s === void 0) { s = 0; }
    return new Date(Date.UTC(y, m - 1, d, h, i, s));
};
/**
 * General date-related utilities.
 * Also handles several incompatibilities between JavaScript and Python
 *
 */
export var MONTH_DAYS = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
/**
 * Number of milliseconds of one day
 */
export var ONE_DAY = 1000 * 60 * 60 * 24;
/**
 * @see: <http://docs.python.org/library/datetime.html#datetime.MAXYEAR>
 */
export var MAXYEAR = 9999;
/**
 * Python uses 1-Jan-1 as the base for calculating ordinals but we don't
 * want to confuse the JS engine with milliseconds > Number.MAX_NUMBER,
 * therefore we use 1-Jan-1970 instead
 */
export var ORDINAL_BASE = datetime(1970, 1, 1);
/**
 * Python: MO-SU: 0 - 6
 * JS: SU-SAT 0 - 6
 */
export var PY_WEEKDAYS = [6, 0, 1, 2, 3, 4, 5];
/**
 * py_date.timetuple()[7]
 */
export var getYearDay = function (date) {
    var dateNoTime = new Date(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
    return (Math.ceil((dateNoTime.valueOf() - new Date(date.getUTCFullYear(), 0, 1).valueOf()) /
        ONE_DAY) + 1);
};
export var isLeapYear = function (year) {
    return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
};
export var isDate = function (value) {
    return value instanceof Date;
};
export var isValidDate = function (value) {
    return isDate(value) && !isNaN(value.getTime());
};
/**
 * @return {Number} the date's timezone offset in ms
 */
export var tzOffset = function (date) {
    return date.getTimezoneOffset() * 60 * 1000;
};
/**
 * @see: <http://www.mcfedries.com/JavaScript/DaysBetween.asp>
 */
export var daysBetween = function (date1, date2) {
    // The number of milliseconds in one day
    // Convert both dates to milliseconds
    var date1ms = date1.getTime();
    var date2ms = date2.getTime();
    // Calculate the difference in milliseconds
    var differencems = date1ms - date2ms;
    // Convert back to days and return
    return Math.round(differencems / ONE_DAY);
};
/**
 * @see: <http://docs.python.org/library/datetime.html#datetime.date.toordinal>
 */
export var toOrdinal = function (date) {
    return daysBetween(date, ORDINAL_BASE);
};
/**
 * @see - <http://docs.python.org/library/datetime.html#datetime.date.fromordinal>
 */
export var fromOrdinal = function (ordinal) {
    return new Date(ORDINAL_BASE.getTime() + ordinal * ONE_DAY);
};
export var getMonthDays = function (date) {
    var month = date.getUTCMonth();
    return month === 1 && isLeapYear(date.getUTCFullYear())
        ? 29
        : MONTH_DAYS[month];
};
/**
 * @return {Number} python-like weekday
 */
export var getWeekday = function (date) {
    return PY_WEEKDAYS[date.getUTCDay()];
};
/**
 * @see: <http://docs.python.org/library/calendar.html#calendar.monthrange>
 */
export var monthRange = function (year, month) {
    var date = datetime(year, month + 1, 1);
    return [getWeekday(date), getMonthDays(date)];
};
/**
 * @see: <http://docs.python.org/library/datetime.html#datetime.datetime.combine>
 */
export var combine = function (date, time) {
    time = time || date;
    return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), time.getHours(), time.getMinutes(), time.getSeconds(), time.getMilliseconds()));
};
export var clone = function (date) {
    var dolly = new Date(date.getTime());
    return dolly;
};
export var cloneDates = function (dates) {
    var clones = [];
    for (var i = 0; i < dates.length; i++) {
        clones.push(clone(dates[i]));
    }
    return clones;
};
/**
 * Sorts an array of Date or Time objects
 */
export var sort = function (dates) {
    dates.sort(function (a, b) {
        return a.getTime() - b.getTime();
    });
};
export var timeToUntilString = function (time, utc) {
    if (utc === void 0) { utc = true; }
    var date = new Date(time);
    return [
        padStart(date.getUTCFullYear().toString(), 4, '0'),
        padStart(date.getUTCMonth() + 1, 2, '0'),
        padStart(date.getUTCDate(), 2, '0'),
        'T',
        padStart(date.getUTCHours(), 2, '0'),
        padStart(date.getUTCMinutes(), 2, '0'),
        padStart(date.getUTCSeconds(), 2, '0'),
        utc ? 'Z' : '',
    ].join('');
};
export var untilStringToDate = function (until) {
    var re = /^(\d{4})(\d{2})(\d{2})(T(\d{2})(\d{2})(\d{2})Z?)?$/;
    var bits = re.exec(until);
    if (!bits)
        throw new Error("Invalid UNTIL value: ".concat(until));
    return new Date(Date.UTC(parseInt(bits[1], 10), parseInt(bits[2], 10) - 1, parseInt(bits[3], 10), parseInt(bits[5], 10) || 0, parseInt(bits[6], 10) || 0, parseInt(bits[7], 10) || 0));
};
var dateTZtoISO8601 = function (date, timeZone) {
    // date format for sv-SE is almost ISO8601
    var dateStr = date.toLocaleString('sv-SE', { timeZone: timeZone });
    // '2023-02-07 10:41:36'
    return dateStr.replace(' ', 'T') + 'Z';
};
export var dateInTimeZone = function (date, timeZone) {
    var localTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    // Date constructor can only reliably parse dates in ISO8601 format
    var dateInLocalTZ = new Date(dateTZtoISO8601(date, localTimeZone));
    var dateInTargetTZ = new Date(dateTZtoISO8601(date, timeZone !== null && timeZone !== void 0 ? timeZone : 'UTC'));
    var tzOffset = dateInTargetTZ.getTime() - dateInLocalTZ.getTime();
    return new Date(date.getTime() - tzOffset);
};
//# sourceMappingURL=dateutil.js.map