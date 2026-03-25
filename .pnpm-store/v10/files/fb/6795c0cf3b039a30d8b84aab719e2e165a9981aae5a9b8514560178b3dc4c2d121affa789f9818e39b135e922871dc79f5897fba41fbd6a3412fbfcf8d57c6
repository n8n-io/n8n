"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.transformReply = exports.transformArguments = exports.FIRST_KEY_INDEX = exports.IS_READ_ONLY = void 0;
exports.IS_READ_ONLY = true;
exports.FIRST_KEY_INDEX = 1;
function transformArguments(key) {
    return ['GRAPH.SLOWLOG', key];
}
exports.transformArguments = transformArguments;
function transformReply(logs) {
    return logs.map(([timestamp, command, query, took]) => ({
        timestamp: new Date(Number(timestamp) * 1000),
        command,
        query,
        took: Number(took)
    }));
}
exports.transformReply = transformReply;
