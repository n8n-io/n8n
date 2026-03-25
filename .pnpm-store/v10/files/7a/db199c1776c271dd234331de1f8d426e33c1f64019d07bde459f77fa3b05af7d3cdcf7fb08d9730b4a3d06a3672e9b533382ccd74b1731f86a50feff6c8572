"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.extractLineValue = exports.transformReply = exports.transformArguments = void 0;
function transformArguments() {
    return ['CLUSTER', 'INFO'];
}
exports.transformArguments = transformArguments;
function transformReply(reply) {
    const lines = reply.split('\r\n');
    return {
        state: extractLineValue(lines[0]),
        slots: {
            assigned: Number(extractLineValue(lines[1])),
            ok: Number(extractLineValue(lines[2])),
            pfail: Number(extractLineValue(lines[3])),
            fail: Number(extractLineValue(lines[4]))
        },
        knownNodes: Number(extractLineValue(lines[5])),
        size: Number(extractLineValue(lines[6])),
        currentEpoch: Number(extractLineValue(lines[7])),
        myEpoch: Number(extractLineValue(lines[8])),
        stats: {
            messagesSent: Number(extractLineValue(lines[9])),
            messagesReceived: Number(extractLineValue(lines[10]))
        }
    };
}
exports.transformReply = transformReply;
function extractLineValue(line) {
    return line.substring(line.indexOf(':') + 1);
}
exports.extractLineValue = extractLineValue;
