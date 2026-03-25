"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.transformReply = exports.transformArguments = void 0;
function transformArguments() {
    return ['CLUSTER', 'SLOTS'];
}
exports.transformArguments = transformArguments;
;
function transformReply(reply) {
    return reply.map(([from, to, master, ...replicas]) => {
        return {
            from,
            to,
            master: transformNode(master),
            replicas: replicas.map(transformNode)
        };
    });
}
exports.transformReply = transformReply;
function transformNode([ip, port, id]) {
    return {
        ip,
        port,
        id
    };
}
