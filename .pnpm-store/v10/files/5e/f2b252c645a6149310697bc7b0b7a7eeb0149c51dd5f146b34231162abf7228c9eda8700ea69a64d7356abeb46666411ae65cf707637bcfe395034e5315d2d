"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.transformReply = exports.transformArguments = exports.IS_READ_ONLY = exports.FIRST_KEY_INDEX = void 0;
const generic_transformers_1 = require("./generic-transformers");
exports.FIRST_KEY_INDEX = 1;
exports.IS_READ_ONLY = true;
function transformArguments(key, member) {
    return (0, generic_transformers_1.pushVerdictArguments)(['ZMSCORE', key], member);
}
exports.transformArguments = transformArguments;
var generic_transformers_2 = require("./generic-transformers");
Object.defineProperty(exports, "transformReply", { enumerable: true, get: function () { return generic_transformers_2.transformNumberInfinityNullArrayReply; } });
