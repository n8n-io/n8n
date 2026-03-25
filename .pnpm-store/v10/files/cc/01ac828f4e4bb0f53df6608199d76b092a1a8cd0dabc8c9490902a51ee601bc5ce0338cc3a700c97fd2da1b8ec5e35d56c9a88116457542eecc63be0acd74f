import { dealias, isAsyncFile, isAsyncNoFile, isSyncFile, isSyncNoFile, } from './options.js';
export const makeCommand = (syncFile, asyncFile, syncNoFile, asyncNoFile, validate) => {
    return Object.assign((opt_ = [], entries, cb) => {
        if (Array.isArray(opt_)) {
            entries = opt_;
            opt_ = {};
        }
        if (typeof entries === 'function') {
            cb = entries;
            entries = undefined;
        }
        if (!entries) {
            entries = [];
        }
        else {
            entries = Array.from(entries);
        }
        const opt = dealias(opt_);
        validate?.(opt, entries);
        if (isSyncFile(opt)) {
            if (typeof cb === 'function') {
                throw new TypeError('callback not supported for sync tar functions');
            }
            return syncFile(opt, entries);
        }
        else if (isAsyncFile(opt)) {
            const p = asyncFile(opt, entries);
            // weirdness to make TS happy
            const c = cb ? cb : undefined;
            return c ? p.then(() => c(), c) : p;
        }
        else if (isSyncNoFile(opt)) {
            if (typeof cb === 'function') {
                throw new TypeError('callback not supported for sync tar functions');
            }
            return syncNoFile(opt, entries);
        }
        else if (isAsyncNoFile(opt)) {
            if (typeof cb === 'function') {
                throw new TypeError('callback only supported with file option');
            }
            return asyncNoFile(opt, entries);
            /* c8 ignore start */
        }
        else {
            throw new Error('impossible options??');
        }
        /* c8 ignore stop */
    }, {
        syncFile,
        asyncFile,
        syncNoFile,
        asyncNoFile,
        validate,
    });
};
//# sourceMappingURL=make-command.js.map