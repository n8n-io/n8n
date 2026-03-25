"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useNative = exports.useNativeSync = void 0;
const fs_1 = require("fs");
const opts_arg_js_1 = require("./opts-arg.js");
const version = process.env.__TESTING_MKDIRP_NODE_VERSION__ || process.version;
const versArr = version.replace(/^v/, '').split('.');
const hasNative = +versArr[0] > 10 || (+versArr[0] === 10 && +versArr[1] >= 12);
exports.useNativeSync = !hasNative
    ? () => false
    : (opts) => (0, opts_arg_js_1.optsArg)(opts).mkdirSync === fs_1.mkdirSync;
exports.useNative = Object.assign(!hasNative
    ? () => false
    : (opts) => (0, opts_arg_js_1.optsArg)(opts).mkdir === fs_1.mkdir, {
    sync: exports.useNativeSync,
});
//# sourceMappingURL=use-native.js.map