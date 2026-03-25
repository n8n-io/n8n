"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var fast_json_stable_stringify_1 = __importDefault(require("fast-json-stable-stringify"));
var context_1 = require("./context");
var level_1 = require("./level");
var LogFormatters = defaultLogFormatters();
exports.LogFormatters = LogFormatters;
var resetLogFormatters = function () {
    exports.LogFormatters = LogFormatters = defaultLogFormatters();
};
exports.resetLogFormatters = resetLogFormatters;
var registerLogFormatter = function (name, format) {
    LogFormatters[name] = format;
};
exports.registerLogFormatter = registerLogFormatter;
function defaultLogFormatters() {
    return {
        json: function (msg) { return fast_json_stable_stringify_1.default(__assign({}, msg, { time: new Date(msg.time) }), { cycles: true }); },
        simple: function (msg) {
            return (msg.context[context_1.LogContexts.package] || msg.context[context_1.LogContexts.application] || 'main') + "[" + (msg.context[context_1.LogContexts.namespace] || 'root') + "] (" + level_1.logLevelNameFor(msg.context[context_1.LogContexts.logLevel]).toUpperCase() + ") " + msg.message;
        },
    };
}
