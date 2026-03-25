"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.transformArguments = exports.FIRST_KEY_INDEX = void 0;
exports.FIRST_KEY_INDEX = 1;
function transformArguments(key, errorRate, capacity, options) {
    const args = ['BF.RESERVE', key, errorRate.toString(), capacity.toString()];
    if (options?.EXPANSION) {
        args.push('EXPANSION', options.EXPANSION.toString());
    }
    if (options?.NONSCALING) {
        args.push('NONSCALING');
    }
    return args;
}
exports.transformArguments = transformArguments;
