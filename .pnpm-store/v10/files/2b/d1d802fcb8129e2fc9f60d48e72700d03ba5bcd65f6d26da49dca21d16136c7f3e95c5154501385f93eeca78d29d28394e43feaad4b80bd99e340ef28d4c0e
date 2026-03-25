"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.transformReply = exports.transformArguments = exports.IS_READ_ONLY = exports.FIRST_KEY_INDEX = void 0;
const generic_transformers_1 = require("./generic-transformers");
exports.FIRST_KEY_INDEX = 2;
exports.IS_READ_ONLY = true;
function transformArguments(key) {
    return ['XINFO', 'STREAM', key];
}
exports.transformArguments = transformArguments;
function transformReply(rawReply) {
    const parsedReply = {};
    for (let i = 0; i < rawReply.length; i += 2) {
        switch (rawReply[i]) {
            case 'length':
                parsedReply.length = rawReply[i + 1];
                break;
            case 'radix-tree-keys':
                parsedReply.radixTreeKeys = rawReply[i + 1];
                break;
            case 'radix-tree-nodes':
                parsedReply.radixTreeNodes = rawReply[i + 1];
                break;
            case 'groups':
                parsedReply.groups = rawReply[i + 1];
                break;
            case 'last-generated-id':
                parsedReply.lastGeneratedId = rawReply[i + 1];
                break;
            case 'first-entry':
                parsedReply.firstEntry = rawReply[i + 1] ? {
                    id: rawReply[i + 1][0],
                    message: (0, generic_transformers_1.transformTuplesReply)(rawReply[i + 1][1])
                } : null;
                break;
            case 'last-entry':
                parsedReply.lastEntry = rawReply[i + 1] ? {
                    id: rawReply[i + 1][0],
                    message: (0, generic_transformers_1.transformTuplesReply)(rawReply[i + 1][1])
                } : null;
                break;
        }
    }
    return parsedReply;
}
exports.transformReply = transformReply;
