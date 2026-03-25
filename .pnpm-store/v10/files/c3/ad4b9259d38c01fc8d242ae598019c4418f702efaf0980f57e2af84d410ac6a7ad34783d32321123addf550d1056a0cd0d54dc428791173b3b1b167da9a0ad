import { promises, rmSync } from './fs.js';
const { rm } = promises;
export const rimrafNative = async (path, opt) => {
    await rm(path, {
        ...opt,
        force: true,
        recursive: true,
    });
    return true;
};
export const rimrafNativeSync = (path, opt) => {
    rmSync(path, {
        ...opt,
        force: true,
        recursive: true,
    });
    return true;
};
//# sourceMappingURL=rimraf-native.js.map