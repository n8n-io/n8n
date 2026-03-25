"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.transformReply = exports.transformArguments = exports.IS_READ_ONLY = void 0;
const generic_transformers_1 = require("./generic-transformers");
exports.IS_READ_ONLY = true;
function transformArguments(commands) {
    return ['COMMAND', 'INFO', ...commands];
}
exports.transformArguments = transformArguments;
function transformReply(reply) {
    return reply.map(command => command ? (0, generic_transformers_1.transformCommandReply)(command) : null);
}
exports.transformReply = transformReply;
