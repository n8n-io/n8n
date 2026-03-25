"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.transformArguments = exports.FIRST_KEY_INDEX = void 0;
const _1 = require(".");
exports.FIRST_KEY_INDEX = 1;
function transformArguments(key, path, ...jsons) {
    const args = ['JSON.ARRAPPEND', key, path];
    for (const json of jsons) {
        args.push((0, _1.transformRedisJsonArgument)(json));
    }
    return args;
}
exports.transformArguments = transformArguments;
