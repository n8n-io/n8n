"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.transformReply = exports.transformArguments = void 0;
function transformArguments(username) {
    return ['ACL', 'GETUSER', username];
}
exports.transformArguments = transformArguments;
function transformReply(reply) {
    return {
        flags: reply[1],
        passwords: reply[3],
        commands: reply[5],
        keys: reply[7],
        channels: reply[9],
        selectors: reply[11]
    };
}
exports.transformReply = transformReply;
