"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.transformReply = exports.transformArguments = void 0;
function transformArguments() {
    return ['TIME'];
}
exports.transformArguments = transformArguments;
function transformReply(reply) {
    const seconds = Number(reply[0]), microseconds = Number(reply[1]), d = new Date(seconds * 1000 + microseconds / 1000);
    d.microseconds = microseconds;
    return d;
}
exports.transformReply = transformReply;
