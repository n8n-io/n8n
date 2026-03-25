"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.readdirOrErrorSync = exports.readdirOrError = void 0;
// returns an array of entries if readdir() works,
// or the error that readdir() raised if not.
const fs_js_1 = require("./fs.js");
const { readdir } = fs_js_1.promises;
const readdirOrError = (path) => readdir(path).catch(er => er);
exports.readdirOrError = readdirOrError;
const readdirOrErrorSync = (path) => {
    try {
        return (0, fs_js_1.readdirSync)(path);
    }
    catch (er) {
        return er;
    }
};
exports.readdirOrErrorSync = readdirOrErrorSync;
//# sourceMappingURL=readdir-or-error.js.map