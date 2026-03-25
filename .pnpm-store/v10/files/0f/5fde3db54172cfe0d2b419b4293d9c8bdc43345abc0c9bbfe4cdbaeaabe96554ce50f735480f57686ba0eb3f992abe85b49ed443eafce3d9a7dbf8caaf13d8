"use strict";
/**
 * This is the Posix implementation of isexe, which uses the file
 * mode and uid/gid values.
 *
 * @module
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.sync = exports.isexe = void 0;
const fs_1 = require("fs");
const promises_1 = require("fs/promises");
/**
 * Determine whether a path is executable according to the mode and
 * current (or specified) user and group IDs.
 */
const isexe = async (path, options = {}) => {
    const { ignoreErrors = false } = options;
    try {
        return checkStat(await (0, promises_1.stat)(path), options);
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
 * Synchronously determine whether a path is executable according to
 * the mode and current (or specified) user and group IDs.
 */
const sync = (path, options = {}) => {
    const { ignoreErrors = false } = options;
    try {
        return checkStat((0, fs_1.statSync)(path), options);
    }
    catch (e) {
        const er = e;
        if (ignoreErrors || er.code === 'EACCES')
            return false;
        throw er;
    }
};
exports.sync = sync;
const checkStat = (stat, options) => stat.isFile() && checkMode(stat, options);
const checkMode = (stat, options) => {
    const myUid = options.uid ?? process.getuid?.();
    const myGroups = options.groups ?? process.getgroups?.() ?? [];
    const myGid = options.gid ?? process.getgid?.() ?? myGroups[0];
    if (myUid === undefined || myGid === undefined) {
        throw new Error('cannot get uid or gid');
    }
    const groups = new Set([myGid, ...myGroups]);
    const mod = stat.mode;
    const uid = stat.uid;
    const gid = stat.gid;
    const u = parseInt('100', 8);
    const g = parseInt('010', 8);
    const o = parseInt('001', 8);
    const ug = u | g;
    return !!(mod & o ||
        (mod & g && groups.has(gid)) ||
        (mod & u && uid === myUid) ||
        (mod & ug && myUid === 0));
};
//# sourceMappingURL=posix.js.map