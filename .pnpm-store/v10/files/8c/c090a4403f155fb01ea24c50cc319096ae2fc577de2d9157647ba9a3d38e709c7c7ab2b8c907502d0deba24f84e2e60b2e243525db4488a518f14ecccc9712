"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.transformReply = exports.transformArguments = exports.FIRST_KEY_INDEX = void 0;
const generic_transformers_1 = require("./generic-transformers");
exports.FIRST_KEY_INDEX = 1;
function transformArguments(key, timeout) {
    const args = (0, generic_transformers_1.pushVerdictArguments)(['BRPOP'], key);
    args.push(timeout.toString());
    return args;
}
exports.transformArguments = transformArguments;
var BLPOP_1 = require("./BLPOP");
Object.defineProperty(exports, "transformReply", { enumerable: true, get: function () { return BLPOP_1.transformReply; } });
