"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.transformArguments = exports.IS_READ_ONLY = exports.FIRST_KEY_INDEX = void 0;
const _1 = require(".");
exports.FIRST_KEY_INDEX = 1;
exports.IS_READ_ONLY = true;
function transformArguments(key, path, json, start, stop) {
    const args = ['JSON.ARRINDEX', key, path, (0, _1.transformRedisJsonArgument)(json)];
    if (start !== undefined && start !== null) {
        args.push(start.toString());
        if (stop !== undefined && stop !== null) {
            args.push(stop.toString());
        }
    }
    return args;
}
exports.transformArguments = transformArguments;
