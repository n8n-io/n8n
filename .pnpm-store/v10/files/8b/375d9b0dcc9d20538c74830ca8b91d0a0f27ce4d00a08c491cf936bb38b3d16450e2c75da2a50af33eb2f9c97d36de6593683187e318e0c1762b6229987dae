"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.transformReply = exports.transformArguments = void 0;
function transformArguments() {
    return ['CLUSTER', 'LINKS'];
}
exports.transformArguments = transformArguments;
function transformReply(reply) {
    return reply.map(peerLink => ({
        direction: peerLink[1],
        node: peerLink[3],
        createTime: Number(peerLink[5]),
        events: peerLink[7],
        sendBufferAllocated: Number(peerLink[9]),
        sendBufferUsed: Number(peerLink[11])
    }));
}
exports.transformReply = transformReply;
