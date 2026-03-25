"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.transformReply = exports.transformArguments = exports.IS_READ_ONLY = void 0;
const SUGGET_1 = require("./SUGGET");
var SUGGET_2 = require("./SUGGET");
Object.defineProperty(exports, "IS_READ_ONLY", { enumerable: true, get: function () { return SUGGET_2.IS_READ_ONLY; } });
function transformArguments(key, prefix, options) {
    return [
        ...(0, SUGGET_1.transformArguments)(key, prefix, options),
        'WITHPAYLOADS'
    ];
}
exports.transformArguments = transformArguments;
function transformReply(rawReply) {
    if (rawReply === null)
        return null;
    const transformedReply = [];
    for (let i = 0; i < rawReply.length; i += 2) {
        transformedReply.push({
            suggestion: rawReply[i],
            payload: rawReply[i + 1]
        });
    }
    return transformedReply;
}
exports.transformReply = transformReply;
