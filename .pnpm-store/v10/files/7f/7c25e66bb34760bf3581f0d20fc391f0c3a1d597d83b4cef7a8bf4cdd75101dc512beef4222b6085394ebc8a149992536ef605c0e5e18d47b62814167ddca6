"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.transformArguments = exports.IS_READ_ONLY = void 0;
const _1 = require(".");
exports.IS_READ_ONLY = true;
function transformArguments(index, query, options) {
    const args = ['FT.EXPLAIN', index, query];
    (0, _1.pushParamsArgs)(args, options?.PARAMS);
    if (options?.DIALECT) {
        args.push('DIALECT', options.DIALECT.toString());
    }
    return args;
}
exports.transformArguments = transformArguments;
