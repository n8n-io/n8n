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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var path_1 = require("path");
var esm_resolve_1 = __importDefault(require("esm-resolve"));
var missing_files_cache_1 = __importDefault(require("./missing-files-cache"));
// fix issues with babel bundles in cjs
var esmResolve = ('default' in esm_resolve_1.default ? esm_resolve_1.default.default : esm_resolve_1.default);
var SUFFIXES = ['', '.js', '.ts', '.vue', '.jsx', '.tsx'];
function resolvePathFrom(path, from) {
    var e_1, _a;
    var _b;
    var finalPath = null;
    try {
        for (var SUFFIXES_1 = __values(SUFFIXES), SUFFIXES_1_1 = SUFFIXES_1.next(); !SUFFIXES_1_1.done; SUFFIXES_1_1 = SUFFIXES_1.next()) {
            var s = SUFFIXES_1_1.value;
            if (!finalPath) {
                try {
                    finalPath = require.resolve("".concat(path).concat(s), {
                        paths: from
                    });
                }
                catch (e) {
                    // eat the error
                }
            }
            if (!finalPath) {
                try {
                    finalPath = require.resolve((0, path_1.join)(path, "index".concat(s)), {
                        paths: from
                    });
                }
                catch (e) {
                    // eat the error
                }
            }
            if (!finalPath) {
                for (var i = 0; i < from.length; i++) {
                    try {
                        finalPath = require.resolve((0, path_1.join)(from[i], "".concat(path).concat(s)));
                        if (finalPath.length) {
                            break;
                        }
                    }
                    catch (e) {
                        // eat the error
                    }
                }
            }
            if (finalPath) {
                break;
            }
        }
    }
    catch (e_1_1) { e_1 = { error: e_1_1 }; }
    finally {
        try {
            if (SUFFIXES_1_1 && !SUFFIXES_1_1.done && (_a = SUFFIXES_1.return)) _a.call(SUFFIXES_1);
        }
        finally { if (e_1) throw e_1.error; }
    }
    try {
        var packagePath = require.resolve((0, path_1.join)(path, 'package.json'), {
            paths: from
        });
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        var pkg = require(packagePath);
        // if it is an es6 module use the module instead of commonjs
        finalPath = require.resolve((0, path_1.join)(path, pkg.module || pkg.main));
    }
    catch (e) {
        // if the error is about the package.json not being found,
        // try to resolve the path naturally
        if (e.code === 'ERR_PACKAGE_PATH_NOT_EXPORTED') {
            try {
                finalPath = (_b = esmResolve(from[0])(path)) !== null && _b !== void 0 ? _b : null;
            }
            catch (e) {
                // dismiss the error
            }
        }
        // else dismiss the error
    }
    if (!finalPath) {
        if (!missing_files_cache_1.default[path]) {
            // eslint-disable-next-line no-console
            console.warn("Neither '".concat(path, ".vue' nor '").concat(path, ".js(x)' or '").concat(path, "/index.js(x)' or '").concat(path, "/index.ts(x)' could be found in '").concat(from, "'"));
            missing_files_cache_1.default[path] = true;
        }
    }
    return finalPath;
}
exports.default = resolvePathFrom;
