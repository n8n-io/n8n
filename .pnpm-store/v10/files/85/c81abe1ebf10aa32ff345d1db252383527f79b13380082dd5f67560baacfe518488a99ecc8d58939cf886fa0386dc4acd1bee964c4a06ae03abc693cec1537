"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RE_RANGE = exports.RE_WILDCARDS = exports.PRESETS = exports.TIME_UNITS_LEN = exports.TIME_UNITS = exports.TIME_UNITS_MAP = exports.ALIASES = exports.PARSE_DEFAULTS = exports.CONSTRAINTS = void 0;
exports.CONSTRAINTS = Object.freeze({
    second: [0, 59],
    minute: [0, 59],
    hour: [0, 23],
    dayOfMonth: [1, 31],
    month: [1, 12],
    dayOfWeek: [0, 7]
});
exports.PARSE_DEFAULTS = Object.freeze({
    second: '0',
    minute: '*',
    hour: '*',
    dayOfMonth: '*',
    month: '*',
    dayOfWeek: '*'
});
exports.ALIASES = Object.freeze({
    jan: 1,
    feb: 2,
    mar: 3,
    apr: 4,
    may: 5,
    jun: 6,
    jul: 7,
    aug: 8,
    sep: 9,
    oct: 10,
    nov: 11,
    dec: 12,
    sun: 0,
    mon: 1,
    tue: 2,
    wed: 3,
    thu: 4,
    fri: 5,
    sat: 6
});
exports.TIME_UNITS_MAP = Object.freeze({
    SECOND: 'second',
    MINUTE: 'minute',
    HOUR: 'hour',
    DAY_OF_MONTH: 'dayOfMonth',
    MONTH: 'month',
    DAY_OF_WEEK: 'dayOfWeek'
});
exports.TIME_UNITS = Object.freeze(Object.values(exports.TIME_UNITS_MAP));
exports.TIME_UNITS_LEN = exports.TIME_UNITS.length;
exports.PRESETS = Object.freeze({
    '@yearly': '0 0 0 1 1 *',
    '@monthly': '0 0 0 1 * *',
    '@weekly': '0 0 0 * * 0',
    '@daily': '0 0 0 * * *',
    '@hourly': '0 0 * * * *',
    '@minutely': '0 * * * * *',
    '@secondly': '* * * * * *',
    '@weekdays': '0 0 0 * * 1-5',
    '@weekends': '0 0 0 * * 0,6'
});
exports.RE_WILDCARDS = /\*/g;
exports.RE_RANGE = /^(\d+)(?:-(\d+))?(?:\/(\d+))?$/g;
