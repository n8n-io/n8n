"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.transformArguments = exports.IS_READ_ONLY = exports.FIRST_KEY_INDEX = void 0;
const generic_transformers_1 = require("./generic-transformers");
exports.FIRST_KEY_INDEX = 2;
exports.IS_READ_ONLY = true;
function transformArguments(keys, options) {
    const args = (0, generic_transformers_1.pushVerdictArgument)(['ZINTER'], keys);
    if (options?.WEIGHTS) {
        args.push('WEIGHTS', ...options.WEIGHTS.map(weight => weight.toString()));
    }
    if (options?.AGGREGATE) {
        args.push('AGGREGATE', options.AGGREGATE);
    }
    return args;
}
exports.transformArguments = transformArguments;
