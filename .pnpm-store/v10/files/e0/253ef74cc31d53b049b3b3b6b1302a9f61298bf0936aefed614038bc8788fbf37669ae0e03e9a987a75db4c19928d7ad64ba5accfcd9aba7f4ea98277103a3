"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.transformReply = exports.transformArguments = void 0;
const FUNCTION_LIST_1 = require("./FUNCTION_LIST");
const generic_transformers_1 = require("./generic-transformers");
function transformArguments(pattern) {
    const args = (0, FUNCTION_LIST_1.transformArguments)(pattern);
    args.push('WITHCODE');
    return args;
}
exports.transformArguments = transformArguments;
function transformReply(reply) {
    return reply.map(library => ({
        ...(0, generic_transformers_1.transformFunctionListItemReply)(library),
        libraryCode: library[7]
    }));
}
exports.transformReply = transformReply;
