"use strict";
/**
 * This is the Windows implementation of isexe, which uses the file
 * extension and PATHEXT setting.
 *
 * @module
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.sync = exports.isexe = void 0;
const node_fs_1 = require("node:fs");
const promises_1 = require("node:fs/promises");
const node_path_1 = require("node:path");
/**
 * Determine whether a path is executable based on the file extension
 * and PATHEXT environment variable (or specified pathExt option)
 */
const isexe = async (path, options = {}) => {
    const { ignoreErrors = false } = options;
    try {
        return checkStat(await (0, promises_1.stat)(path), path, options);
    }
    catch (e) {
        const er = e;
        if (ignoreErrors || er.code === 'EACCES')
            return false;
        throw er;
    }
};
exports.isexe = isexe;
/**
 * Synchronously determine whether a path is executable based on the file
 * extension and PATHEXT environment variable (or specified pathExt option)
 */
const sync = (path, options = {}) => {
    const { ignoreErrors = false } = options;
    try {
        return checkStat((0, node_fs_1.statSync)(path), path, options);
    }
    catch (e) {
        const er = e;
        if (ignoreErrors || er.code === 'EACCES')
            return false;
        throw er;
    }
};
exports.sync = sync;
const checkPathExt = (path, options) => {
    const { pathExt = process.env.PATHEXT || '' } = options;
    const peSplit = pathExt.split(node_path_1.delimiter);
    if (peSplit.indexOf('') !== -1) {
        return true;
    }
    for (const pes of peSplit) {
        const p = pes.toLowerCase();
        const ext = path.substring(path.length - p.length).toLowerCase();
        if (p && ext === p) {
            return true;
        }
    }
    return false;
};
const checkStat = (stat, path, options) => stat.isFile() && checkPathExt(path, options);
//# sourceMappingURL=win32.js.map