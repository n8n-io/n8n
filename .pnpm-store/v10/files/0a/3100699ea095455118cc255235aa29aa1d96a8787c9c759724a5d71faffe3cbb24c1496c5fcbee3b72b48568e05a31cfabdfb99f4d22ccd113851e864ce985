"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.transformReply = exports.transformArguments = exports.IS_READ_ONLY = exports.FIRST_KEY_INDEX = void 0;
const generic_transformers_1 = require("./generic-transformers");
const LCS_1 = require("./LCS");
var LCS_2 = require("./LCS");
Object.defineProperty(exports, "FIRST_KEY_INDEX", { enumerable: true, get: function () { return LCS_2.FIRST_KEY_INDEX; } });
Object.defineProperty(exports, "IS_READ_ONLY", { enumerable: true, get: function () { return LCS_2.IS_READ_ONLY; } });
function transformArguments(key1, key2) {
    const args = (0, LCS_1.transformArguments)(key1, key2);
    args.push('IDX', 'WITHMATCHLEN');
    return args;
}
exports.transformArguments = transformArguments;
function transformReply(reply) {
    return {
        matches: reply[1].map(([key1, key2, length]) => ({
            key1: (0, generic_transformers_1.transformRangeReply)(key1),
            key2: (0, generic_transformers_1.transformRangeReply)(key2),
            length
        })),
        length: reply[3]
    };
}
exports.transformReply = transformReply;
