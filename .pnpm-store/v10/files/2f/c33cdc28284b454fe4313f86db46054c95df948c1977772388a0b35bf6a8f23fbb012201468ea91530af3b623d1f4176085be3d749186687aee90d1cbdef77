"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.mkdirp = exports.nativeSync = exports.native = exports.manualSync = exports.manual = exports.sync = exports.mkdirpSync = exports.useNativeSync = exports.useNative = exports.mkdirpNativeSync = exports.mkdirpNative = exports.mkdirpManualSync = exports.mkdirpManual = void 0;
const mkdirp_manual_js_1 = require("./mkdirp-manual.js");
const mkdirp_native_js_1 = require("./mkdirp-native.js");
const opts_arg_js_1 = require("./opts-arg.js");
const path_arg_js_1 = require("./path-arg.js");
const use_native_js_1 = require("./use-native.js");
/* c8 ignore start */
var mkdirp_manual_js_2 = require("./mkdirp-manual.js");
Object.defineProperty(exports, "mkdirpManual", { enumerable: true, get: function () { return mkdirp_manual_js_2.mkdirpManual; } });
Object.defineProperty(exports, "mkdirpManualSync", { enumerable: true, get: function () { return mkdirp_manual_js_2.mkdirpManualSync; } });
var mkdirp_native_js_2 = require("./mkdirp-native.js");
Object.defineProperty(exports, "mkdirpNative", { enumerable: true, get: function () { return mkdirp_native_js_2.mkdirpNative; } });
Object.defineProperty(exports, "mkdirpNativeSync", { enumerable: true, get: function () { return mkdirp_native_js_2.mkdirpNativeSync; } });
var use_native_js_2 = require("./use-native.js");
Object.defineProperty(exports, "useNative", { enumerable: true, get: function () { return use_native_js_2.useNative; } });
Object.defineProperty(exports, "useNativeSync", { enumerable: true, get: function () { return use_native_js_2.useNativeSync; } });
/* c8 ignore stop */
const mkdirpSync = (path, opts) => {
    path = (0, path_arg_js_1.pathArg)(path);
    const resolved = (0, opts_arg_js_1.optsArg)(opts);
    return (0, use_native_js_1.useNativeSync)(resolved)
        ? (0, mkdirp_native_js_1.mkdirpNativeSync)(path, resolved)
        : (0, mkdirp_manual_js_1.mkdirpManualSync)(path, resolved);
};
exports.mkdirpSync = mkdirpSync;
exports.sync = exports.mkdirpSync;
exports.manual = mkdirp_manual_js_1.mkdirpManual;
exports.manualSync = mkdirp_manual_js_1.mkdirpManualSync;
exports.native = mkdirp_native_js_1.mkdirpNative;
exports.nativeSync = mkdirp_native_js_1.mkdirpNativeSync;
exports.mkdirp = Object.assign(async (path, opts) => {
    path = (0, path_arg_js_1.pathArg)(path);
    const resolved = (0, opts_arg_js_1.optsArg)(opts);
    return (0, use_native_js_1.useNative)(resolved)
        ? (0, mkdirp_native_js_1.mkdirpNative)(path, resolved)
        : (0, mkdirp_manual_js_1.mkdirpManual)(path, resolved);
}, {
    mkdirpSync: exports.mkdirpSync,
    mkdirpNative: mkdirp_native_js_1.mkdirpNative,
    mkdirpNativeSync: mkdirp_native_js_1.mkdirpNativeSync,
    mkdirpManual: mkdirp_manual_js_1.mkdirpManual,
    mkdirpManualSync: mkdirp_manual_js_1.mkdirpManualSync,
    sync: exports.mkdirpSync,
    native: mkdirp_native_js_1.mkdirpNative,
    nativeSync: mkdirp_native_js_1.mkdirpNativeSync,
    manual: mkdirp_manual_js_1.mkdirpManual,
    manualSync: mkdirp_manual_js_1.mkdirpManualSync,
    useNative: use_native_js_1.useNative,
    useNativeSync: use_native_js_1.useNativeSync,
});
//# sourceMappingURL=index.js.map