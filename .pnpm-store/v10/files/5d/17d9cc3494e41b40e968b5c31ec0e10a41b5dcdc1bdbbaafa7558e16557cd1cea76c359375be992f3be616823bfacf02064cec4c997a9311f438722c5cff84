"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.transformReply = exports.transformArguments = exports.IS_READ_ONLY = void 0;
const SEARCH_1 = require("./SEARCH");
const _1 = require(".");
exports.IS_READ_ONLY = true;
function transformArguments(index, query, options) {
    let args = ['FT.PROFILE', index, 'SEARCH'];
    if (options?.LIMITED) {
        args.push('LIMITED');
    }
    args.push('QUERY', query);
    return (0, _1.pushSearchOptions)(args, options);
}
exports.transformArguments = transformArguments;
function transformReply(reply, withoutDocuments) {
    return {
        results: (0, SEARCH_1.transformReply)(reply[0], withoutDocuments),
        profile: (0, _1.transformProfile)(reply[1])
    };
}
exports.transformReply = transformReply;
