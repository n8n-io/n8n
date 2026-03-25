"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.transformArguments = exports.FIRST_KEY_INDEX = void 0;
const _1 = require(".");
exports.FIRST_KEY_INDEX = 1;
function transformArguments(items) {
    const args = new Array(1 + items.length * 3);
    args[0] = 'JSON.MSET';
    let argsIndex = 1;
    for (let i = 0; i < items.length; i++) {
        const item = items[i];
        args[argsIndex++] = item.key;
        args[argsIndex++] = item.path;
        args[argsIndex++] = (0, _1.transformRedisJsonArgument)(item.value);
    }
    return args;
}
exports.transformArguments = transformArguments;
