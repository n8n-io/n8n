"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var context_1 = require("../logger/context");
var level_1 = require("../logger/level");
var extendArray = function (array) {
    return Object.defineProperty(array, 'last', {
        configurable: true,
        get: function () {
            return this[this.length - 1];
        },
    });
};
exports.extendArray = extendArray;
var LogTargetMock = (function () {
    function LogTargetMock(minLevel) {
        if (minLevel === void 0) { minLevel = -Infinity; }
        var _this = this;
        this.minLevel = minLevel;
        this.messages = Object.defineProperties(extendArray([]), {
            trace: { get: function () { return _this.filteredMessages(level_1.LogLevels.trace); } },
            debug: { get: function () { return _this.filteredMessages(level_1.LogLevels.debug); } },
            info: { get: function () { return _this.filteredMessages(level_1.LogLevels.info); } },
            warn: { get: function () { return _this.filteredMessages(level_1.LogLevels.warn); } },
            error: { get: function () { return _this.filteredMessages(level_1.LogLevels.error); } },
            fatal: { get: function () { return _this.filteredMessages(level_1.LogLevels.fatal); } },
        });
        this.lines = Object.defineProperties(extendArray([]), {
            trace: { get: function () { return _this.filteredLines(level_1.LogLevels.trace); } },
            debug: { get: function () { return _this.filteredLines(level_1.LogLevels.debug); } },
            info: { get: function () { return _this.filteredLines(level_1.LogLevels.info); } },
            warn: { get: function () { return _this.filteredLines(level_1.LogLevels.warn); } },
            error: { get: function () { return _this.filteredLines(level_1.LogLevels.error); } },
            fatal: { get: function () { return _this.filteredLines(level_1.LogLevels.fatal); } },
        });
        this.stream = {
            write: function (msg) { return !!_this.lines.push(msg); },
        };
    }
    LogTargetMock.prototype.format = function (msg) {
        this.messages.push(msg);
        var lvl = msg.context[context_1.LogContexts.logLevel];
        if (lvl != null) {
            return "[level:" + lvl + "] " + msg.message;
        }
        return msg.message;
    };
    LogTargetMock.prototype.clear = function () {
        this.messages.splice(0, this.messages.length);
        this.lines.splice(0, this.lines.length);
    };
    LogTargetMock.prototype.filteredMessages = function (level, untilLevel) {
        var filter;
        if (level == null) {
            filter = function (m) { return m.context[context_1.LogContexts.logLevel] == null; };
        }
        else if (untilLevel != null) {
            filter = function (m) {
                var lvl = m.context[context_1.LogContexts.logLevel];
                return lvl != null && lvl >= level && lvl <= untilLevel;
            };
        }
        else {
            filter = function (m) { return m.context[context_1.LogContexts.logLevel] === level; };
        }
        return extendArray(this.messages.filter(filter));
    };
    LogTargetMock.prototype.filteredLines = function (level, untilLevel) {
        var extractLevel = function (line) {
            var level = (line.match(/^\[level:([0-9]+)\] /) || [])[1];
            return level == null ? undefined : parseInt(level, 10);
        };
        var filter;
        if (level == null) {
            filter = function (line) { return extractLevel(line) === undefined; };
        }
        else if (untilLevel != null) {
            filter = function (line) {
                var lvl = extractLevel(line);
                return lvl != null && lvl >= level && lvl <= untilLevel;
            };
        }
        else {
            filter = function (line) { return extractLevel(line) === level; };
        }
        return extendArray(this.lines.filter(filter));
    };
    return LogTargetMock;
}());
exports.LogTargetMock = LogTargetMock;
