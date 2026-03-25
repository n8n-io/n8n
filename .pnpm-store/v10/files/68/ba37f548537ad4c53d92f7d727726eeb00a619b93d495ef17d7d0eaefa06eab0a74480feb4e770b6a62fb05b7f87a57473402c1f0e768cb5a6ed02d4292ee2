"use strict";
var LOG_MSG_PREFIX = 'Rudder';
var LOG_LEVEL_MAP = {
    log: 0,
    debug: 1,
    info: 2,
    warn: 3,
    error: 4,
    none: 5,
};
/**
 * Service to log messages/data to output provider, default is console
 */
var Logger = /** @class */ (function () {
    function Logger(minLogLevel) {
        if (minLogLevel === void 0) { minLogLevel = 4; }
        this.minLogLevel = minLogLevel;
        this.logProvider = console;
    }
    Logger.prototype.log = function () {
        var data = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            data[_i] = arguments[_i];
        }
        this.outputLog('log', data);
    };
    Logger.prototype.info = function () {
        var data = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            data[_i] = arguments[_i];
        }
        this.outputLog('info', data);
    };
    Logger.prototype.debug = function () {
        var data = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            data[_i] = arguments[_i];
        }
        this.outputLog('debug', data);
    };
    Logger.prototype.warn = function () {
        var data = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            data[_i] = arguments[_i];
        }
        this.outputLog('warn', data);
    };
    Logger.prototype.error = function () {
        var data = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            data[_i] = arguments[_i];
        }
        this.outputLog('error', data);
    };
    Logger.prototype.outputLog = function (logMethod, data) {
        var _a;
        if (this.minLogLevel <= LOG_LEVEL_MAP[logMethod]) {
            (_a = this.logProvider)[logMethod.toLowerCase()].apply(_a, this.formatLogData(logMethod, data));
        }
    };
    /**
     * Formats the console message
     */
    // eslint-disable-next-line class-methods-use-this
    Logger.prototype.formatLogData = function (level, data) {
        if (Array.isArray(data) && data.length > 0) {
            // trim whitespaces for original message
            var originalMsg = typeof data[0] === 'string' ? data[0].trim() : '';
            // prepare the final message
            var timestamp = new Date().toISOString();
            var msg = "".concat(timestamp, " [").concat(LOG_MSG_PREFIX, "] ").concat(level, ": ").concat(originalMsg);
            var styledLogArgs = [msg];
            // add first it if it was not a string msg
            if (typeof data[0] !== 'string') {
                styledLogArgs.push(data[0]);
            }
            // append rest of the original arguments
            styledLogArgs.push.apply(styledLogArgs, data.slice(1));
            return styledLogArgs;
        }
        return data;
    };
    return Logger;
}());
module.exports = {
    Logger: Logger,
    LOG_LEVEL_MAP: LOG_LEVEL_MAP,
};
//# sourceMappingURL=Logger.js.map