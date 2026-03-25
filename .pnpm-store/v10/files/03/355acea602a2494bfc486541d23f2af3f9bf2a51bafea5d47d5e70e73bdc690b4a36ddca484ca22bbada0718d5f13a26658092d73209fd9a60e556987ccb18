"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.transformReply = exports.transformArguments = exports.FIRST_KEY_INDEX = exports.IS_READ_ONLY = void 0;
const INFO_1 = require("./INFO");
var INFO_2 = require("./INFO");
Object.defineProperty(exports, "IS_READ_ONLY", { enumerable: true, get: function () { return INFO_2.IS_READ_ONLY; } });
Object.defineProperty(exports, "FIRST_KEY_INDEX", { enumerable: true, get: function () { return INFO_2.FIRST_KEY_INDEX; } });
function transformArguments(key) {
    const args = (0, INFO_1.transformArguments)(key);
    args.push('DEBUG');
    return args;
}
exports.transformArguments = transformArguments;
function transformReply(rawReply) {
    const reply = (0, INFO_1.transformReply)(rawReply);
    reply.keySelfName = rawReply[25];
    reply.chunks = rawReply[27].map(chunk => ({
        startTimestamp: chunk[1],
        endTimestamp: chunk[3],
        samples: chunk[5],
        size: chunk[7],
        bytesPerSample: chunk[9]
    }));
    return reply;
}
exports.transformReply = transformReply;
