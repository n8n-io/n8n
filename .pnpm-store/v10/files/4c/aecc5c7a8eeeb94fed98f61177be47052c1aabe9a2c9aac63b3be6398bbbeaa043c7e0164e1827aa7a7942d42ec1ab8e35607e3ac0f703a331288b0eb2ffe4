"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.transformReply = exports.transformArguments = exports.IS_READ_ONLY = exports.FIRST_KEY_INDEX = void 0;
exports.FIRST_KEY_INDEX = 1;
exports.IS_READ_ONLY = true;
function transformArguments(key) {
    return [
        'TDIGEST.INFO',
        key
    ];
}
exports.transformArguments = transformArguments;
function transformReply(reply) {
    return {
        comperssion: reply[1],
        capacity: reply[3],
        mergedNodes: reply[5],
        unmergedNodes: reply[7],
        mergedWeight: Number(reply[9]),
        unmergedWeight: Number(reply[11]),
        totalCompression: reply[13]
    };
}
exports.transformReply = transformReply;
