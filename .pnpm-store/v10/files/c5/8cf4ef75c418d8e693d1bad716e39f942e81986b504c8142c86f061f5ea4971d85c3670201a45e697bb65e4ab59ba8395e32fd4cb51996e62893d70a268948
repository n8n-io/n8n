"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.transformArguments = exports.IS_READ_ONLY = exports.FIRST_KEY_INDEX = void 0;
var LPOS_1 = require("./LPOS");
Object.defineProperty(exports, "FIRST_KEY_INDEX", { enumerable: true, get: function () { return LPOS_1.FIRST_KEY_INDEX; } });
Object.defineProperty(exports, "IS_READ_ONLY", { enumerable: true, get: function () { return LPOS_1.IS_READ_ONLY; } });
function transformArguments(key, element, count, options) {
    const args = ['LPOS', key, element];
    if (typeof options?.RANK === 'number') {
        args.push('RANK', options.RANK.toString());
    }
    args.push('COUNT', count.toString());
    if (typeof options?.MAXLEN === 'number') {
        args.push('MAXLEN', options.MAXLEN.toString());
    }
    return args;
}
exports.transformArguments = transformArguments;
