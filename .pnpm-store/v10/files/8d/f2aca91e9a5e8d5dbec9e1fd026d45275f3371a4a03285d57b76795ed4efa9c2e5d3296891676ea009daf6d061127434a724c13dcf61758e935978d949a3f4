import { chmodSync, promises } from './fs.js';
const { chmod } = promises;
export const fixEPERM = (fn) => async (path) => {
    try {
        return await fn(path);
    }
    catch (er) {
        const fer = er;
        if (fer?.code === 'ENOENT') {
            return;
        }
        if (fer?.code === 'EPERM') {
            try {
                await chmod(path, 0o666);
            }
            catch (er2) {
                const fer2 = er2;
                if (fer2?.code === 'ENOENT') {
                    return;
                }
                throw er;
            }
            return await fn(path);
        }
        throw er;
    }
};
export const fixEPERMSync = (fn) => (path) => {
    try {
        return fn(path);
    }
    catch (er) {
        const fer = er;
        if (fer?.code === 'ENOENT') {
            return;
        }
        if (fer?.code === 'EPERM') {
            try {
                chmodSync(path, 0o666);
            }
            catch (er2) {
                const fer2 = er2;
                if (fer2?.code === 'ENOENT') {
                    return;
                }
                throw er;
            }
            return fn(path);
        }
        throw er;
    }
};
//# sourceMappingURL=fix-eperm.js.map