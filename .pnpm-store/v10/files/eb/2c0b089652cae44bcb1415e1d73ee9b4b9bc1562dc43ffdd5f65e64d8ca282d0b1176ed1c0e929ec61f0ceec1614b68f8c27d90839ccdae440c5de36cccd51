"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.transformArguments = exports.IS_READ_ONLY = exports.FIRST_KEY_INDEX = void 0;
exports.FIRST_KEY_INDEX = 1;
exports.IS_READ_ONLY = true;
function transformArguments(key, values) {
    const args = ['TDIGEST.RANK', key];
    for (const item of values) {
        args.push(item.toString());
    }
    return args;
}
exports.transformArguments = transformArguments;
