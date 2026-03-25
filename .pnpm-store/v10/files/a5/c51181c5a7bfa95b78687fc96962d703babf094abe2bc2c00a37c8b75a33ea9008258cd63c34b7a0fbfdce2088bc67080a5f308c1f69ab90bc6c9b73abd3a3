"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.transformArguments = exports.IS_READ_ONLY = exports.FIRST_KEY_INDEX = void 0;
const generic_transformers_1 = require("./generic-transformers");
exports.FIRST_KEY_INDEX = generic_transformers_1.evalFirstKeyIndex;
exports.IS_READ_ONLY = true;
function transformArguments(fn, options) {
    return (0, generic_transformers_1.pushEvalArguments)(['FCALL_RO', fn], options);
}
exports.transformArguments = transformArguments;
