"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.transformArguments = exports.FIRST_KEY_INDEX = void 0;
const generic_transformers_1 = require("@redis/client/dist/lib/commands/generic-transformers");
exports.FIRST_KEY_INDEX = 1;
function transformArguments(key, items) {
    return (0, generic_transformers_1.pushVerdictArguments)(['TOPK.ADD', key], items);
}
exports.transformArguments = transformArguments;
