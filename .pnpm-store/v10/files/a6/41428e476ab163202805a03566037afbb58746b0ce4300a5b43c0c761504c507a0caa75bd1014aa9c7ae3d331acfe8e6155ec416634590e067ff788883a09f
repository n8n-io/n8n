"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.stripAbsolutePath = void 0;
// unix absolute paths are also absolute on win32, so we use this for both
const node_path_1 = require("node:path");
const { isAbsolute, parse } = node_path_1.win32;
// returns [root, stripped]
// Note that windows will think that //x/y/z/a has a "root" of //x/y, and in
// those cases, we want to sanitize it to x/y/z/a, not z/a, so we strip /
// explicitly if it's the first character.
// drive-specific relative paths on Windows get their root stripped off even
// though they are not absolute, so `c:../foo` becomes ['c:', '../foo']
const stripAbsolutePath = (path) => {
    let r = '';
    let parsed = parse(path);
    while (isAbsolute(path) || parsed.root) {
        // windows will think that //x/y/z has a "root" of //x/y/
        // but strip the //?/C:/ off of //?/C:/path
        const root = path.charAt(0) === '/' && path.slice(0, 4) !== '//?/' ?
            '/'
            : parsed.root;
        path = path.slice(root.length);
        r += root;
        parsed = parse(path);
    }
    return [r, path];
};
exports.stripAbsolutePath = stripAbsolutePath;
//# sourceMappingURL=strip-absolute-path.js.map