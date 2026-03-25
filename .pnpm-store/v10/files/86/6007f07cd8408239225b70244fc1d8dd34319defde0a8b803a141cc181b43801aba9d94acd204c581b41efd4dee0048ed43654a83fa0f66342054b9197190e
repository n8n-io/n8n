"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.transformReply = exports.transformArguments = exports.IS_READ_ONLY = void 0;
const generic_transformers_1 = require("./generic-transformers");
const CLIENT_INFO_1 = require("./CLIENT_INFO");
exports.IS_READ_ONLY = true;
function transformArguments(filter) {
    let args = ['CLIENT', 'LIST'];
    if (filter) {
        if (filter.TYPE !== undefined) {
            args.push('TYPE', filter.TYPE);
        }
        else {
            args.push('ID');
            args = (0, generic_transformers_1.pushVerdictArguments)(args, filter.ID);
        }
    }
    return args;
}
exports.transformArguments = transformArguments;
function transformReply(rawReply) {
    const split = rawReply.split('\n'), length = split.length - 1, reply = [];
    for (let i = 0; i < length; i++) {
        reply.push((0, CLIENT_INFO_1.transformReply)(split[i]));
    }
    return reply;
}
exports.transformReply = transformReply;
