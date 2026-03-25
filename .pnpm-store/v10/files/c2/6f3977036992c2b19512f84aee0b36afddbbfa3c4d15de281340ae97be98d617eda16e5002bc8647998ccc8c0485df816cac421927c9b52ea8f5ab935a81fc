// This is the same as rimrafPosix, with the following changes:
//
// 1. EBUSY, ENFILE, EMFILE trigger retries and/or exponential backoff
// 2. All non-directories are removed first and then all directories are
//    removed in a second sweep.
// 3. If we hit ENOTEMPTY in the second sweep, fall back to move-remove on
//    the that folder.
//
// Note: "move then remove" is 2-10 times slower, and just as unreliable.
import { parse, resolve } from 'path';
import { fixEPERM, fixEPERMSync } from './fix-eperm.js';
import { lstatSync, promises, rmdirSync, unlinkSync } from './fs.js';
import { ignoreENOENT, ignoreENOENTSync } from './ignore-enoent.js';
import { readdirOrError, readdirOrErrorSync } from './readdir-or-error.js';
import { retryBusy, retryBusySync } from './retry-busy.js';
import { rimrafMoveRemove, rimrafMoveRemoveSync } from './rimraf-move-remove.js';
const { unlink, rmdir, lstat } = promises;
const rimrafWindowsFile = retryBusy(fixEPERM(unlink));
const rimrafWindowsFileSync = retryBusySync(fixEPERMSync(unlinkSync));
const rimrafWindowsDirRetry = retryBusy(fixEPERM(rmdir));
const rimrafWindowsDirRetrySync = retryBusySync(fixEPERMSync(rmdirSync));
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
            return await rimrafMoveRemove(path, options);
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
            return rimrafMoveRemoveSync(path, options);
        }
        throw er;
    }
};
const START = Symbol('start');
const CHILD = Symbol('child');
const FINISH = Symbol('finish');
export const rimrafWindows = async (path, opt) => {
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
export const rimrafWindowsSync = (path, opt) => {
    if (opt?.signal?.aborted) {
        throw opt.signal.reason;
    }
    try {
        return rimrafWindowsDirSync(path, opt, lstatSync(path), START);
    }
    catch (er) {
        if (er?.code === 'ENOENT')
            return true;
        throw er;
    }
};
const rimrafWindowsDir = async (path, opt, ent, state = START) => {
    if (opt?.signal?.aborted) {
        throw opt.signal.reason;
    }
    const entries = ent.isDirectory() ? await readdirOrError(path) : null;
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
        await ignoreENOENT(rimrafWindowsFile(path, opt));
        return true;
    }
    const s = state === START ? CHILD : state;
    const removedAll = (await Promise.all(entries.map(ent => rimrafWindowsDir(resolve(path, ent.name), opt, ent, s)))).reduce((a, b) => a && b, true);
    if (state === START) {
        return rimrafWindowsDir(path, opt, ent, FINISH);
    }
    else if (state === FINISH) {
        if (opt.preserveRoot === false && path === parse(path).root) {
            return false;
        }
        if (!removedAll) {
            return false;
        }
        if (opt.filter && !(await opt.filter(path, ent))) {
            return false;
        }
        await ignoreENOENT(rimrafWindowsDirMoveRemoveFallback(path, opt));
    }
    return true;
};
const rimrafWindowsDirSync = (path, opt, ent, state = START) => {
    const entries = ent.isDirectory() ? readdirOrErrorSync(path) : null;
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
        ignoreENOENTSync(() => rimrafWindowsFileSync(path, opt));
        return true;
    }
    let removedAll = true;
    for (const ent of entries) {
        const s = state === START ? CHILD : state;
        const p = resolve(path, ent.name);
        removedAll = rimrafWindowsDirSync(p, opt, ent, s) && removedAll;
    }
    if (state === START) {
        return rimrafWindowsDirSync(path, opt, ent, FINISH);
    }
    else if (state === FINISH) {
        if (opt.preserveRoot === false && path === parse(path).root) {
            return false;
        }
        if (!removedAll) {
            return false;
        }
        if (opt.filter && !opt.filter(path, ent)) {
            return false;
        }
        ignoreENOENTSync(() => {
            rimrafWindowsDirMoveRemoveFallbackSync(path, opt);
        });
    }
    return true;
};
//# sourceMappingURL=rimraf-windows.js.map