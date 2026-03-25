"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.transformArguments = void 0;
const generic_transformers_1 = require("@redis/client/dist/lib/commands/generic-transformers");
function transformArguments(index, groupId, terms, options) {
    const args = ['FT.SYNUPDATE', index, groupId];
    if (options?.SKIPINITIALSCAN) {
        args.push('SKIPINITIALSCAN');
    }
    return (0, generic_transformers_1.pushVerdictArguments)(args, terms);
}
exports.transformArguments = transformArguments;
