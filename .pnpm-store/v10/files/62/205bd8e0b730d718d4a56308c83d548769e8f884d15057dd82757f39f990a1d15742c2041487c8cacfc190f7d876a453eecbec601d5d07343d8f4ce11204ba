"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.transformReply = exports.transformArguments = exports.FIRST_KEY_INDEX = void 0;
const generic_transformers_1 = require("./generic-transformers");
exports.FIRST_KEY_INDEX = 1;
function transformArguments(key, group, consumer, minIdleTime, start, options) {
    const args = ['XAUTOCLAIM', key, group, consumer, minIdleTime.toString(), start];
    if (options?.COUNT) {
        args.push('COUNT', options.COUNT.toString());
    }
    return args;
}
exports.transformArguments = transformArguments;
function transformReply(reply) {
    return {
        nextId: reply[0],
        messages: (0, generic_transformers_1.transformStreamMessagesNullReply)(reply[1])
    };
}
exports.transformReply = transformReply;
