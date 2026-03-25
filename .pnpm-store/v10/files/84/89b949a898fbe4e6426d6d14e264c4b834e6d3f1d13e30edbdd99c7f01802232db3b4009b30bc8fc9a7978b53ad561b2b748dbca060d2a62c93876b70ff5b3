import { mkdir, mkdirSync } from 'fs';
import { optsArg } from './opts-arg.js';
const version = process.env.__TESTING_MKDIRP_NODE_VERSION__ || process.version;
const versArr = version.replace(/^v/, '').split('.');
const hasNative = +versArr[0] > 10 || (+versArr[0] === 10 && +versArr[1] >= 12);
export const useNativeSync = !hasNative
    ? () => false
    : (opts) => optsArg(opts).mkdirSync === mkdirSync;
export const useNative = Object.assign(!hasNative
    ? () => false
    : (opts) => optsArg(opts).mkdir === mkdir, {
    sync: useNativeSync,
});
//# sourceMappingURL=use-native.js.map