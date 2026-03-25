"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.transformReply = exports.transformArguments = exports.FIRST_KEY_INDEX = void 0;
const _1 = require(".");
exports.FIRST_KEY_INDEX = 1;
function transformArguments(graph, query, options, compact) {
    return (0, _1.pushQueryArguments)(['GRAPH.QUERY'], graph, query, options, compact);
}
exports.transformArguments = transformArguments;
function transformReply(reply) {
    return reply.length === 1 ? {
        headers: undefined,
        data: undefined,
        metadata: reply[0]
    } : {
        headers: reply[0],
        data: reply[1],
        metadata: reply[2]
    };
}
exports.transformReply = transformReply;
