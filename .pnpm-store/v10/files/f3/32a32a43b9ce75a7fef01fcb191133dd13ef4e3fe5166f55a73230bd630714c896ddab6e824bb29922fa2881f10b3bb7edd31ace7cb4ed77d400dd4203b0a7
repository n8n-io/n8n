"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.transformReply = exports.transformArguments = exports.IS_READ_ONLY = exports.FIRST_KEY_INDEX = void 0;
exports.FIRST_KEY_INDEX = 2;
exports.IS_READ_ONLY = true;
function transformArguments(key, group) {
    return ['XINFO', 'CONSUMERS', key, group];
}
exports.transformArguments = transformArguments;
function transformReply(rawReply) {
    return rawReply.map(consumer => ({
        name: consumer[1],
        pending: consumer[3],
        idle: consumer[5],
        inactive: consumer[7]
    }));
}
exports.transformReply = transformReply;
