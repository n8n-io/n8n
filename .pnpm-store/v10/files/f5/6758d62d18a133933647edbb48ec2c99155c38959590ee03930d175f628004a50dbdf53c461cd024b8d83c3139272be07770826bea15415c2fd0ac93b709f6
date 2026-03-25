"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ignoreENOENTSync = exports.ignoreENOENT = void 0;
const ignoreENOENT = async (p) => p.catch(er => {
    if (er.code !== 'ENOENT') {
        throw er;
    }
});
exports.ignoreENOENT = ignoreENOENT;
const ignoreENOENTSync = (fn) => {
    try {
        return fn();
    }
    catch (er) {
        if (er?.code !== 'ENOENT') {
            throw er;
        }
    }
};
exports.ignoreENOENTSync = ignoreENOENTSync;
//# sourceMappingURL=ignore-enoent.js.map