"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.transformArguments = exports.FIRST_KEY_INDEX = void 0;
const _1 = require(".");
exports.FIRST_KEY_INDEX = 1;
function transformArguments(...[key, pathOrAppend, append]) {
    const args = ['JSON.STRAPPEND', key];
    if (append !== undefined && append !== null) {
        args.push(pathOrAppend, (0, _1.transformRedisJsonArgument)(append));
    }
    else {
        args.push((0, _1.transformRedisJsonArgument)(pathOrAppend));
    }
    return args;
}
exports.transformArguments = transformArguments;
