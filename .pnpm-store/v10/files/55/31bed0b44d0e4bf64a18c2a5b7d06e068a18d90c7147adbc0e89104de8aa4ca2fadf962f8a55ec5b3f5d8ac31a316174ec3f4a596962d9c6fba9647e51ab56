"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.transformArguments = exports.IS_READ_ONLY = exports.FIRST_KEY_INDEX = void 0;
const ZRANDMEMBER_1 = require("./ZRANDMEMBER");
var ZRANDMEMBER_2 = require("./ZRANDMEMBER");
Object.defineProperty(exports, "FIRST_KEY_INDEX", { enumerable: true, get: function () { return ZRANDMEMBER_2.FIRST_KEY_INDEX; } });
Object.defineProperty(exports, "IS_READ_ONLY", { enumerable: true, get: function () { return ZRANDMEMBER_2.IS_READ_ONLY; } });
function transformArguments(key, count) {
    return [
        ...(0, ZRANDMEMBER_1.transformArguments)(key),
        count.toString()
    ];
}
exports.transformArguments = transformArguments;
