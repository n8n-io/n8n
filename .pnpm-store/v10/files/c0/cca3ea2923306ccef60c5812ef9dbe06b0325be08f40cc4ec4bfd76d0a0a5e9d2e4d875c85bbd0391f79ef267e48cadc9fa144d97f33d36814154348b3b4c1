"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.readFile = exports.fileIntercept = exports.filePromises = void 0;
const promises_1 = require("node:fs/promises");
exports.filePromises = {};
exports.fileIntercept = {};
const readFile = (path, options) => {
    if (exports.fileIntercept[path] !== undefined) {
        return exports.fileIntercept[path];
    }
    if (!exports.filePromises[path] || options?.ignoreCache) {
        exports.filePromises[path] = (0, promises_1.readFile)(path, "utf8");
    }
    return exports.filePromises[path];
};
exports.readFile = readFile;
