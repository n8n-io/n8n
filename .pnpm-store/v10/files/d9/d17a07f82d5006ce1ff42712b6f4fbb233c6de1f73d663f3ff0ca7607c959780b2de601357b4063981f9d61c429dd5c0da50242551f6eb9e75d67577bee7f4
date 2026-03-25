"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.transformArguments = exports.RedisFlushModes = void 0;
var RedisFlushModes;
(function (RedisFlushModes) {
    RedisFlushModes["ASYNC"] = "ASYNC";
    RedisFlushModes["SYNC"] = "SYNC";
})(RedisFlushModes || (exports.RedisFlushModes = RedisFlushModes = {}));
function transformArguments(mode) {
    const args = ['FLUSHALL'];
    if (mode) {
        args.push(mode);
    }
    return args;
}
exports.transformArguments = transformArguments;
