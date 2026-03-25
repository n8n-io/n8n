"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.transformArguments = exports.FIRST_KEY_INDEX = void 0;
const _1 = require(".");
exports.FIRST_KEY_INDEX = 1;
function transformArguments(toAdd) {
    const args = ['TS.MADD'];
    for (const { key, timestamp, value } of toAdd) {
        args.push(key, (0, _1.transformTimestampArgument)(timestamp), value.toString());
    }
    return args;
}
exports.transformArguments = transformArguments;
