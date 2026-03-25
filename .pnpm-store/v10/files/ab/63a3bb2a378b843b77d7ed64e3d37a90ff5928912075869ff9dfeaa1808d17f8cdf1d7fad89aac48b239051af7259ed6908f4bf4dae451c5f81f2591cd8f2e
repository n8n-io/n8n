"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.transformReply = exports.transformArguments = exports.IS_READ_ONLY = exports.FIRST_KEY_INDEX = void 0;
const generic_transformers_1 = require("./generic-transformers");
exports.FIRST_KEY_INDEX = 1;
exports.IS_READ_ONLY = true;
function transformArguments(key, cursor, options) {
    return (0, generic_transformers_1.pushScanArguments)([
        'ZSCAN',
        key
    ], cursor, options);
}
exports.transformArguments = transformArguments;
function transformReply([cursor, rawMembers]) {
    const parsedMembers = [];
    for (let i = 0; i < rawMembers.length; i += 2) {
        parsedMembers.push({
            value: rawMembers[i],
            score: (0, generic_transformers_1.transformNumberInfinityReply)(rawMembers[i + 1])
        });
    }
    return {
        cursor: Number(cursor),
        members: parsedMembers
    };
}
exports.transformReply = transformReply;
