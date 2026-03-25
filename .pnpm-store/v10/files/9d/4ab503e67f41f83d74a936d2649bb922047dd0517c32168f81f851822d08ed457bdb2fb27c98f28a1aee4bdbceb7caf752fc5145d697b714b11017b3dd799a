"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.transformArguments = exports.FIRST_KEY_INDEX = void 0;
exports.FIRST_KEY_INDEX = 1;
function transformArguments(key, lastId, options) {
    const args = ['XSETID', key, lastId];
    if (options?.ENTRIESADDED) {
        args.push('ENTRIESADDED', options.ENTRIESADDED.toString());
    }
    if (options?.MAXDELETEDID) {
        args.push('MAXDELETEDID', options.MAXDELETEDID);
    }
    return args;
}
exports.transformArguments = transformArguments;
