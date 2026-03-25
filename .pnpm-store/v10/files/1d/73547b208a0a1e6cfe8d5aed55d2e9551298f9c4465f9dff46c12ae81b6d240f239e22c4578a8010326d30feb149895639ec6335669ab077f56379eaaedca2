"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.transformReply = exports.transformArguments = exports.IS_READ_ONLY = exports.FIRST_KEY_INDEX = void 0;
exports.FIRST_KEY_INDEX = 1;
exports.IS_READ_ONLY = true;
function transformArguments(key) {
    return ['TOPK.LIST', key, 'WITHCOUNT'];
}
exports.transformArguments = transformArguments;
function transformReply(rawReply) {
    const reply = [];
    for (let i = 0; i < rawReply.length; i++) {
        reply.push({
            item: rawReply[i],
            count: rawReply[++i]
        });
    }
    return reply;
}
exports.transformReply = transformReply;
