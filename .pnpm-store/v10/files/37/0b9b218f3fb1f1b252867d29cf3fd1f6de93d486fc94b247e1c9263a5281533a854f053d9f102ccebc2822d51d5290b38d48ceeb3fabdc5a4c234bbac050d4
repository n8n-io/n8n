"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.pathArg = void 0;
const platform = process.env.__TESTING_MKDIRP_PLATFORM__ || process.platform;
const path_1 = require("path");
const pathArg = (path) => {
    if (/\0/.test(path)) {
        // simulate same failure that node raises
        throw Object.assign(new TypeError('path must be a string without null bytes'), {
            path,
            code: 'ERR_INVALID_ARG_VALUE',
        });
    }
    path = (0, path_1.resolve)(path);
    if (platform === 'win32') {
        const badWinChars = /[*|"<>?:]/;
        const { root } = (0, path_1.parse)(path);
        if (badWinChars.test(path.substring(root.length))) {
            throw Object.assign(new Error('Illegal characters in path.'), {
                path,
                code: 'EINVAL',
            });
        }
    }
    return path;
};
exports.pathArg = pathArg;
//# sourceMappingURL=path-arg.js.map