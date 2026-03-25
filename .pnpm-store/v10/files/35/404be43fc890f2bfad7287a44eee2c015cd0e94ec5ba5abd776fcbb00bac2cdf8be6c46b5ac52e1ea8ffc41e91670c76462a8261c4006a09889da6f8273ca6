"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.transformReply = exports.transformArguments = exports.FIRST_KEY_INDEX = void 0;
const generic_transformers_1 = require("./generic-transformers");
exports.FIRST_KEY_INDEX = 3;
function transformArguments(timeout, keys, side, options) {
    return (0, generic_transformers_1.transformLMPopArguments)(['BLMPOP', timeout.toString()], keys, side, options);
}
exports.transformArguments = transformArguments;
var LMPOP_1 = require("./LMPOP");
Object.defineProperty(exports, "transformReply", { enumerable: true, get: function () { return LMPOP_1.transformReply; } });
