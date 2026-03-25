"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.transformArguments = exports.IS_READ_ONLY = void 0;
const generic_transformers_1 = require("@redis/client/dist/lib/commands/generic-transformers");
exports.IS_READ_ONLY = true;
function transformArguments(filter) {
    return (0, generic_transformers_1.pushVerdictArguments)(['TS.QUERYINDEX'], filter);
}
exports.transformArguments = transformArguments;
