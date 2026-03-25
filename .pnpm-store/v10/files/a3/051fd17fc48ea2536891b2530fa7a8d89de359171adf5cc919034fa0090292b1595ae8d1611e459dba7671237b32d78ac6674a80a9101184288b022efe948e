"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.transformReply = exports.transformArguments = exports.FIRST_KEY_INDEX = void 0;
const _1 = require(".");
exports.FIRST_KEY_INDEX = 1;
function transformArguments(key, path, index) {
    const args = ['JSON.ARRPOP', key];
    if (path) {
        args.push(path);
        if (index !== undefined && index !== null) {
            args.push(index.toString());
        }
    }
    return args;
}
exports.transformArguments = transformArguments;
function transformReply(reply) {
    if (reply === null)
        return null;
    if (Array.isArray(reply)) {
        return reply.map(_1.transformRedisJsonNullReply);
    }
    return (0, _1.transformRedisJsonNullReply)(reply);
}
exports.transformReply = transformReply;
