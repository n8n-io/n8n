"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isAbsolute = exports.filepathToName = exports.toPortablePath = void 0;
const StringUtils_1 = require("./StringUtils");
const WINDOWS_PATH_REGEXP = /^([a-zA-Z]:.*)$/;
const UNC_WINDOWS_PATH_REGEXP = /^\\\\(\.\\)?(.*)$/;
function toPortablePath(filepath) {
    if (process.platform !== `win32`)
        return filepath;
    if (filepath.match(WINDOWS_PATH_REGEXP))
        filepath = filepath.replace(WINDOWS_PATH_REGEXP, `/$1`);
    else if (filepath.match(UNC_WINDOWS_PATH_REGEXP))
        filepath = filepath.replace(UNC_WINDOWS_PATH_REGEXP, (match, p1, p2) => `/unc/${p1 ? `.dot/` : ``}${p2}`);
    return filepath.replace(/\\/g, `/`);
}
exports.toPortablePath = toPortablePath;
/**
 * Create deterministic valid database name (class, database) of fixed length from any filepath. Equivalent paths for windows/posix systems should
 * be equivalent to enable portability
 */
function filepathToName(filepath) {
    const uniq = toPortablePath(filepath).toLowerCase();
    return (0, StringUtils_1.hash)(uniq, { length: 63 });
}
exports.filepathToName = filepathToName;
/**
 * Cross platform isAbsolute
 */
function isAbsolute(filepath) {
    return !!filepath.match(/^(?:[a-z]:|[\\]|[/])/i);
}
exports.isAbsolute = isAbsolute;

//# sourceMappingURL=PathUtils.js.map
