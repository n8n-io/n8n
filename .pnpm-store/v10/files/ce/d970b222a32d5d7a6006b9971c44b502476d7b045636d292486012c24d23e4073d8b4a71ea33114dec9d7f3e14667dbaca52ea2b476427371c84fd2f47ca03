"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.transformReply = exports.transformArguments = exports.IS_READ_ONLY = exports.FIRST_KEY_INDEX = void 0;
const _1 = require(".");
exports.FIRST_KEY_INDEX = 1;
exports.IS_READ_ONLY = true;
function transformArguments(index, query, options) {
    return (0, _1.pushSearchOptions)(['FT.SEARCH', index, query, 'NOCONTENT'], options);
}
exports.transformArguments = transformArguments;
;
function transformReply(reply) {
    return {
        total: reply[0],
        documents: reply.slice(1)
    };
}
exports.transformReply = transformReply;
