// the simple recursive removal, where unlink and rmdir are atomic
// Note that this approach does NOT work on Windows!
// We stat first and only unlink if the Dirent isn't a directory,
// because sunos will let root unlink a directory, and some
// SUPER weird breakage happens as a result.
import { lstatSync, promises, rmdirSync, unlinkSync } from './fs.js';
const { lstat, rmdir, unlink } = promises;
import { parse, resolve } from 'path';
import { readdirOrError, readdirOrErrorSync } from './readdir-or-error.js';
import { ignoreENOENT, ignoreENOENTSync } from './ignore-enoent.js';
export const rimrafPosix = async (path, opt) => {
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
export const rimrafPosixSync = (path, opt) => {
    if (opt?.signal?.aborted) {
        throw opt.signal.reason;
    }
    try {
        return rimrafPosixDirSync(path, opt, lstatSync(path));
    }
    catch (er) {
        if (er?.code === 'ENOENT')
            return true;
        throw er;
    }
};
const rimrafPosixDir = async (path, opt, ent) => {
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
        await ignoreENOENT(unlink(path));
        return true;
    }
    const removedAll = (await Promise.all(entries.map(ent => rimrafPosixDir(resolve(path, ent.name), opt, ent)))).reduce((a, b) => a && b, true);
    if (!removedAll) {
        return false;
    }
    // we don't ever ACTUALLY try to unlink /, because that can never work
    // but when preserveRoot is false, we could be operating on it.
    // No need to check if preserveRoot is not false.
    if (opt.preserveRoot === false && path === parse(path).root) {
        return false;
    }
    if (opt.filter && !(await opt.filter(path, ent))) {
        return false;
    }
    await ignoreENOENT(rmdir(path));
    return true;
};
const rimrafPosixDirSync = (path, opt, ent) => {
    if (opt?.signal?.aborted) {
        throw opt.signal.reason;
    }
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
        ignoreENOENTSync(() => unlinkSync(path));
        return true;
    }
    let removedAll = true;
    for (const ent of entries) {
        const p = resolve(path, ent.name);
        removedAll = rimrafPosixDirSync(p, opt, ent) && removedAll;
    }
    if (opt.preserveRoot === false && path === parse(path).root) {
        return false;
    }
    if (!removedAll) {
        return false;
    }
    if (opt.filter && !opt.filter(path, ent)) {
        return false;
    }
    ignoreENOENTSync(() => rmdirSync(path));
    return true;
};
//# sourceMappingURL=rimraf-posix.js.map