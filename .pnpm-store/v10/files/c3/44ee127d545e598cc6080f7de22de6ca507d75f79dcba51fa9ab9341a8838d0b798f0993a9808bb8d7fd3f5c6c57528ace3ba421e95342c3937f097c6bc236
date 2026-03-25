"use strict";
// This is the same as rimrafPosix, with the following changes:
//
// 1. EBUSY, ENFILE, EMFILE trigger retries and/or exponential backoff
// 2. All non-directories are removed first and then all directories are
//    removed in a second sweep.
// 3. If we hit ENOTEMPTY in the second sweep, fall back to move-remove on
//    the that folder.
//
// Note: "move then remove" is 2-10 times slower, and just as unreliable.
Object.defineProperty(exports, "__esModule", { value: true });
exports.rimrafWindowsSync = exports.rimrafWindows = void 0;
const path_1 = require("path");
const fix_eperm_js_1 = require("./fix-eperm.js");
const fs_js_1 = require("./fs.js");
const ignore_enoent_js_1 = require("./ignore-enoent.js");
const readdir_or_error_js_1 = require("./readdir-or-error.js");
const retry_busy_js_1 = require("./retry-busy.js");
const rimraf_move_remove_js_1 = require("./rimraf-move-remove.js");
const { unlink, rmdir, lstat } = fs_js_1.promises;
const rimrafWindowsFile = (0, retry_busy_js_1.retryBusy)((0, fix_eperm_js_1.fixEPERM)(unlink));
const rimrafWindowsFileSync = (0, retry_busy_js_1.retryBusySync)((0, fix_eperm_js_1.fixEPERMSync)(fs_js_1.unlinkSync));
const rimrafWindowsDirRetry = (0, retry_busy_js_1.retryBusy)((0, fix_eperm_js_1.fixEPERM)(rmdir));
const rimrafWindowsDirRetrySync = (0, retry_busy_js_1.retryBusySync)((0, fix_eperm_js_1.fixEPERMSync)(fs_js_1.rmdirSync));
const rimrafWindowsDirMoveRemoveFallback = async (path, opt) => {
    /* c8 ignore start */
    if (opt?.signal?.aborted) {
        throw opt.signal.reason;
    }
    /* c8 ignore stop */
    // already filtered, remove from options so we don't call unnecessarily
    const { filter, ...options } = opt;
    try {
        return await rimrafWindowsDirRetry(path, options);
    }
    catch (er) {
        if (er?.code === 'ENOTEMPTY') {
            return await (0, rimraf_move_remove_js_1.rimrafMoveRemove)(path, options);
        }
        throw er;
    }
};
const rimrafWindowsDirMoveRemoveFallbackSync = (path, opt) => {
    if (opt?.signal?.aborted) {
        throw opt.signal.reason;
    }
    // already filtered, remove from options so we don't call unnecessarily
    const { filter, ...options } = opt;
    try {
        return rimrafWindowsDirRetrySync(path, options);
    }
    catch (er) {
        const fer = er;
        if (fer?.code === 'ENOTEMPTY') {
            return (0, rimraf_move_remove_js_1.rimrafMoveRemoveSync)(path, options);
        }
        throw er;
    }
};
const START = Symbol('start');
const CHILD = Symbol('child');
const FINISH = Symbol('finish');
const rimrafWindows = async (path, opt) => {
    if (opt?.signal?.aborted) {
        throw opt.signal.reason;
    }
    try {
        return await rimrafWindowsDir(path, opt, await lstat(path), START);
    }
    catch (er) {
        if (er?.code === 'ENOENT')
            return true;
        throw er;
    }
};
exports.rimrafWindows = rimrafWindows;
const rimrafWindowsSync = (path, opt) => {
    if (opt?.signal?.aborted) {
        throw opt.signal.reason;
    }
    try {
        return rimrafWindowsDirSync(path, opt, (0, fs_js_1.lstatSync)(path), START);
    }
    catch (er) {
        if (er?.code === 'ENOENT')
            return true;
        throw er;
    }
};
exports.rimrafWindowsSync = rimrafWindowsSync;
const rimrafWindowsDir = async (path, opt, ent, state = START) => {
    if (opt?.signal?.aborted) {
        throw opt.signal.reason;
    }
    const entries = ent.isDirectory() ? await (0, readdir_or_error_js_1.readdirOrError)(path) : null;
    if (!Array.isArray(entries)) {
        // this can only happen if lstat/readdir lied, or if the dir was
        // swapped out with a file at just the right moment.
        /* c8 ignore start */
        if (entries) {
            if (entries.code === 'ENOENT') {
                return true;
            }
            if (entries.code !== 'ENOTDIR') {
                throw entries;
            }
        }
        /* c8 ignore stop */
        if (opt.filter && !(await opt.filter(path, ent))) {
            return false;
        }
        // is a file
        await (0, ignore_enoent_js_1.ignoreENOENT)(rimrafWindowsFile(path, opt));
        return true;
    }
    const s = state === START ? CHILD : state;
    const removedAll = (await Promise.all(entries.map(ent => rimrafWindowsDir((0, path_1.resolve)(path, ent.name), opt, ent, s)))).reduce((a, b) => a && b, true);
    if (state === START) {
        return rimrafWindowsDir(path, opt, ent, FINISH);
    }
    else if (state === FINISH) {
        if (opt.preserveRoot === false && path === (0, path_1.parse)(path).root) {
            return false;
        }
        if (!removedAll) {
            return false;
        }
        if (opt.filter && !(await opt.filter(path, ent))) {
            return false;
        }
        await (0, ignore_enoent_js_1.ignoreENOENT)(rimrafWindowsDirMoveRemoveFallback(path, opt));
    }
    return true;
};
const rimrafWindowsDirSync = (path, opt, ent, state = START) => {
    const entries = ent.isDirectory() ? (0, readdir_or_error_js_1.readdirOrErrorSync)(path) : null;
    if (!Array.isArray(entries)) {
        // this can only happen if lstat/readdir lied, or if the dir was
        // swapped out with a file at just the right moment.
        /* c8 ignore start */
        if (entries) {
            if (entries.code === 'ENOENT') {
                return true;
            }
            if (entries.code !== 'ENOTDIR') {
                throw entries;
            }
        }
        /* c8 ignore stop */
        if (opt.filter && !opt.filter(path, ent)) {
            return false;
        }
        // is a file
        (0, ignore_enoent_js_1.ignoreENOENTSync)(() => rimrafWindowsFileSync(path, opt));
        return true;
    }
    let removedAll = true;
    for (const ent of entries) {
        const s = state === START ? CHILD : state;
        const p = (0, path_1.resolve)(path, ent.name);
        removedAll = rimrafWindowsDirSync(p, opt, ent, s) && removedAll;
    }
    if (state === START) {
        return rimrafWindowsDirSync(path, opt, ent, FINISH);
    }
    else if (state === FINISH) {
        if (opt.preserveRoot === false && path === (0, path_1.parse)(path).root) {
            return false;
        }
        if (!removedAll) {
            return false;
        }
        if (opt.filter && !opt.filter(path, ent)) {
            return false;
        }
        (0, ignore_enoent_js_1.ignoreENOENTSync)(() => {
            rimrafWindowsDirMoveRemoveFallbackSync(path, opt);
        });
    }
    return true;
};
//# sourceMappingURL=rimraf-windows.js.map