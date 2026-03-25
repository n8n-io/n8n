"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.fixEPERMSync = exports.fixEPERM = void 0;
const fs_js_1 = require("./fs.js");
const { chmod } = fs_js_1.promises;
const fixEPERM = (fn) => async (path) => {
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
exports.fixEPERM = fixEPERM;
const fixEPERMSync = (fn) => (path) => {
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
                (0, fs_js_1.chmodSync)(path, 0o666);
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
exports.fixEPERMSync = fixEPERMSync;
//# sourceMappingURL=fix-eperm.js.map