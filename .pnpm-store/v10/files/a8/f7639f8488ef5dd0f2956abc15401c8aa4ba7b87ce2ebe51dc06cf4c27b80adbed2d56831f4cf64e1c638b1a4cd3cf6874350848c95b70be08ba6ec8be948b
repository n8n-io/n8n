"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.transformReply = exports.transformArguments = exports.IS_READ_ONLY = exports.FIRST_KEY_INDEX = void 0;
exports.FIRST_KEY_INDEX = 1;
exports.IS_READ_ONLY = true;
function transformArguments(index, cursor, options) {
    const args = [
        'FT.CURSOR',
        'READ',
        index,
        cursor.toString()
    ];
    if (options?.COUNT) {
        args.push('COUNT', options.COUNT.toString());
    }
    return args;
}
exports.transformArguments = transformArguments;
var AGGREGATE_WITHCURSOR_1 = require("./AGGREGATE_WITHCURSOR");
Object.defineProperty(exports, "transformReply", { enumerable: true, get: function () { return AGGREGATE_WITHCURSOR_1.transformReply; } });
