const platform = process.env.__TESTING_MKDIRP_PLATFORM__ || process.platform;
import { parse, resolve } from 'path';
export const pathArg = (path) => {
    if (/\0/.test(path)) {
        // simulate same failure that node raises
        throw Object.assign(new TypeError('path must be a string without null bytes'), {
            path,
            code: 'ERR_INVALID_ARG_VALUE',
        });
    }
    path = resolve(path);
    if (platform === 'win32') {
        const badWinChars = /[*|"<>?:]/;
        const { root } = parse(path);
        if (badWinChars.test(path.substring(root.length))) {
            throw Object.assign(new Error('Illegal characters in path.'), {
                path,
                code: 'EINVAL',
            });
        }
    }
    return path;
};
//# sourceMappingURL=path-arg.js.map