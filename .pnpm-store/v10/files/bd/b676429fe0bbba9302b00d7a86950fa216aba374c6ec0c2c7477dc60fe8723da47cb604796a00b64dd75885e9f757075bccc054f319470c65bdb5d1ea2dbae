"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.optArgSync = exports.optArg = void 0;
const index_js_1 = require("./index.js");
const optArgT = (opt) => {
    (0, index_js_1.assertRimrafOptions)(opt);
    const { glob, ...options } = opt;
    if (!glob) {
        return options;
    }
    const globOpt = glob === true
        ? opt.signal
            ? { signal: opt.signal }
            : {}
        : opt.signal
            ? {
                signal: opt.signal,
                ...glob,
            }
            : glob;
    return {
        ...options,
        glob: {
            ...globOpt,
            // always get absolute paths from glob, to ensure
            // that we are referencing the correct thing.
            absolute: true,
            withFileTypes: false,
        },
    };
};
const optArg = (opt = {}) => optArgT(opt);
exports.optArg = optArg;
const optArgSync = (opt = {}) => optArgT(opt);
exports.optArgSync = optArgSync;
//# sourceMappingURL=opt-arg.js.map