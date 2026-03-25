"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.transformArguments = exports.FIRST_KEY_INDEX = void 0;
const generic_transformers_1 = require("./generic-transformers");
exports.FIRST_KEY_INDEX = 1;
function transformArguments(key, mode) {
    const args = ['GETEX', key];
    if ('EX' in mode) {
        args.push('EX', mode.EX.toString());
    }
    else if ('PX' in mode) {
        args.push('PX', mode.PX.toString());
    }
    else if ('EXAT' in mode) {
        args.push('EXAT', (0, generic_transformers_1.transformEXAT)(mode.EXAT));
    }
    else if ('PXAT' in mode) {
        args.push('PXAT', (0, generic_transformers_1.transformPXAT)(mode.PXAT));
    }
    else { // PERSIST
        args.push('PERSIST');
    }
    return args;
}
exports.transformArguments = transformArguments;
