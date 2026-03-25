"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.transformReply = exports.transformArguments = exports.FIRST_KEY_INDEX = void 0;
const generic_transformers_1 = require("./generic-transformers");
exports.FIRST_KEY_INDEX = 1;
function transformArguments(keys, timeout) {
    const args = (0, generic_transformers_1.pushVerdictArguments)(['BLPOP'], keys);
    args.push(timeout.toString());
    return args;
}
exports.transformArguments = transformArguments;
function transformReply(reply) {
    if (reply === null)
        return null;
    return {
        key: reply[0],
        element: reply[1]
    };
}
exports.transformReply = transformReply;
