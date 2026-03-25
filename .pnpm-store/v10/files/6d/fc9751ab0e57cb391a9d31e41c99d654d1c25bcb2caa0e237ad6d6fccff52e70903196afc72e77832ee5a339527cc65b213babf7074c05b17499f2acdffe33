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
var __read = (this && this.__read) || function (o, n) {
    var m = typeof Symbol === "function" && o[Symbol.iterator];
    if (!m) return o;
    var i = m.call(o), r, ar = [], e;
    try {
        while ((n === void 0 || n-- > 0) && !(r = i.next()).done) ar.push(r.value);
    }
    catch (error) { e = { error: error }; }
    finally {
        try {
            if (r && !r.done && (m = i["return"])) m.call(i);
        }
        finally { if (e) throw e.error; }
    }
    return ar;
};
var __spread = (this && this.__spread) || function () {
    for (var ar = [], i = 0; i < arguments.length; i++) ar = ar.concat(__read(arguments[i]));
    return ar;
};
Object.defineProperty(exports, "__esModule", { value: true });
var util_1 = require("util");
var context_1 = require("./context");
var level_1 = require("./level");
var target_1 = require("./target");
var lastSeqNumber = 0;
var resetSequence = function (next) {
    if (next === void 0) { next = 1; }
    lastSeqNumber = next - 1;
};
exports.resetSequence = resetSequence;
var lastSequenceNumber = function () { return lastSeqNumber; };
exports.lastSequenceNumber = lastSequenceNumber;
var createEmptyFunction = function () {
    return Object.defineProperty(function emptyFunction() { }, 'isEmptyFunction', { value: true });
};
var createEmptyLogger = function () {
    var log = createEmptyFunction();
    log.child = function () { return createEmptyLogger(); };
    log.wrap = function () {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args[_i] = arguments[_i];
        }
        return args.pop();
    };
    level_1.LogLevelNames.forEach(function (name) {
        log[name] = log;
    });
    return log;
};
var createLogger = function (_a) {
    var _b = _a === void 0 ? {} : _a, _c = _b.context, baseContext = _c === void 0 ? {} : _c, _d = _b.targets, logTargets = _d === void 0 ? target_1.DEFAULT_LOG_TARGET : _d, logTranslator = _b.translate;
    var targets = typeof logTargets === 'string' ? target_1.parseLogTargets(logTargets) : logTargets;
    if (targets.length === 0) {
        return createEmptyLogger();
    }
    var log = function () {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args[_i] = arguments[_i];
        }
        var time = Date.now();
        var sequence = ++lastSeqNumber;
        var context;
        if (typeof args[0] === 'string') {
            context = __assign({}, baseContext);
        }
        else {
            context = __assign({}, baseContext, args.shift());
        }
        var msg = args.shift();
        var logLevel = context[context_1.LogContexts.logLevel];
        var destTargets = logLevel == null ? targets : targets.filter(function (t) { return logLevel >= t.minLevel; });
        if (destTargets.length === 0) {
            return;
        }
        var message = util_1.format.apply(void 0, __spread([msg], args));
        var logMessage = {
            context: context,
            time: time,
            sequence: sequence,
            message: message,
        };
        if (logTranslator) {
            logMessage = logTranslator(logMessage);
        }
        destTargets.forEach(function (t) { return t.stream.write(t.format(logMessage) + "\n"); });
    };
    log.child = function (ctxOrTranslator) {
        var isTranslator = typeof ctxOrTranslator === 'function';
        var childContext = isTranslator ? __assign({}, baseContext) : __assign({}, baseContext, ctxOrTranslator);
        var translate;
        if (isTranslator) {
            if (logTranslator) {
                translate = function (msg) { return ctxOrTranslator(logTranslator(msg)); };
            }
            else {
                translate = ctxOrTranslator;
            }
        }
        else {
            translate = logTranslator;
        }
        return createLogger({ context: childContext, targets: targets, translate: translate });
    };
    log.wrap = function () {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args[_i] = arguments[_i];
        }
        var _a;
        var _b = __read(Array(3 - args.length).concat(args), 3), ctx = _b[0], msg = _b[1], func = _b[2];
        var context = typeof ctx === 'number' ? __assign({}, baseContext, (_a = {}, _a[context_1.LogContexts.logLevel] = ctx, _a)) : __assign({}, baseContext, ctx);
        var logLevel = context[context_1.LogContexts.logLevel];
        if (typeof logLevel === 'number' && targets.every(function (t) { return t.minLevel > logLevel; })) {
            return func;
        }
        var message = msg == null ? "calling " + (func.name || '[anonymous]') + "()" : msg;
        return function wrapped() {
            var args = [];
            for (var _i = 0; _i < arguments.length; _i++) {
                args[_i] = arguments[_i];
            }
            log(__assign({ call: { args: args } }, context), message);
            return func.apply(this, args);
        };
    };
    level_1.LogLevelNames.forEach(function (name) {
        var _a;
        var level = level_1.LogLevels[name];
        var extraContext = (_a = {}, _a[context_1.LogContexts.logLevel] = level, _a);
        log[name] = function (ctxOrMsg) {
            var args = [];
            for (var _i = 1; _i < arguments.length; _i++) {
                args[_i - 1] = arguments[_i];
            }
            if (targets.length === 0 || targets.every(function (t) { return t.minLevel > level; })) {
                log[name] = createEmptyFunction();
                return;
            }
            if (typeof ctxOrMsg === 'string') {
                log.apply(void 0, __spread([extraContext, ctxOrMsg], args));
            }
            else {
                log.apply(void 0, __spread([__assign({}, ctxOrMsg, extraContext)], args));
            }
        };
    });
    return log;
};
exports.createLogger = createLogger;
