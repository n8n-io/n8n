"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.transformArguments = exports.FIRST_KEY_INDEX = void 0;
const _1 = require(".");
exports.FIRST_KEY_INDEX = 1;
function transformArguments(key, timestamp, value, options) {
    const args = [
        'TS.ADD',
        key,
        (0, _1.transformTimestampArgument)(timestamp),
        value.toString()
    ];
    (0, _1.pushRetentionArgument)(args, options?.RETENTION);
    (0, _1.pushEncodingArgument)(args, options?.ENCODING);
    (0, _1.pushChunkSizeArgument)(args, options?.CHUNK_SIZE);
    if (options?.ON_DUPLICATE) {
        args.push('ON_DUPLICATE', options.ON_DUPLICATE);
    }
    (0, _1.pushLabelsArgument)(args, options?.LABELS);
    return args;
}
exports.transformArguments = transformArguments;
