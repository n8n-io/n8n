"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.transformReply = exports.transformArguments = exports.IS_READ_ONLY = exports.FIRST_KEY_INDEX = void 0;
const AGGREGATE_1 = require("./AGGREGATE");
var AGGREGATE_2 = require("./AGGREGATE");
Object.defineProperty(exports, "FIRST_KEY_INDEX", { enumerable: true, get: function () { return AGGREGATE_2.FIRST_KEY_INDEX; } });
Object.defineProperty(exports, "IS_READ_ONLY", { enumerable: true, get: function () { return AGGREGATE_2.IS_READ_ONLY; } });
function transformArguments(index, query, options) {
    const args = (0, AGGREGATE_1.transformArguments)(index, query, options);
    args.push('WITHCURSOR');
    if (options?.COUNT) {
        args.push('COUNT', options.COUNT.toString());
    }
    return args;
}
exports.transformArguments = transformArguments;
function transformReply(reply) {
    return {
        ...(0, AGGREGATE_1.transformReply)(reply[0]),
        cursor: reply[1]
    };
}
exports.transformReply = transformReply;
