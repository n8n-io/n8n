"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.transformArguments = exports.FIRST_KEY_INDEX = void 0;
exports.FIRST_KEY_INDEX = 1;
function transformArguments(toSet) {
    const args = ['MSET'];
    if (Array.isArray(toSet)) {
        args.push(...toSet.flat());
    }
    else {
        for (const key of Object.keys(toSet)) {
            args.push(key, toSet[key]);
        }
    }
    return args;
}
exports.transformArguments = transformArguments;
