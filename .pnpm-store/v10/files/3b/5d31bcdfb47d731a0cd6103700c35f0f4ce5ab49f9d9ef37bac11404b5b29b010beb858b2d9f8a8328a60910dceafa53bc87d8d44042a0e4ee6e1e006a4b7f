"use strict";
var __values = (this && this.__values) || function(o) {
    var s = typeof Symbol === "function" && Symbol.iterator, m = s && o[s], i = 0;
    if (m) return m.call(o);
    if (o && typeof o.length === "number") return {
        next: function () {
            if (o && i >= o.length) o = void 0;
            return { value: o && o[i++], done: !o };
        }
    };
    throw new TypeError(s ? "Object is not iterable." : "Symbol.iterator is not defined.");
};
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.pathsToModuleNameMapper = void 0;
var bs_logger_1 = require("bs-logger");
var utils_1 = require("../utils");
var messages_1 = require("../utils/messages");
// we don't need to escape all chars, so commented out is the real one
// const escapeRegex = (str: string) => str.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')
var escapeRegex = function (str) { return str.replace(/[-\\^$*+?.()|[\]{}]/g, '\\$&'); };
var logger = utils_1.rootLogger.child((_a = {}, _a[bs_logger_1.LogContexts.namespace] = 'path-mapper', _a));
var pathsToModuleNameMapper = function (mapping, _a) {
    var e_1, _b;
    var _c = _a === void 0 ? {} : _a, _d = _c.prefix, prefix = _d === void 0 ? '' : _d, _e = _c.useESM, useESM = _e === void 0 ? false : _e;
    var jestMap = {};
    try {
        for (var _f = __values(Object.keys(mapping)), _g = _f.next(); !_g.done; _g = _f.next()) {
            var fromPath = _g.value;
            var toPaths = mapping[fromPath];
            // check that we have only one target path
            if (toPaths.length === 0) {
                logger.warn((0, messages_1.interpolate)("Not mapping \"{{path}}\" because it has no target." /* Errors.NotMappingPathWithEmptyMap */, { path: fromPath }));
                continue;
            }
            // split with '*'
            var segments = fromPath.split(/\*/g);
            if (segments.length === 1) {
                var paths = toPaths.map(function (target) {
                    var enrichedPrefix = prefix !== '' && !prefix.endsWith('/') ? "".concat(prefix, "/") : prefix;
                    return "".concat(enrichedPrefix).concat(target);
                });
                var cjsPattern = "^".concat(escapeRegex(fromPath), "$");
                jestMap[cjsPattern] = paths.length === 1 ? paths[0] : paths;
            }
            else if (segments.length === 2) {
                var paths = toPaths.map(function (target) {
                    var enrichedTarget = target.startsWith('./') && prefix !== '' ? target.substring(target.indexOf('/') + 1) : target;
                    var enrichedPrefix = prefix !== '' && !prefix.endsWith('/') ? "".concat(prefix, "/") : prefix;
                    return "".concat(enrichedPrefix).concat(enrichedTarget.replace(/\*/g, '$1'));
                });
                if (useESM) {
                    var esmPattern = "^".concat(escapeRegex(segments[0]), "(.*)").concat(escapeRegex(segments[1]), "\\.js$");
                    jestMap[esmPattern] = paths.length === 1 ? paths[0] : paths;
                }
                var cjsPattern = "^".concat(escapeRegex(segments[0]), "(.*)").concat(escapeRegex(segments[1]), "$");
                jestMap[cjsPattern] = paths.length === 1 ? paths[0] : paths;
            }
            else {
                logger.warn((0, messages_1.interpolate)("Not mapping \"{{path}}\" because it has more than one star (`*`)." /* Errors.NotMappingMultiStarPath */, { path: fromPath }));
            }
        }
    }
    catch (e_1_1) { e_1 = { error: e_1_1 }; }
    finally {
        try {
            if (_g && !_g.done && (_b = _f.return)) _b.call(_f);
        }
        finally { if (e_1) throw e_1.error; }
    }
    if (useESM) {
        jestMap['^(\\.{1,2}/.*)\\.js$'] = '$1';
    }
    return jestMap;
};
exports.pathsToModuleNameMapper = pathsToModuleNameMapper;
