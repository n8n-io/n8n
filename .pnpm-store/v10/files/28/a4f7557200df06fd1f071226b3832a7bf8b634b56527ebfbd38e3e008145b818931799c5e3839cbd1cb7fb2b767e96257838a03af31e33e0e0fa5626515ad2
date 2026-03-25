"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.transformReply = exports.transformArguments = exports.IS_READ_ONLY = exports.FIRST_KEY_INDEX = void 0;
exports.FIRST_KEY_INDEX = 1;
exports.IS_READ_ONLY = true;
function transformArguments(key) {
    return ['CMS.INFO', key];
}
exports.transformArguments = transformArguments;
function transformReply(reply) {
    return {
        width: reply[1],
        depth: reply[3],
        count: reply[5]
    };
}
exports.transformReply = transformReply;
