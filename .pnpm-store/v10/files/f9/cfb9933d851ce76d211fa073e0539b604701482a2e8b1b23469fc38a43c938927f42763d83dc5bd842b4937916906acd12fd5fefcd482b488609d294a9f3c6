"use strict";
// on windows, either \ or / are valid directory separators.
// on unix, \ is a valid character in filenames.
// so, on windows, and only on windows, we replace all \ chars with /,
// so that we can use / as our one and only directory separator char.
Object.defineProperty(exports, "__esModule", { value: true });
exports.normalizeWindowsPath = void 0;
const platform = process.env.TESTING_TAR_FAKE_PLATFORM || process.platform;
exports.normalizeWindowsPath = platform !== 'win32' ?
    (p) => p
    : (p) => p && p.replace(/\\/g, '/');
//# sourceMappingURL=normalize-windows-path.js.map