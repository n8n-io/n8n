export const ignoreENOENT = async (p) => p.catch(er => {
    if (er.code !== 'ENOENT') {
        throw er;
    }
});
export const ignoreENOENTSync = (fn) => {
    try {
        return fn();
    }
    catch (er) {
        if (er?.code !== 'ENOENT') {
            throw er;
        }
    }
};
//# sourceMappingURL=ignore-enoent.js.map