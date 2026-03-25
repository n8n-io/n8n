"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.transformReply = exports.transformArguments = exports.FIRST_KEY_INDEX = void 0;
const generic_transformers_1 = require("./generic-transformers");
exports.FIRST_KEY_INDEX = 1;
function transformArguments(key, millisecondsTimestamp, mode) {
    const args = [
        'PEXPIREAT',
        key,
        (0, generic_transformers_1.transformPXAT)(millisecondsTimestamp)
    ];
    if (mode) {
        args.push(mode);
    }
    return args;
}
exports.transformArguments = transformArguments;
var generic_transformers_2 = require("./generic-transformers");
Object.defineProperty(exports, "transformReply", { enumerable: true, get: function () { return generic_transformers_2.transformBooleanReply; } });
