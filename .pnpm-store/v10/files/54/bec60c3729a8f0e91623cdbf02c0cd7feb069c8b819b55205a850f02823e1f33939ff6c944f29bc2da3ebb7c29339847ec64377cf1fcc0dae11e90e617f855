"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.mkdirpNative = exports.mkdirpNativeSync = void 0;
const path_1 = require("path");
const find_made_js_1 = require("./find-made.js");
const mkdirp_manual_js_1 = require("./mkdirp-manual.js");
const opts_arg_js_1 = require("./opts-arg.js");
const mkdirpNativeSync = (path, options) => {
    const opts = (0, opts_arg_js_1.optsArg)(options);
    opts.recursive = true;
    const parent = (0, path_1.dirname)(path);
    if (parent === path) {
        return opts.mkdirSync(path, opts);
    }
    const made = (0, find_made_js_1.findMadeSync)(opts, path);
    try {
        opts.mkdirSync(path, opts);
        return made;
    }
    catch (er) {
        const fer = er;
        if (fer && fer.code === 'ENOENT') {
            return (0, mkdirp_manual_js_1.mkdirpManualSync)(path, opts);
        }
        else {
            throw er;
        }
    }
};
exports.mkdirpNativeSync = mkdirpNativeSync;
exports.mkdirpNative = Object.assign(async (path, options) => {
    const opts = { ...(0, opts_arg_js_1.optsArg)(options), recursive: true };
    const parent = (0, path_1.dirname)(path);
    if (parent === path) {
        return await opts.mkdirAsync(path, opts);
    }
    return (0, find_made_js_1.findMade)(opts, path).then((made) => opts
        .mkdirAsync(path, opts)
        .then(m => made || m)
        .catch(er => {
        const fer = er;
        if (fer && fer.code === 'ENOENT') {
            return (0, mkdirp_manual_js_1.mkdirpManual)(path, opts);
        }
        else {
            throw er;
        }
    }));
}, { sync: exports.mkdirpNativeSync });
//# sourceMappingURL=mkdirp-native.js.map