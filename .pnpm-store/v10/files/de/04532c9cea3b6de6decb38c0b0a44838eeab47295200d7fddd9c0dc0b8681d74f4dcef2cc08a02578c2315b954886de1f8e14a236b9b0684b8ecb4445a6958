"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.transformArguments = exports.IS_READ_ONLY = exports.FIRST_KEY_INDEX = void 0;
exports.FIRST_KEY_INDEX = 1;
exports.IS_READ_ONLY = true;
function transformArguments(key, range) {
    const args = ['BITCOUNT', key];
    if (range) {
        args.push(range.start.toString(), range.end.toString());
        if (range.mode) {
            args.push(range.mode);
        }
    }
    return args;
}
exports.transformArguments = transformArguments;
