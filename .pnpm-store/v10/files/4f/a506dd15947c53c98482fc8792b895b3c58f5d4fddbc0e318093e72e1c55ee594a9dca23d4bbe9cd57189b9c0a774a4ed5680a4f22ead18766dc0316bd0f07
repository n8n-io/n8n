"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.transformReply = exports.transformArguments = void 0;
function transformArguments(options) {
    const args = ['HELLO'];
    if (options) {
        args.push(options.protover.toString());
        if (options.auth) {
            args.push('AUTH', options.auth.username, options.auth.password);
        }
        if (options.clientName) {
            args.push('SETNAME', options.clientName);
        }
    }
    return args;
}
exports.transformArguments = transformArguments;
function transformReply(reply) {
    return {
        server: reply[1],
        version: reply[3],
        proto: reply[5],
        id: reply[7],
        mode: reply[9],
        role: reply[11],
        modules: reply[13]
    };
}
exports.transformReply = transformReply;
