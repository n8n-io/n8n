"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.transformArguments = exports.IS_READ_ONLY = exports.FIRST_KEY_INDEX = void 0;
exports.FIRST_KEY_INDEX = 1;
exports.IS_READ_ONLY = true;
function transformArguments(key, element, options) {
    const args = ['LPOS', key, element];
    if (typeof options?.RANK === 'number') {
        args.push('RANK', options.RANK.toString());
    }
    if (typeof options?.MAXLEN === 'number') {
        args.push('MAXLEN', options.MAXLEN.toString());
    }
    return args;
}
exports.transformArguments = transformArguments;
