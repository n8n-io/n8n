"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.transformArguments = exports.IS_READ_ONLY = exports.FIRST_KEY_INDEX = void 0;
exports.FIRST_KEY_INDEX = 1;
exports.IS_READ_ONLY = true;
function transformArguments(key, topK, options) {
    const args = ['TOPK.RESERVE', key, topK.toString()];
    if (options) {
        args.push(options.width.toString(), options.depth.toString(), options.decay.toString());
    }
    return args;
}
exports.transformArguments = transformArguments;
