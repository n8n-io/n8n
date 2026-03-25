import { mkdirpManual, mkdirpManualSync } from './mkdirp-manual.js';
import { mkdirpNative, mkdirpNativeSync } from './mkdirp-native.js';
import { optsArg } from './opts-arg.js';
import { pathArg } from './path-arg.js';
import { useNative, useNativeSync } from './use-native.js';
/* c8 ignore start */
export { mkdirpManual, mkdirpManualSync } from './mkdirp-manual.js';
export { mkdirpNative, mkdirpNativeSync } from './mkdirp-native.js';
export { useNative, useNativeSync } from './use-native.js';
/* c8 ignore stop */
export const mkdirpSync = (path, opts) => {
    path = pathArg(path);
    const resolved = optsArg(opts);
    return useNativeSync(resolved)
        ? mkdirpNativeSync(path, resolved)
        : mkdirpManualSync(path, resolved);
};
export const sync = mkdirpSync;
export const manual = mkdirpManual;
export const manualSync = mkdirpManualSync;
export const native = mkdirpNative;
export const nativeSync = mkdirpNativeSync;
export const mkdirp = Object.assign(async (path, opts) => {
    path = pathArg(path);
    const resolved = optsArg(opts);
    return useNative(resolved)
        ? mkdirpNative(path, resolved)
        : mkdirpManual(path, resolved);
}, {
    mkdirpSync,
    mkdirpNative,
    mkdirpNativeSync,
    mkdirpManual,
    mkdirpManualSync,
    sync: mkdirpSync,
    native: mkdirpNative,
    nativeSync: mkdirpNativeSync,
    manual: mkdirpManual,
    manualSync: mkdirpManualSync,
    useNative,
    useNativeSync,
});
//# sourceMappingURL=index.js.map