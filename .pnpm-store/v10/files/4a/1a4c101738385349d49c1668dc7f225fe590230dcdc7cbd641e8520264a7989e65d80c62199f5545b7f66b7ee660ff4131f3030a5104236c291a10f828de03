"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.transformReply = exports.transformArguments = exports.IS_READ_ONLY = exports.FIRST_KEY_INDEX = void 0;
exports.FIRST_KEY_INDEX = 1;
exports.IS_READ_ONLY = true;
function transformArguments(key, ranks) {
    const args = ['TDIGEST.BYREVRANK', key];
    for (const rank of ranks) {
        args.push(rank.toString());
    }
    return args;
}
exports.transformArguments = transformArguments;
var _1 = require(".");
Object.defineProperty(exports, "transformReply", { enumerable: true, get: function () { return _1.transformDoublesReply; } });
