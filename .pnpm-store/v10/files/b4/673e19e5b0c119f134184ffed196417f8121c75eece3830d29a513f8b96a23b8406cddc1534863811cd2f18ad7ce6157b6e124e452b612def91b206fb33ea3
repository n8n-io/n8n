"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.transformReply = exports.transformArguments = exports.IS_READ_ONLY = exports.FIRST_KEY_INDEX = void 0;
const _1 = require(".");
exports.FIRST_KEY_INDEX = 1;
exports.IS_READ_ONLY = true;
function transformArguments(key, options) {
    return (0, _1.pushLatestArgument)(['TS.GET', key], options?.LATEST);
}
exports.transformArguments = transformArguments;
function transformReply(reply) {
    if (reply.length === 0)
        return null;
    return (0, _1.transformSampleReply)(reply);
}
exports.transformReply = transformReply;
