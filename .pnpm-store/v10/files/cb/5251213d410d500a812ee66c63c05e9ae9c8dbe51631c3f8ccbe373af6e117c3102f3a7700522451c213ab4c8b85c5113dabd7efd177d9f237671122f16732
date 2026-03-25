"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.transformReply = exports.transformArguments = exports.IS_READ_ONLY = exports.FIRST_KEY_INDEX = void 0;
exports.FIRST_KEY_INDEX = 1;
exports.IS_READ_ONLY = true;
function transformArguments(key) {
    return ['TOPK.INFO', key];
}
exports.transformArguments = transformArguments;
function transformReply(reply) {
    return {
        k: reply[1],
        width: reply[3],
        depth: reply[5],
        decay: Number(reply[7])
    };
}
exports.transformReply = transformReply;
