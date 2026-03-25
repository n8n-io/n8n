"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.transformReply = exports.transformArguments = exports.FIRST_KEY_INDEX = void 0;
const generic_transformers_1 = require("./generic-transformers");
exports.FIRST_KEY_INDEX = 1;
function transformArguments(key, timeout) {
    const args = (0, generic_transformers_1.pushVerdictArguments)(['BZPOPMAX'], key);
    args.push(timeout.toString());
    return args;
}
exports.transformArguments = transformArguments;
function transformReply(reply) {
    if (!reply)
        return null;
    return {
        key: reply[0],
        value: reply[1],
        score: (0, generic_transformers_1.transformNumberInfinityReply)(reply[2])
    };
}
exports.transformReply = transformReply;
