"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.transformReply = exports.transformArguments = exports.FIRST_KEY_INDEX = void 0;
const _1 = require(".");
exports.FIRST_KEY_INDEX = 1;
function transformArguments(key, items, options) {
    return (0, _1.pushInsertOptions)(['CF.INSERT', key], items, options);
}
exports.transformArguments = transformArguments;
var generic_transformers_1 = require("@redis/client/dist/lib/commands/generic-transformers");
Object.defineProperty(exports, "transformReply", { enumerable: true, get: function () { return generic_transformers_1.transformBooleanArrayReply; } });
