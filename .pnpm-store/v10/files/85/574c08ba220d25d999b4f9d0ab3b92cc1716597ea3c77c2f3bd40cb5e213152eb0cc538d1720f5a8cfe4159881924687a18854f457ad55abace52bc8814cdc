"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.transformArguments = exports.FIRST_KEY_INDEX = void 0;
const _1 = require(".");
exports.FIRST_KEY_INDEX = 1;
function transformArguments(key, options) {
    const args = ['TS.CREATE', key];
    (0, _1.pushRetentionArgument)(args, options?.RETENTION);
    (0, _1.pushEncodingArgument)(args, options?.ENCODING);
    (0, _1.pushChunkSizeArgument)(args, options?.CHUNK_SIZE);
    (0, _1.pushDuplicatePolicy)(args, options?.DUPLICATE_POLICY);
    (0, _1.pushLabelsArgument)(args, options?.LABELS);
    return args;
}
exports.transformArguments = transformArguments;
