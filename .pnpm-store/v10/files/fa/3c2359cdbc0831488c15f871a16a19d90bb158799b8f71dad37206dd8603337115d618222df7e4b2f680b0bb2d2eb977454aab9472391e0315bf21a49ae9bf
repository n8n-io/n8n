"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.transformReply = exports.transformArguments = void 0;
function transformArguments(count) {
    const args = ['ACL', 'LOG'];
    if (count) {
        args.push(count.toString());
    }
    return args;
}
exports.transformArguments = transformArguments;
function transformReply(reply) {
    return reply.map(log => ({
        count: log[1],
        reason: log[3],
        context: log[5],
        object: log[7],
        username: log[9],
        ageSeconds: Number(log[11]),
        clientInfo: log[13]
    }));
}
exports.transformReply = transformReply;
