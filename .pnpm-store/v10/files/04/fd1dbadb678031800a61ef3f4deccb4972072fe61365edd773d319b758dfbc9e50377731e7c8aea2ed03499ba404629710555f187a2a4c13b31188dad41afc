"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.transformReply = exports.transformArguments = exports.IS_READ_ONLY = void 0;
exports.IS_READ_ONLY = true;
function transformArguments(args) {
    return ['COMMAND', 'GETKEYSANDFLAGS', ...args];
}
exports.transformArguments = transformArguments;
function transformReply(reply) {
    return reply.map(([key, flags]) => ({
        key,
        flags
    }));
}
exports.transformReply = transformReply;
