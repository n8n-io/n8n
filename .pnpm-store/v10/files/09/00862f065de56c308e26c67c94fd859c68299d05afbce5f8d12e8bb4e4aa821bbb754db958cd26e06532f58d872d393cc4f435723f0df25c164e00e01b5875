import { assertRimrafOptions, } from './index.js';
const optArgT = (opt) => {
    assertRimrafOptions(opt);
    const { glob, ...options } = opt;
    if (!glob) {
        return options;
    }
    const globOpt = glob === true
        ? opt.signal
            ? { signal: opt.signal }
            : {}
        : opt.signal
            ? {
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