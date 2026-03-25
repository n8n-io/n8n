"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.transformReply = exports.transformArguments = exports.IS_READ_ONLY = exports.FIRST_KEY_INDEX = void 0;
exports.FIRST_KEY_INDEX = 1;
exports.IS_READ_ONLY = true;
function transformArguments(key, iterator) {
    return ['BF.SCANDUMP', key, iterator.toString()];
}
exports.transformArguments = transformArguments;
function transformReply([iterator, chunk]) {
    return {
        iterator,
        chunk
    };
}
exports.transformReply = transformReply;
