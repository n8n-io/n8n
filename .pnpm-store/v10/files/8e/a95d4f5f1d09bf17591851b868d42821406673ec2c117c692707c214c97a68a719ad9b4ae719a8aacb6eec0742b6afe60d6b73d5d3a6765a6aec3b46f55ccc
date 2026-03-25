"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var cache_getters_1 = require("../utils/cache-getters");
var LogLevels = cache_getters_1.cacheGetters({
    trace: 10,
    debug: 20,
    info: 30,
    warn: 40,
    error: 50,
    fatal: 60,
    get lower() {
        return LogLevels.trace;
    },
    get higher() {
        return LogLevels.fatal;
    },
}, 'lower', 'higher');
exports.LogLevels = LogLevels;
var LogLevelNames = ['trace', 'debug', 'info', 'warn', 'error', 'fatal'];
exports.LogLevelNames = LogLevelNames;
var LogLevelValues = LogLevelNames.map(function (name) { return LogLevels[name]; });
exports.LogLevelValues = LogLevelValues;
var LogLevelsScale = LogLevelNames.map(function (name, index, _a) {
    var length = _a.length;
    var first = index === 0;
    var last = index === length - 1;
    var from = first ? -Infinity : LogLevelValues[index];
    var next = last ? +Infinity : LogLevelValues[index + 1];
    var test;
    if (first) {
        test = function (level) { return level < next; };
    }
    else if (last) {
        test = function (level) { return level >= from; };
    }
    else {
        test = function (level) { return level < next && level >= from; };
    }
    return { range: { from: from, next: next }, name: name, test: test };
});
exports.LogLevelsScale = LogLevelsScale;
var logLevelNameFor = function (level) {
    if (level == null || isNaN(level)) {
        return LogLevelNames[0];
    }
    return LogLevelsScale.find(function (_a) {
        var test = _a.test;
        return test(level);
    }).name;
};
exports.logLevelNameFor = logLevelNameFor;
var parseLogLevel = function (level) {
    if (typeof level === 'string') {
        level = level.toLowerCase();
        if (level in LogLevels) {
            return LogLevels[level];
        }
        return /^\s*[0-9]+\s*$/.test(level) ? parseInt(level.trim(), 10) : undefined;
    }
    return typeof level === 'number' && !isNaN(level) ? +level : undefined;
};
exports.parseLogLevel = parseLogLevel;
