"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.transformReply = exports.transformArguments = void 0;
function transformArguments(key, string) {
    return ['FT.SUGDEL', key, string];
}
exports.transformArguments = transformArguments;
var generic_transformers_1 = require("@redis/client/dist/lib/commands/generic-transformers");
Object.defineProperty(exports, "transformReply", { enumerable: true, get: function () { return generic_transformers_1.transformBooleanReply; } });
