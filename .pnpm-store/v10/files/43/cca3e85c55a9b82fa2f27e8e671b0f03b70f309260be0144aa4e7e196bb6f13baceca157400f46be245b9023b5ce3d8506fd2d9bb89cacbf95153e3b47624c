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
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
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
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.__requireModule = exports.importer = exports.Importer = void 0;
var logger_1 = require("./logger");
var memoize_1 = require("./memoize");
var messages_1 = require("./messages");
var version_checkers_1 = require("./version-checkers");
var logger = logger_1.rootLogger.child({ namespace: 'Importer' });
// eslint-disable-next-line @typescript-eslint/no-explicit-any
var passThru = function (action) { return function (input) {
    action();
    return input;
}; };
/**
 * @internal
 */
var Importer = exports.Importer = /** @class */ (function () {
    function Importer(_patches) {
        if (_patches === void 0) { _patches = {}; }
        this._patches = _patches;
    }
    Object.defineProperty(Importer, "instance", {
        get: function () {
            logger.debug('creating Importer singleton');
            // here we can define patches to apply to modules.
            // it could be fixes that are not deployed, or
            // abstractions so that multiple versions work the same
            return new Importer({
                '@babel/core': [passThru(version_checkers_1.VersionCheckers.babelCore.warn)],
                'babel-jest': [passThru(version_checkers_1.VersionCheckers.babelJest.warn)],
                typescript: [passThru(version_checkers_1.VersionCheckers.typescript.warn)],
                jest: [passThru(version_checkers_1.VersionCheckers.jest.warn)],
            });
        },
        enumerable: false,
        configurable: true
    });
    Importer.prototype.babelJest = function (why) {
        return this._import(why, 'babel-jest');
    };
    Importer.prototype.babelCore = function (why) {
        return this._import(why, '@babel/core');
    };
    Importer.prototype.typescript = function (why, which) {
        return this._import(why, which);
    };
    Importer.prototype.esBuild = function (why) {
        return this._import(why, 'esbuild');
    };
    Importer.prototype.tryThese = function (moduleName) {
        var fallbacks = [];
        for (var _i = 1; _i < arguments.length; _i++) {
            fallbacks[_i - 1] = arguments[_i];
        }
        var name;
        var loaded;
        var tries = __spreadArray([moduleName], __read(fallbacks), false);
        while ((name = tries.shift()) !== undefined) {
            var req = requireWrapper(name);
            // remove exports from what we're going to log
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            var contextReq = __assign({}, req);
            delete contextReq.exports;
            if (req.exists) {
                // module exists
                loaded = req;
                if (loaded.error) {
                    // require-ing it failed
                    logger.error({ requireResult: contextReq }, "failed loading module '".concat(name, "'"), loaded.error.message);
                }
                else {
                    // it has been loaded, let's patch it
                    logger.debug({ requireResult: contextReq }, 'loaded module', name);
                    loaded.exports = this._patch(name, loaded.exports);
                }
                break;
            }
            else {
                // module does not exists in the path
                logger.debug({ requireResult: contextReq }, "module '".concat(name, "' not found"));
            }
        }
        // return the loaded one, could be one that has been loaded, or one which has failed during load
        // but not one which does not exists
        return loaded;
    };
    // eslint-disable-next-line no-dupe-class-members
    Importer.prototype.tryTheseOr = function (moduleNames, missingResult, allowLoadError) {
        if (allowLoadError === void 0) { allowLoadError = false; }
        var args = Array.isArray(moduleNames) ? moduleNames : [moduleNames];
        var result = this.tryThese.apply(this, __spreadArray([], __read(args), false));
        if (!result)
            return missingResult;
        if (!result.error)
            return result.exports;
        if (allowLoadError)
            return missingResult;
        throw result.error;
    };
    Importer.prototype._patch = function (name, unpatched) {
        if (name in this._patches) {
            logger.debug('patching', name);
            return this._patches[name].reduce(function (mod, patcher) { return patcher(mod); }, unpatched);
        }
        return unpatched;
    };
    Importer.prototype._import = function (why, moduleName, _a) {
        var _b = _a === void 0 ? {} : _a, _c = _b.alternatives, alternatives = _c === void 0 ? [] : _c, _d = _b.installTip, installTip = _d === void 0 ? moduleName : _d;
        // try to load any of the alternative after trying main one
        var res = this.tryThese.apply(this, __spreadArray([moduleName], __read(alternatives), false));
        // if we could load one, return it
        if (res && res.exists) {
            if (!res.error)
                return res.exports;
            // it could not load because of a failure while importing, but it exists
            throw new Error((0, messages_1.interpolate)("Loading module {{module}} failed with error: {{error}}" /* Errors.LoadingModuleFailed */, { module: res.given, error: res.error.message }));
        }
        // if it couldn't load, build a nice error message so the user can fix it by himself
        var msg = alternatives.length ? "Unable to load any of these modules: {{module}}. {{reason}}. To fix it:\n{{fix}}" /* Errors.UnableToLoadAnyModule */ : "Unable to load the module {{module}}. {{reason}} To fix it:\n{{fix}}" /* Errors.UnableToLoadOneModule */;
        var loadModule = __spreadArray([moduleName], __read(alternatives), false).map(function (m) { return "\"".concat(m, "\""); }).join(', ');
        if (typeof installTip === 'string') {
            installTip = [{ module: installTip, label: "install \"".concat(installTip, "\"") }];
        }
        var fix = installTip
            .map(function (tip) { return "    ".concat(installTip.length === 1 ? '↳' : '•', " ").concat((0, messages_1.interpolate)("{{label}}: `npm i -D {{module}}` (or `yarn add --dev {{module}}`)" /* Helps.FixMissingModule */, tip)); })
            .join('\n');
        throw new Error((0, messages_1.interpolate)(msg, {
            module: loadModule,
            reason: why,
            fix: fix,
        }));
    };
    __decorate([
        (0, memoize_1.Memoize)(function () {
            var args = [];
            for (var _i = 0; _i < arguments.length; _i++) {
                args[_i] = arguments[_i];
            }
            return args.join(':');
        })
    ], Importer.prototype, "tryThese", null);
    __decorate([
        (0, memoize_1.Memoize)(function (name) { return name; })
    ], Importer.prototype, "_patch", null);
    __decorate([
        (0, memoize_1.Memoize)()
    ], Importer, "instance", null);
    return Importer;
}());
/**
 * @internal
 */
exports.importer = Importer.instance;
function requireWrapper(moduleName) {
    var path;
    var exists = false;
    try {
        path = resolveModule(moduleName);
        exists = true;
    }
    catch (error) {
        return { error: error, exists: exists, given: moduleName };
    }
    var result = { exists: exists, path: path, given: moduleName };
    try {
        result.exports = requireModule(path);
    }
    catch (error) {
        try {
            result.exports = requireModule(moduleName);
        }
        catch (error) {
            result.error = error;
        }
    }
    return result;
}
var requireModule = function (mod) { return require(mod); };
var resolveModule = function (mod) { return require.resolve(mod, { paths: [process.cwd(), __dirname] }); };
/**
 * @internal
 */
// so that we can test easier
function __requireModule(localRequire, localResolve) {
    requireModule = localRequire;
    resolveModule = localResolve;
}
exports.__requireModule = __requireModule;
