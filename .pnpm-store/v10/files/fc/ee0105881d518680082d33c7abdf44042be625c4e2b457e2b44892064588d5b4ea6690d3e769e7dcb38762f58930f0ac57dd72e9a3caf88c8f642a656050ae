"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.transformReply = exports.transformArguments = exports.IS_READ_ONLY = exports.FIRST_KEY_INDEX = void 0;
const FIRST_KEY_INDEX = (streams) => {
    return Array.isArray(streams) ? streams[0].key : streams.key;
};
exports.FIRST_KEY_INDEX = FIRST_KEY_INDEX;
exports.IS_READ_ONLY = true;
function transformArguments(streams, options) {
    const args = ['XREAD'];
    if (options?.COUNT) {
        args.push('COUNT', options.COUNT.toString());
    }
    if (typeof options?.BLOCK === 'number') {
        args.push('BLOCK', options.BLOCK.toString());
    }
    args.push('STREAMS');
    const streamsArray = Array.isArray(streams) ? streams : [streams], argsLength = args.length;
    for (let i = 0; i < streamsArray.length; i++) {
        const stream = streamsArray[i];
        args[argsLength + i] = stream.key;
        args[argsLength + streamsArray.length + i] = stream.id;
    }
    return args;
}
exports.transformArguments = transformArguments;
var generic_transformers_1 = require("./generic-transformers");
Object.defineProperty(exports, "transformReply", { enumerable: true, get: function () { return generic_transformers_1.transformStreamsMessagesReply; } });
