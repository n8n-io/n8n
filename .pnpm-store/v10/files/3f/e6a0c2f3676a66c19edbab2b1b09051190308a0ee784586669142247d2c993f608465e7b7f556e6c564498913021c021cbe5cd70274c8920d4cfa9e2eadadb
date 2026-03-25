"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.transformArguments = exports.IS_READ_ONLY = exports.FIRST_KEY_INDEX = void 0;
exports.FIRST_KEY_INDEX = 1;
exports.IS_READ_ONLY = true;
function transformArguments(key, bit, start, end, mode) {
    const args = ['BITPOS', key, bit.toString()];
    if (typeof start === 'number') {
        args.push(start.toString());
    }
    if (typeof end === 'number') {
        args.push(end.toString());
    }
    if (mode) {
        args.push(mode);
    }
    return args;
}
exports.transformArguments = transformArguments;
