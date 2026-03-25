"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.transformArguments = exports.FIRST_KEY_INDEX = void 0;
exports.FIRST_KEY_INDEX = 1;
function transformArguments(key, capacity, options) {
    const args = ['CF.RESERVE', key, capacity.toString()];
    if (options?.BUCKETSIZE) {
        args.push('BUCKETSIZE', options.BUCKETSIZE.toString());
    }
    if (options?.MAXITERATIONS) {
        args.push('MAXITERATIONS', options.MAXITERATIONS.toString());
    }
    if (options?.EXPANSION) {
        args.push('EXPANSION', options.EXPANSION.toString());
    }
    return args;
}
exports.transformArguments = transformArguments;
