"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.rimrafManualSync = exports.rimrafManual = void 0;
const platform_js_1 = __importDefault(require("./platform.js"));
const rimraf_posix_js_1 = require("./rimraf-posix.js");
const rimraf_windows_js_1 = require("./rimraf-windows.js");
exports.rimrafManual = platform_js_1.default === 'win32' ? rimraf_windows_js_1.rimrafWindows : rimraf_posix_js_1.rimrafPosix;
exports.rimrafManualSync = platform_js_1.default === 'win32' ? rimraf_windows_js_1.rimrafWindowsSync : rimraf_posix_js_1.rimrafPosixSync;
//# sourceMappingURL=rimraf-manual.js.map