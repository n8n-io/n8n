const typeOrUndef = (val, t) => typeof val === 'undefined' || typeof val === t;
export const isRimrafOptions = (o) => !!o &&
    typeof o === 'object' &&
    typeOrUndef(o.preserveRoot, 'boolean') &&
    typeOrUndef(o.tmp, 'string') &&
    typeOrUndef(o.maxRetries, 'number') &&
    typeOrUndef(o.retryDelay, 'number') &&
    typeOrUndef(o.backoff, 'number') &&
    typeOrUndef(o.maxBackoff, 'number') &&
    (typeOrUndef(o.glob, 'boolean') || (o.glob && typeof o.glob === 'object')) &&
    typeOrUndef(o.filter, 'function');
export const assertRimrafOptions = (o) => {
    if (!isRimrafOptions(o)) {
        throw new Error('invalid rimraf options');
    }
};
const optArgT = (opt) => {
    assertRimrafOptions(opt);
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
export const optArg = (opt = {}) => optArgT(opt);
export const optArgSync = (opt = {}) => optArgT(opt);
//# sourceMappingURL=opt-arg.js.map