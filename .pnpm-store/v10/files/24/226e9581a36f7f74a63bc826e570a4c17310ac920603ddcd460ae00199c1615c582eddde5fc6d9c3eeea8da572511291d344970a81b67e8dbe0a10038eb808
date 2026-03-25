import { glob, globSync } from 'glob';
import { optArg, optArgSync, } from './opt-arg.js';
import pathArg from './path-arg.js';
import { rimrafManual, rimrafManualSync } from './rimraf-manual.js';
import { rimrafMoveRemove, rimrafMoveRemoveSync } from './rimraf-move-remove.js';
import { rimrafNative, rimrafNativeSync } from './rimraf-native.js';
import { rimrafPosix, rimrafPosixSync } from './rimraf-posix.js';
import { rimrafWindows, rimrafWindowsSync } from './rimraf-windows.js';
import { useNative, useNativeSync } from './use-native.js';
export { assertRimrafOptions, isRimrafOptions, } from './opt-arg.js';
const wrap = (fn) => async (path, opt) => {
    const options = optArg(opt);
    if (options.glob) {
        path = await glob(path, options.glob);
    }
    if (Array.isArray(path)) {
        return !!(await Promise.all(path.map(p => fn(pathArg(p, options), options)))).reduce((a, b) => a && b, true);
    }
    else {
        return !!(await fn(pathArg(path, options), options));
    }
};
const wrapSync = (fn) => (path, opt) => {
    const options = optArgSync(opt);
    if (options.glob) {
        path = globSync(path, options.glob);
    }
    if (Array.isArray(path)) {
        return !!path
            .map(p => fn(pathArg(p, options), options))
            .reduce((a, b) => a && b, true);
    }
    else {
        return !!fn(pathArg(path, options), options);
    }
};
export const nativeSync = wrapSync(rimrafNativeSync);
export const native = Object.assign(wrap(rimrafNative), { sync: nativeSync });
export const manualSync = wrapSync(rimrafManualSync);
export const manual = Object.assign(wrap(rimrafManual), { sync: manualSync });
export const windowsSync = wrapSync(rimrafWindowsSync);
export const windows = Object.assign(wrap(rimrafWindows), { sync: windowsSync });
export const posixSync = wrapSync(rimrafPosixSync);
export const posix = Object.assign(wrap(rimrafPosix), { sync: posixSync });
export const moveRemoveSync = wrapSync(rimrafMoveRemoveSync);
export const moveRemove = Object.assign(wrap(rimrafMoveRemove), {
    sync: moveRemoveSync,
});
export const rimrafSync = wrapSync((path, opt) => useNativeSync(opt) ?
    rimrafNativeSync(path, opt)
    : rimrafManualSync(path, opt));
export const sync = rimrafSync;
const rimraf_ = wrap((path, opt) => useNative(opt) ? rimrafNative(path, opt) : rimrafManual(path, opt));
export const rimraf = Object.assign(rimraf_, {
    rimraf: rimraf_,
    sync: rimrafSync,
    rimrafSync: rimrafSync,
    manual,
    manualSync,
    native,
    nativeSync,
    posix,
    posixSync,
    windows,
    windowsSync,
    moveRemove,
    moveRemoveSync,
});
rimraf.rimraf = rimraf;
//# sourceMappingURL=index.js.map