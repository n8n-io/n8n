"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.makeCommand = void 0;
const options_js_1 = require("./options.js");
const makeCommand = (syncFile, asyncFile, syncNoFile, asyncNoFile, validate) => {
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
        const opt = (0, options_js_1.dealias)(opt_);
        validate?.(opt, entries);
        if ((0, options_js_1.isSyncFile)(opt)) {
            if (typeof cb === 'function') {
                throw new TypeError('callback not supported for sync tar functions');
            }
            return syncFile(opt, entries);
        }
        else if ((0, options_js_1.isAsyncFile)(opt)) {
            const p = asyncFile(opt, entries);
            // weirdness to make TS happy
            const c = cb ? cb : undefined;
            return c ? p.then(() => c(), c) : p;
        }
        else if ((0, options_js_1.isSyncNoFile)(opt)) {
            if (typeof cb === 'function') {
                throw new TypeError('callback not supported for sync tar functions');
            }
            return syncNoFile(opt, entries);
        }
        else if ((0, options_js_1.isAsyncNoFile)(opt)) {
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
exports.makeCommand = makeCommand;
//# sourceMappingURL=make-command.js.map