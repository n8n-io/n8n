"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.transformReply = exports.transformArguments = void 0;
function transformArguments() {
    return ['CLIENT', 'TRACKINGINFO'];
}
exports.transformArguments = transformArguments;
function transformReply(reply) {
    return {
        flags: new Set(reply[1]),
        redirect: reply[3],
        prefixes: reply[5]
    };
}
exports.transformReply = transformReply;
