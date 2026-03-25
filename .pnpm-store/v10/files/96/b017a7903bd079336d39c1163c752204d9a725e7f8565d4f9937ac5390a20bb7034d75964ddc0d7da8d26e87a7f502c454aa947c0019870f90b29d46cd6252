"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.transformReply = exports.transformArguments = exports.IS_READ_ONLY = exports.FIRST_KEY_INDEX = void 0;
exports.FIRST_KEY_INDEX = 1;
exports.IS_READ_ONLY = true;
function transformArguments(key, member1, member2, unit) {
    const args = ['GEODIST', key, member1, member2];
    if (unit) {
        args.push(unit);
    }
    return args;
}
exports.transformArguments = transformArguments;
function transformReply(reply) {
    return reply === null ? null : Number(reply);
}
exports.transformReply = transformReply;
