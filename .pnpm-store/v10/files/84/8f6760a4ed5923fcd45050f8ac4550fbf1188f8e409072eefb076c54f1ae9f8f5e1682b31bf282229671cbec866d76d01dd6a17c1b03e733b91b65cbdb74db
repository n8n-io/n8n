"use strict";
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
var __values = (this && this.__values) || function (o) {
    var m = typeof Symbol === "function" && o[Symbol.iterator], i = 0;
    if (m) return m.call(o);
    return {
        next: function () {
            if (o && i >= o.length) o = void 0;
            return { value: o && o[i++], done: !o };
        }
    };
};
Object.defineProperty(exports, "__esModule", { value: true });
var e_1, _a;
var cache_getters_1 = require("../utils/cache-getters");
var _1 = require(".");
var level_1 = require("./level");
var cache;
var setup = function (factory) {
    if (factory === void 0) { factory = function () { return _1.createLogger({ targets: process.env.LOG_TARGETS || process.env.LOG_TARGET }); }; }
    cache = cache_getters_1.cacheGetters({
        get root() {
            return factory();
        },
    }, 'root');
};
exports.setup = setup;
var rootLogger = (function () {
    var args = [];
    for (var _i = 0; _i < arguments.length; _i++) {
        args[_i] = arguments[_i];
    }
    return cache.root.apply(cache, __spread(args));
});
exports.rootLogger = rootLogger;
var props = __spread(level_1.LogLevelNames, ['child', 'wrap']);
var _loop_1 = function (prop) {
    Object.defineProperty(rootLogger, prop, {
        enumerable: true,
        configurable: true,
        get: function () {
            return cache.root[prop];
        },
    });
};
try {
    for (var props_1 = __values(props), props_1_1 = props_1.next(); !props_1_1.done; props_1_1 = props_1.next()) {
        var prop = props_1_1.value;
        _loop_1(prop);
    }
}
catch (e_1_1) { e_1 = { error: e_1_1 }; }
finally {
    try {
        if (props_1_1 && !props_1_1.done && (_a = props_1.return)) _a.call(props_1);
    }
    finally { if (e_1) throw e_1.error; }
}
cache_getters_1.cacheGetters.apply(void 0, __spread([rootLogger], props));
setup();
