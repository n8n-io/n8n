"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.transformReply = exports.transformArguments = exports.IS_READ_ONLY = exports.FIRST_KEY_INDEX = void 0;
const _1 = require(".");
exports.FIRST_KEY_INDEX = 1;
exports.IS_READ_ONLY = true;
function transformArguments(key, fromTimestamp, toTimestamp, options) {
    return (0, _1.pushRangeArguments)(['TS.RANGE', key], fromTimestamp, toTimestamp, options);
}
exports.transformArguments = transformArguments;
function transformReply(reply) {
    return (0, _1.transformRangeReply)(reply);
}
exports.transformReply = transformReply;
