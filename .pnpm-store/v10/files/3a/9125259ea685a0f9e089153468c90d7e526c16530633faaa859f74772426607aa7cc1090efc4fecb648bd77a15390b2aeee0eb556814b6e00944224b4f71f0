"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.transformReply = exports.transformArguments = exports.FIRST_KEY_INDEX = void 0;
exports.FIRST_KEY_INDEX = 1;
function transformArguments(key, iterator) {
    return ['CF.SCANDUMP', key, iterator.toString()];
}
exports.transformArguments = transformArguments;
function transformReply([iterator, chunk]) {
    return {
        iterator,
        chunk
    };
}
exports.transformReply = transformReply;
