"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.transformReply = exports.transformArguments = exports.IS_READ_ONLY = exports.FIRST_KEY_INDEX = void 0;
exports.FIRST_KEY_INDEX = 1;
exports.IS_READ_ONLY = true;
function transformArguments(key, group) {
    return ['XPENDING', key, group];
}
exports.transformArguments = transformArguments;
function transformReply(reply) {
    return {
        pending: reply[0],
        firstId: reply[1],
        lastId: reply[2],
        consumers: reply[3] === null ? null : reply[3].map(([name, deliveriesCounter]) => ({
            name,
            deliveriesCounter: Number(deliveriesCounter)
        }))
    };
}
exports.transformReply = transformReply;
