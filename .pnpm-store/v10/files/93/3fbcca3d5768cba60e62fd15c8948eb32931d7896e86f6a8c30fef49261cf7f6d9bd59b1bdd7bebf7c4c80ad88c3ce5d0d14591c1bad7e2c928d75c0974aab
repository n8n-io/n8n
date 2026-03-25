// warning: extremely hot code path.
// This has been meticulously optimized for use
// within npm install on large package trees.
// Do not edit without careful benchmarking.
export const stripTrailingSlashes = (str) => {
    let i = str.length - 1;
    let slashesStart = -1;
    while (i > -1 && str.charAt(i) === '/') {
        slashesStart = i;
        i--;
    }
    return slashesStart === -1 ? str : str.slice(0, slashesStart);
};
//# sourceMappingURL=strip-trailing-slashes.js.map