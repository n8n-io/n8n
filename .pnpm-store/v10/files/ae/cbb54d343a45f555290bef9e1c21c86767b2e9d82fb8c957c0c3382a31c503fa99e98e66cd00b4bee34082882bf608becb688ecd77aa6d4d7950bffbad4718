"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.transformReply = exports.transformArguments = exports.FIRST_KEY_INDEX = void 0;
exports.FIRST_KEY_INDEX = 1;
function transformArguments(key, items) {
    return ['BF.MADD', key, ...items];
}
exports.transformArguments = transformArguments;
var generic_transformers_1 = require("@redis/client/dist/lib/commands/generic-transformers");
Object.defineProperty(exports, "transformReply", { enumerable: true, get: function () { return generic_transformers_1.transformBooleanArrayReply; } });
