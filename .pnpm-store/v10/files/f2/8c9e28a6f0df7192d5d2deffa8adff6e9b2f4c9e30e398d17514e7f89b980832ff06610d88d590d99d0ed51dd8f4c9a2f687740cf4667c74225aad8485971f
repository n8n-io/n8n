"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.transformReply = exports.transformArguments = exports.IS_READ_ONLY = void 0;
const generic_transformers_1 = require("./generic-transformers");
exports.IS_READ_ONLY = true;
function transformArguments(channels) {
    const args = ['PUBSUB', 'SHARDNUMSUB'];
    if (channels)
        return (0, generic_transformers_1.pushVerdictArguments)(args, channels);
    return args;
}
exports.transformArguments = transformArguments;
function transformReply(rawReply) {
    const transformedReply = Object.create(null);
    for (let i = 0; i < rawReply.length; i += 2) {
        transformedReply[rawReply[i]] = rawReply[i + 1];
    }
    return transformedReply;
}
exports.transformReply = transformReply;
