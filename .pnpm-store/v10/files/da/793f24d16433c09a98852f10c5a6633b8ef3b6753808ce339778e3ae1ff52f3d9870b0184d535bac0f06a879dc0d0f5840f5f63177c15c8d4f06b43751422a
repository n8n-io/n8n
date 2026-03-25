"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.transformArguments = exports.FIRST_KEY_INDEX = void 0;
exports.FIRST_KEY_INDEX = 1;
function transformArguments(key, id, message, options) {
    const args = ['XADD', key];
    if (options?.NOMKSTREAM) {
        args.push('NOMKSTREAM');
    }
    if (options?.TRIM) {
        if (options.TRIM.strategy) {
            args.push(options.TRIM.strategy);
        }
        if (options.TRIM.strategyModifier) {
            args.push(options.TRIM.strategyModifier);
        }
        args.push(options.TRIM.threshold.toString());
        if (options.TRIM.limit) {
            args.push('LIMIT', options.TRIM.limit.toString());
        }
    }
    args.push(id);
    for (const [key, value] of Object.entries(message)) {
        args.push(key, value);
    }
    return args;
}
exports.transformArguments = transformArguments;
