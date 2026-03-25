"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.transformReply = exports.transformArguments = void 0;
function transformArguments(option) {
    return ['FT.CONFIG', 'GET', option];
}
exports.transformArguments = transformArguments;
function transformReply(rawReply) {
    const transformedReply = Object.create(null);
    for (const [key, value] of rawReply) {
        transformedReply[key] = value;
    }
    return transformedReply;
}
exports.transformReply = transformReply;
