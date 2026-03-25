"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.transformArguments = exports.FIRST_KEY_INDEX = void 0;
const _1 = require(".");
exports.FIRST_KEY_INDEX = 1;
function transformArguments(key, path, json, options) {
    const args = ['JSON.SET', key, path, (0, _1.transformRedisJsonArgument)(json)];
    if (options?.NX) {
        args.push('NX');
    }
    else if (options?.XX) {
        args.push('XX');
    }
    return args;
}
exports.transformArguments = transformArguments;
