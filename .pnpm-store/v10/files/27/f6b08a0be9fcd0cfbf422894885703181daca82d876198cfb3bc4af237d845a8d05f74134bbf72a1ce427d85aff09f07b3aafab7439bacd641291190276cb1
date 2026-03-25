"use strict";
// the simple recursive removal, where unlink and rmdir are atomic
// Note that this approach does NOT work on Windows!
// We stat first and only unlink if the Dirent isn't a directory,
// because sunos will let root unlink a directory, and some
// SUPER weird breakage happens as a result.
Object.defineProperty(exports, "__esModule", { value: true });
exports.rimrafPosixSync = exports.rimrafPosix = void 0;
const fs_js_1 = require("./fs.js");
const { lstat, rmdir, unlink } = fs_js_1.promises;
const path_1 = require("path");
const readdir_or_error_js_1 = require("./readdir-or-error.js");
const ignore_enoent_js_1 = require("./ignore-enoent.js");
const rimrafPosix = async (path, opt) => {
    if (opt?.signal?.aborted) {
        throw opt.signal.reason;
    }
    try {
        return await rimrafPosixDir(path, opt, await lstat(path));
    }
    catch (er) {
        if (er?.code === 'ENOENT')
            return true;
        throw er;
    }
};
exports.rimrafPosix = rimrafPosix;
const rimrafPosixSync = (path, opt) => {
    if (opt?.signal?.aborted) {
        throw opt.signal.reason;
    }
    try {
        return rimrafPosixDirSync(path, opt, (0, fs_js_1.lstatSync)(path));
    }
    catch (er) {
        if (er?.code === 'ENOENT')
            return true;
        throw er;
    }
};
exports.rimrafPosixSync = rimrafPosixSync;
const rimrafPosixDir = async (path, opt, ent) => {
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
        await (0, ignore_enoent_js_1.ignoreENOENT)(unlink(path));
        return true;
    }
    const removedAll = (await Promise.all(entries.map(ent => rimrafPosixDir((0, path_1.resolve)(path, ent.name), opt, ent)))).reduce((a, b) => a && b, true);
    if (!removedAll) {
        return false;
    }
    // we don't ever ACTUALLY try to unlink /, because that can never work
    // but when preserveRoot is false, we could be operating on it.
    // No need to check if preserveRoot is not false.
    if (opt.preserveRoot === false && path === (0, path_1.parse)(path).root) {
        return false;
    }
    if (opt.filter && !(await opt.filter(path, ent))) {
        return false;
    }
    await (0, ignore_enoent_js_1.ignoreENOENT)(rmdir(path));
    return true;
};
const rimrafPosixDirSync = (path, opt, ent) => {
    if (opt?.signal?.aborted) {
        throw opt.signal.reason;
    }
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
        (0, ignore_enoent_js_1.ignoreENOENTSync)(() => (0, fs_js_1.unlinkSync)(path));
        return true;
    }
    let removedAll = true;
    for (const ent of entries) {
        const p = (0, path_1.resolve)(path, ent.name);
        removedAll = rimrafPosixDirSync(p, opt, ent) && removedAll;
    }
    if (opt.preserveRoot === false && path === (0, path_1.parse)(path).root) {
        return false;
    }
    if (!removedAll) {
        return false;
    }
    if (opt.filter && !opt.filter(path, ent)) {
        return false;
    }
    (0, ignore_enoent_js_1.ignoreENOENTSync)(() => (0, fs_js_1.rmdirSync)(path));
    return true;
};
//# sourceMappingURL=rimraf-posix.js.map