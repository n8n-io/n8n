"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.transformReply = exports.transformArguments = exports.IS_READ_ONLY = void 0;
const _1 = require(".");
exports.IS_READ_ONLY = true;
function transformArguments(fromTimestamp, toTimestamp, filters, options) {
    return (0, _1.pushMRangeArguments)(['TS.MREVRANGE'], fromTimestamp, toTimestamp, filters, options);
}
exports.transformArguments = transformArguments;
var _2 = require(".");
Object.defineProperty(exports, "transformReply", { enumerable: true, get: function () { return _2.transformMRangeReply; } });
