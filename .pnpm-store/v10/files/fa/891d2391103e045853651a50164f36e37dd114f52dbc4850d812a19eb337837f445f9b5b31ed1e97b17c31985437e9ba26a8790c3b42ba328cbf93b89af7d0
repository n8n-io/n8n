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
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var resolveAliases_1 = __importDefault(require("../utils/resolveAliases"));
var resolvePathFrom_1 = __importDefault(require("../utils/resolvePathFrom"));
function makePathResolver(refDirName, aliases, modules) {
    /**
     * Emulate the module import logic as much as necessary to resolve a module containing the
     * interface or type.
     *
     * @param base Path to the file that is importing the module
     * @param module Relative path to the module
     * @returns The absolute path to the file that contains the module to be imported
     */
    return function (filePath, originalDirNameOverride) {
        return (0, resolvePathFrom_1.default)((0, resolveAliases_1.default)(filePath, aliases || {}, refDirName), __spreadArray([
            originalDirNameOverride || refDirName
        ], __read((modules || [])), false));
    };
}
exports.default = makePathResolver;
