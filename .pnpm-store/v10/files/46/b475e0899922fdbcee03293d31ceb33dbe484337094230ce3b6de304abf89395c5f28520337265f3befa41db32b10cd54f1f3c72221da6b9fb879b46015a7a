"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.transformReply = exports.transformArguments = exports.FIRST_KEY_INDEX = void 0;
const generic_transformers_1 = require("./generic-transformers");
exports.FIRST_KEY_INDEX = 2;
function transformArguments(keys, side, options) {
    return (0, generic_transformers_1.transformZMPopArguments)(['ZMPOP'], keys, side, options);
}
exports.transformArguments = transformArguments;
function transformReply(reply) {
    return reply === null ? null : {
        key: reply[0],
        elements: reply[1].map(generic_transformers_1.transformSortedSetMemberReply)
    };
}
exports.transformReply = transformReply;
