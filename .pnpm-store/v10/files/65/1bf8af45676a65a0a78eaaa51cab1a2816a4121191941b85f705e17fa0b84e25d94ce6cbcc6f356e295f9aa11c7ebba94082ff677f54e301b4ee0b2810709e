// turn tar(1) style args like `C` into the more verbose things like `cwd`
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
export const isSyncFile = (o) => !!o.sync && !!o.file;
export const isAsyncFile = (o) => !o.sync && !!o.file;
export const isSyncNoFile = (o) => !!o.sync && !o.file;
export const isAsyncNoFile = (o) => !o.sync && !o.file;
export const isSync = (o) => !!o.sync;
export const isAsync = (o) => !o.sync;
export const isFile = (o) => !!o.file;
export const isNoFile = (o) => !o.file;
const dealiasKey = (k) => {
    const d = argmap.get(k);
    if (d)
        return d;
    return k;
};
export const dealias = (opt = {}) => {
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
//# sourceMappingURL=options.js.map