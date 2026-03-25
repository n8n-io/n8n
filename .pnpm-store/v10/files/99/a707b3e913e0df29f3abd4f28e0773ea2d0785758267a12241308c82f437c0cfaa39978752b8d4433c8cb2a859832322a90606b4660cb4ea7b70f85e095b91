"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.optArgSync = exports.optArg = exports.assertRimrafOptions = exports.isRimrafOptions = void 0;
const typeOrUndef = (val, t) => typeof val === 'undefined' || typeof val === t;
const isRimrafOptions = (o) => !!o &&
    typeof o === 'object' &&
    typeOrUndef(o.preserveRoot, 'boolean') &&
    typeOrUndef(o.tmp, 'string') &&
    typeOrUndef(o.maxRetries, 'number') &&
    typeOrUndef(o.retryDelay, 'number') &&
    typeOrUndef(o.backoff, 'number') &&
    typeOrUndef(o.maxBackoff, 'number') &&
    (typeOrUndef(o.glob, 'boolean') || (o.glob && typeof o.glob === 'object')) &&
    typeOrUndef(o.filter, 'function');
exports.isRimrafOptions = isRimrafOptions;
const assertRimrafOptions = (o) => {
    if (!(0, exports.isRimrafOptions)(o)) {
        throw new Error('invalid rimraf options');
    }
};
exports.assertRimrafOptions = assertRimrafOptions;
const optArgT = (opt) => {
    (0, exports.assertRimrafOptions)(opt);
    const { glob, ...options } = opt;
    if (!glob) {
        return options;
    }
    const globOpt = glob === true ?
        opt.signal ?
            { signal: opt.signal }
            : {}
        : opt.signal ?
            {
                signal: opt.signal,
                ...glob,
            }
            : glob;
    return {
        ...options,
        glob: {
            ...globOpt,
            // always get absolute paths from glob, to ensure
            // that we are referencing the correct thing.
            absolute: true,
            withFileTypes: false,
        },
    };
};
const optArg = (opt = {}) => optArgT(opt);
exports.optArg = optArg;
const optArgSync = (opt = {}) => optArgT(opt);
exports.optArgSync = optArgSync;
//# sourceMappingURL=opt-arg.js.map