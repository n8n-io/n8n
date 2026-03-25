"use strict";
// turn tar(1) style args like `C` into the more verbose things like `cwd`
Object.defineProperty(exports, "__esModule", { value: true });
exports.dealias = exports.isNoFile = exports.isFile = exports.isAsync = exports.isSync = exports.isAsyncNoFile = exports.isSyncNoFile = exports.isAsyncFile = exports.isSyncFile = void 0;
const argmap = new Map([
    ['C', 'cwd'],
    ['f', 'file'],
    ['z', 'gzip'],
    ['P', 'preservePaths'],
    ['U', 'unlink'],
    ['strip-components', 'strip'],
    ['stripComponents', 'strip'],
    ['keep-newer', 'newer'],
    ['keepNewer', 'newer'],
    ['keep-newer-files', 'newer'],
    ['keepNewerFiles', 'newer'],
    ['k', 'keep'],
    ['keep-existing', 'keep'],
    ['keepExisting', 'keep'],
    ['m', 'noMtime'],
    ['no-mtime', 'noMtime'],
    ['p', 'preserveOwner'],
    ['L', 'follow'],
    ['h', 'follow'],
    ['onentry', 'onReadEntry'],
]);
const isSyncFile = (o) => !!o.sync && !!o.file;
exports.isSyncFile = isSyncFile;
const isAsyncFile = (o) => !o.sync && !!o.file;
exports.isAsyncFile = isAsyncFile;
const isSyncNoFile = (o) => !!o.sync && !o.file;
exports.isSyncNoFile = isSyncNoFile;
const isAsyncNoFile = (o) => !o.sync && !o.file;
exports.isAsyncNoFile = isAsyncNoFile;
const isSync = (o) => !!o.sync;
exports.isSync = isSync;
const isAsync = (o) => !o.sync;
exports.isAsync = isAsync;
const isFile = (o) => !!o.file;
exports.isFile = isFile;
const isNoFile = (o) => !o.file;
exports.isNoFile = isNoFile;
const dealiasKey = (k) => {
    const d = argmap.get(k);
    if (d)
        return d;
    return k;
};
const dealias = (opt = {}) => {
    if (!opt)
        return {};
    const result = {};
    for (const [key, v] of Object.entries(opt)) {
        // TS doesn't know that aliases are going to always be the same type
        const k = dealiasKey(key);
        result[k] = v;
    }
    // affordance for deprecated noChmod -> chmod
    if (result.chmod === undefined && result.noChmod === false) {
        result.chmod = true;
    }
    delete result.noChmod;
    return result;
};
exports.dealias = dealias;
//# sourceMappingURL=options.js.map