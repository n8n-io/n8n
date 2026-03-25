"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.findMadeSync = exports.findMade = void 0;
const path_1 = require("path");
const findMade = async (opts, parent, path) => {
    // we never want the 'made' return value to be a root directory
    if (path === parent) {
        return;
    }
    return opts.statAsync(parent).then(st => (st.isDirectory() ? path : undefined), // will fail later
    // will fail later
    er => {
        const fer = er;
        return fer && fer.code === 'ENOENT'
            ? (0, exports.findMade)(opts, (0, path_1.dirname)(parent), parent)
            : undefined;
    });
};
exports.findMade = findMade;
const findMadeSync = (opts, parent, path) => {
    if (path === parent) {
        return undefined;
    }
    try {
        return opts.statSync(parent).isDirectory() ? path : undefined;
    }
    catch (er) {
        const fer = er;
        return fer && fer.code === 'ENOENT'
            ? (0, exports.findMadeSync)(opts, (0, path_1.dirname)(parent), parent)
            : undefined;
    }
};
exports.findMadeSync = findMadeSync;
//# sourceMappingURL=find-made.js.map