import platform from './platform.js';
const version = process.env.__TESTING_RIMRAF_NODE_VERSION__ || process.version;
const versArr = version.replace(/^v/, '').split('.');
/* c8 ignore start */
const [major = 0, minor = 0] = versArr.map(v => parseInt(v, 10));
/* c8 ignore stop */
const hasNative = major > 14 || (major === 14 && minor >= 14);
// we do NOT use native by default on Windows, because Node's native
// rm implementation is less advanced.  Change this code if that changes.
export const useNative = !hasNative || platform === 'win32' ?
    () => false
    : opt => !opt?.signal && !opt?.filter;
export const useNativeSync = !hasNative || platform === 'win32' ?
    () => false
    : opt => !opt?.signal && !opt?.filter;
//# sourceMappingURL=use-native.js.map