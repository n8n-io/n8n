"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.transformArguments = exports.FIRST_KEY_INDEX = void 0;
exports.FIRST_KEY_INDEX = 1;
function transformArguments(key, ttl, serializedValue, options) {
    const args = ['RESTORE', key, ttl.toString(), serializedValue];
    if (options?.REPLACE) {
        args.push('REPLACE');
    }
    if (options?.ABSTTL) {
        args.push('ABSTTL');
    }
    if (options?.IDLETIME) {
        args.push('IDLETIME', options.IDLETIME.toString());
    }
    if (options?.FREQ) {
        args.push('FREQ', options.FREQ.toString());
    }
    return args;
}
exports.transformArguments = transformArguments;
