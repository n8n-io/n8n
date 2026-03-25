"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.transformReply = exports.transformArguments = exports.IS_READ_ONLY = exports.FIRST_KEY_INDEX = void 0;
const generic_transformers_1 = require("./generic-transformers");
exports.FIRST_KEY_INDEX = 1;
exports.IS_READ_ONLY = true;
function transformArguments(key, cursor, options) {
    return (0, generic_transformers_1.pushScanArguments)([
        'HSCAN',
        key
    ], cursor, options);
}
exports.transformArguments = transformArguments;
function transformReply([cursor, rawTuples]) {
    const parsedTuples = [];
    for (let i = 0; i < rawTuples.length; i += 2) {
        parsedTuples.push({
            field: rawTuples[i],
            value: rawTuples[i + 1]
        });
    }
    return {
        cursor: Number(cursor),
        tuples: parsedTuples
    };
}
exports.transformReply = transformReply;
