import { deepMerge, isObjectNotArray } from './deep-merge.js';
export function applyDefault(defaultOptions, userOptions) {
    const options = structuredClone(defaultOptions);
    if (userOptions == null) {
        return options;
    }
    for (const [i, opt] of options.entries()) {
        if (userOptions[i] !== undefined) {
            const userOpt = userOptions[i];
            options[i] =
                isObjectNotArray(userOpt) && isObjectNotArray(opt)
                    ? deepMerge(opt, userOpt)
                    : userOpt;
        }
    }
    return options;
}
//# sourceMappingURL=apply-default.js.map