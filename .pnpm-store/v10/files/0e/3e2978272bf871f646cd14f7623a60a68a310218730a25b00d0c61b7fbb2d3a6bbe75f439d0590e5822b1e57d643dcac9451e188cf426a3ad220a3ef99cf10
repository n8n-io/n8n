"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.transformReply = exports.transformArguments = exports.FIRST_KEY_INDEX = void 0;
const XAUTOCLAIM_1 = require("./XAUTOCLAIM");
var XAUTOCLAIM_2 = require("./XAUTOCLAIM");
Object.defineProperty(exports, "FIRST_KEY_INDEX", { enumerable: true, get: function () { return XAUTOCLAIM_2.FIRST_KEY_INDEX; } });
function transformArguments(...args) {
    return [
        ...(0, XAUTOCLAIM_1.transformArguments)(...args),
        'JUSTID'
    ];
}
exports.transformArguments = transformArguments;
function transformReply(reply) {
    return {
        nextId: reply[0],
        messages: reply[1]
    };
}
exports.transformReply = transformReply;
