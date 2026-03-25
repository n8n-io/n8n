"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.transformReply = exports.transformArguments = exports.IS_READ_ONLY = exports.FIRST_KEY_INDEX = void 0;
const _1 = require(".");
exports.FIRST_KEY_INDEX = 1;
exports.IS_READ_ONLY = true;
function transformArguments(index, query, options) {
    return (0, _1.pushSearchOptions)(['FT.SEARCH', index, query], options);
}
exports.transformArguments = transformArguments;
function transformReply(reply, withoutDocuments) {
    const documents = [];
    let i = 1;
    while (i < reply.length) {
        documents.push({
            id: reply[i++],
            value: withoutDocuments ? Object.create(null) : documentValue(reply[i++])
        });
    }
    return {
        total: reply[0],
        documents
    };
}
exports.transformReply = transformReply;
function documentValue(tuples) {
    const message = Object.create(null);
    let i = 0;
    while (i < tuples.length) {
        const key = tuples[i++], value = tuples[i++];
        if (key === '$') { // might be a JSON reply
            try {
                Object.assign(message, JSON.parse(value));
                continue;
            }
            catch {
                // set as a regular property if not a valid JSON
            }
        }
        message[key] = value;
    }
    return message;
}
