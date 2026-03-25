"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.transformArguments = exports.FIRST_KEY_INDEX = void 0;
const generic_transformers_1 = require("@redis/client/dist/lib/commands/generic-transformers");
const _1 = require(".");
exports.FIRST_KEY_INDEX = 1;
function transformArguments(destKey, srcKeys, options) {
    const args = (0, generic_transformers_1.pushVerdictArgument)(['TDIGEST.MERGE', destKey], srcKeys);
    (0, _1.pushCompressionArgument)(args, options);
    if (options?.OVERRIDE) {
        args.push('OVERRIDE');
    }
    return args;
}
exports.transformArguments = transformArguments;
