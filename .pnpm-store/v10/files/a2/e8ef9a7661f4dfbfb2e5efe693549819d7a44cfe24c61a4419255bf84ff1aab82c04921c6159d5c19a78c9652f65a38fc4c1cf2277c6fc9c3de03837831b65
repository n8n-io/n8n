"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.transformArguments = exports.FIRTS_KEY_INDEX = void 0;
const _1 = require(".");
exports.FIRTS_KEY_INDEX = 1;
function transformArguments(key, fromTimestamp, toTimestamp) {
    return [
        'TS.DEL',
        key,
        (0, _1.transformTimestampArgument)(fromTimestamp),
        (0, _1.transformTimestampArgument)(toTimestamp)
    ];
}
exports.transformArguments = transformArguments;
