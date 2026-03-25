"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.transformReply = exports.transformArguments = exports.IS_READ_ONLY = exports.FIRST_KEY_INDEX = void 0;
exports.FIRST_KEY_INDEX = 2;
exports.IS_READ_ONLY = true;
function transformArguments(key) {
    return ['XINFO', 'GROUPS', key];
}
exports.transformArguments = transformArguments;
function transformReply(rawReply) {
    return rawReply.map(group => ({
        name: group[1],
        consumers: group[3],
        pending: group[5],
        lastDeliveredId: group[7]
    }));
}
exports.transformReply = transformReply;
