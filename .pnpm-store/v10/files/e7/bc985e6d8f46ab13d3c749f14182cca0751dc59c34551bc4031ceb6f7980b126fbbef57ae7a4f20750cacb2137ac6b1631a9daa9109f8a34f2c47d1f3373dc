"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.transformReply = exports.transformArguments = void 0;
function transformArguments() {
    return ['FUNCTION', 'STATS'];
}
exports.transformArguments = transformArguments;
function transformReply(reply) {
    const engines = Object.create(null);
    for (let i = 0; i < reply[3].length; i++) {
        engines[reply[3][i]] = {
            librariesCount: reply[3][++i][1],
            functionsCount: reply[3][i][3]
        };
    }
    return {
        runningScript: reply[1] === null ? null : {
            name: reply[1][1],
            command: reply[1][3],
            durationMs: reply[1][5]
        },
        engines
    };
}
exports.transformReply = transformReply;
