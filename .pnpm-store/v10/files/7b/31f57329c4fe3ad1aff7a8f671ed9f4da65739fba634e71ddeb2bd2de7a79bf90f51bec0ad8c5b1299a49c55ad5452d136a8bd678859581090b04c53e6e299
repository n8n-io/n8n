"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.transformReply = exports.transformArguments = exports.IS_READ_ONLY = exports.FIRST_KEY_INDEX = void 0;
exports.FIRST_KEY_INDEX = 1;
exports.IS_READ_ONLY = true;
function transformArguments(key) {
    return ['TS.INFO', key];
}
exports.transformArguments = transformArguments;
function transformReply(reply) {
    return {
        totalSamples: reply[1],
        memoryUsage: reply[3],
        firstTimestamp: reply[5],
        lastTimestamp: reply[7],
        retentionTime: reply[9],
        chunkCount: reply[11],
        chunkSize: reply[13],
        chunkType: reply[15],
        duplicatePolicy: reply[17],
        labels: reply[19].map(([name, value]) => ({
            name,
            value
        })),
        sourceKey: reply[21],
        rules: reply[23].map(([key, timeBucket, aggregationType]) => ({
            key,
            timeBucket,
            aggregationType
        }))
    };
}
exports.transformReply = transformReply;
