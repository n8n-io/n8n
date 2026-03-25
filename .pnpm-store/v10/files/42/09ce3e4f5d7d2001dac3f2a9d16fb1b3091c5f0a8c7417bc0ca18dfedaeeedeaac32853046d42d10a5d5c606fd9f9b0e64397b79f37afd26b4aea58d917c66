"use strict";
// note: max backoff is the maximum that any *single* backoff will do
Object.defineProperty(exports, "__esModule", { value: true });
exports.retryBusySync = exports.retryBusy = exports.codes = exports.MAXRETRIES = exports.RATE = exports.MAXBACKOFF = void 0;
exports.MAXBACKOFF = 200;
exports.RATE = 1.2;
exports.MAXRETRIES = 10;
exports.codes = new Set(['EMFILE', 'ENFILE', 'EBUSY']);
const retryBusy = (fn) => {
    const method = async (path, opt, backoff = 1, total = 0) => {
        const mbo = opt.maxBackoff || exports.MAXBACKOFF;
        const rate = opt.backoff || exports.RATE;
        const max = opt.maxRetries || exports.MAXRETRIES;
        let retries = 0;
        while (true) {
            try {
                return await fn(path);
            }
            catch (er) {
                const fer = er;
                if (fer?.path === path && fer?.code && exports.codes.has(fer.code)) {
                    backoff = Math.ceil(backoff * rate);
                    total = backoff + total;
                    if (total < mbo) {
                        return new Promise((res, rej) => {
                            setTimeout(() => {
                                method(path, opt, backoff, total).then(res, rej);
                            }, backoff);
                        });
                    }
                    if (retries < max) {
                        retries++;
                        continue;
                    }
                }
                throw er;
            }
        }
    };
    return method;
};
exports.retryBusy = retryBusy;
// just retries, no async so no backoff
const retryBusySync = (fn) => {
    const method = (path, opt) => {
        const max = opt.maxRetries || exports.MAXRETRIES;
        let retries = 0;
        while (true) {
            try {
                return fn(path);
            }
            catch (er) {
                const fer = er;
                if (fer?.path === path &&
                    fer?.code &&
                    exports.codes.has(fer.code) &&
                    retries < max) {
                    retries++;
                    continue;
                }
                throw er;
            }
        }
    };
    return method;
};
exports.retryBusySync = retryBusySync;
//# sourceMappingURL=retry-busy.js.map