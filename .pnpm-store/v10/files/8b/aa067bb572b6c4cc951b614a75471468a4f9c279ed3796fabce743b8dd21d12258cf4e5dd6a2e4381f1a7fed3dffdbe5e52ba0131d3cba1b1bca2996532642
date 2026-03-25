"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const path_1 = require("path");
const util_1 = require("util");
const platform_js_1 = __importDefault(require("./platform.js"));
const pathArg = (path, opt = {}) => {
    const type = typeof path;
    if (type !== 'string') {
        const ctor = path && type === 'object' && path.constructor;
        const received = ctor && ctor.name
            ? `an instance of ${ctor.name}`
            : type === 'object'
                ? (0, util_1.inspect)(path)
                : `type ${type} ${path}`;
        const msg = 'The "path" argument must be of type string. ' + `Received ${received}`;
        throw Object.assign(new TypeError(msg), {
            path,
            code: 'ERR_INVALID_ARG_TYPE',
        });
    }
    if (/\0/.test(path)) {
        // simulate same failure that node raises
        const msg = 'path must be a string without null bytes';
        throw Object.assign(new TypeError(msg), {
            path,
            code: 'ERR_INVALID_ARG_VALUE',
        });
    }
    path = (0, path_1.resolve)(path);
    const { root } = (0, path_1.parse)(path);
    if (path === root && opt.preserveRoot !== false) {
        const msg = 'refusing to remove root directory without preserveRoot:false';
        throw Object.assign(new Error(msg), {
            path,
            code: 'ERR_PRESERVE_ROOT',
        });
    }
    if (platform_js_1.default === 'win32') {
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
exports.default = pathArg;
//# sourceMappingURL=path-arg.js.map