"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.transformReply = exports.transformArguments = void 0;
const generic_transformers_1 = require("./generic-transformers");
function transformArguments(pattern) {
    const args = ['FUNCTION', 'LIST'];
    if (pattern) {
        args.push(pattern);
    }
    return args;
}
exports.transformArguments = transformArguments;
function transformReply(reply) {
    return reply.map(generic_transformers_1.transformFunctionListItemReply);
}
exports.transformReply = transformReply;
