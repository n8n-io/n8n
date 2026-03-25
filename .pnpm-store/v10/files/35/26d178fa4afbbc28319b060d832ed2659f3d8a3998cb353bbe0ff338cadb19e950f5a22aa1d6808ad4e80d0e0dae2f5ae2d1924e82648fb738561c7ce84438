"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.transformArguments = exports.FIRST_KEY_INDEX = void 0;
const _1 = require(".");
exports.FIRST_KEY_INDEX = 1;
function transformArguments(key, path, json) {
    return ['JSON.MERGE', key, path, (0, _1.transformRedisJsonArgument)(json)];
}
exports.transformArguments = transformArguments;
