"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.rimraf = exports.sync = exports.rimrafSync = exports.moveRemove = exports.moveRemoveSync = exports.posix = exports.posixSync = exports.windows = exports.windowsSync = exports.manual = exports.manualSync = exports.native = exports.nativeSync = exports.isRimrafOptions = exports.assertRimrafOptions = void 0;
const glob_1 = require("glob");
const opt_arg_js_1 = require("./opt-arg.js");
const path_arg_js_1 = __importDefault(require("./path-arg.js"));
const rimraf_manual_js_1 = require("./rimraf-manual.js");
const rimraf_move_remove_js_1 = require("./rimraf-move-remove.js");
const rimraf_native_js_1 = require("./rimraf-native.js");
const rimraf_posix_js_1 = require("./rimraf-posix.js");
const rimraf_windows_js_1 = require("./rimraf-windows.js");
const use_native_js_1 = require("./use-native.js");
var opt_arg_js_2 = require("./opt-arg.js");
Object.defineProperty(exports, "assertRimrafOptions", { enumerable: true, get: function () { return opt_arg_js_2.assertRimrafOptions; } });
Object.defineProperty(exports, "isRimrafOptions", { enumerable: true, get: function () { return opt_arg_js_2.isRimrafOptions; } });
const wrap = (fn) => async (path, opt) => {
    const options = (0, opt_arg_js_1.optArg)(opt);
    if (options.glob) {
        path = await (0, glob_1.glob)(path, options.glob);
    }
    if (Array.isArray(path)) {
        return !!(await Promise.all(path.map(p => fn((0, path_arg_js_1.default)(p, options), options)))).reduce((a, b) => a && b, true);
    }
    else {
        return !!(await fn((0, path_arg_js_1.default)(path, options), options));
    }
};
const wrapSync = (fn) => (path, opt) => {
    const options = (0, opt_arg_js_1.optArgSync)(opt);
    if (options.glob) {
        path = (0, glob_1.globSync)(path, options.glob);
    }
    if (Array.isArray(path)) {
        return !!path
            .map(p => fn((0, path_arg_js_1.default)(p, options), options))
            .reduce((a, b) => a && b, true);
    }
    else {
        return !!fn((0, path_arg_js_1.default)(path, options), options);
    }
};
exports.nativeSync = wrapSync(rimraf_native_js_1.rimrafNativeSync);
exports.native = Object.assign(wrap(rimraf_native_js_1.rimrafNative), { sync: exports.nativeSync });
exports.manualSync = wrapSync(rimraf_manual_js_1.rimrafManualSync);
exports.manual = Object.assign(wrap(rimraf_manual_js_1.rimrafManual), { sync: exports.manualSync });
exports.windowsSync = wrapSync(rimraf_windows_js_1.rimrafWindowsSync);
exports.windows = Object.assign(wrap(rimraf_windows_js_1.rimrafWindows), { sync: exports.windowsSync });
exports.posixSync = wrapSync(rimraf_posix_js_1.rimrafPosixSync);
exports.posix = Object.assign(wrap(rimraf_posix_js_1.rimrafPosix), { sync: exports.posixSync });
exports.moveRemoveSync = wrapSync(rimraf_move_remove_js_1.rimrafMoveRemoveSync);
exports.moveRemove = Object.assign(wrap(rimraf_move_remove_js_1.rimrafMoveRemove), {
    sync: exports.moveRemoveSync,
});
exports.rimrafSync = wrapSync((path, opt) => (0, use_native_js_1.useNativeSync)(opt) ?
    (0, rimraf_native_js_1.rimrafNativeSync)(path, opt)
    : (0, rimraf_manual_js_1.rimrafManualSync)(path, opt));
exports.sync = exports.rimrafSync;
const rimraf_ = wrap((path, opt) => (0, use_native_js_1.useNative)(opt) ? (0, rimraf_native_js_1.rimrafNative)(path, opt) : (0, rimraf_manual_js_1.rimrafManual)(path, opt));
exports.rimraf = Object.assign(rimraf_, {
    rimraf: rimraf_,
    sync: exports.rimrafSync,
    rimrafSync: exports.rimrafSync,
    manual: exports.manual,
    manualSync: exports.manualSync,
    native: exports.native,
    nativeSync: exports.nativeSync,
    posix: exports.posix,
    posixSync: exports.posixSync,
    windows: exports.windows,
    windowsSync: exports.windowsSync,
    moveRemove: exports.moveRemove,
    moveRemoveSync: exports.moveRemoveSync,
});
exports.rimraf.rimraf = exports.rimraf;
//# sourceMappingURL=index.js.map