"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.transformReply = exports.transformArguments = exports.FIRST_KEY_INDEX = void 0;
const generic_transformers_1 = require("./generic-transformers");
exports.FIRST_KEY_INDEX = 1;
function transformArguments(key, timeout) {
    const args = (0, generic_transformers_1.pushVerdictArguments)(['BZPOPMIN'], key);
    args.push(timeout.toString());
    return args;
}
exports.transformArguments = transformArguments;
var BZPOPMAX_1 = require("./BZPOPMAX");
Object.defineProperty(exports, "transformReply", { enumerable: true, get: function () { return BZPOPMAX_1.transformReply; } });
