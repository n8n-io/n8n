"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.transformArguments = exports.FIRST_KEY_INDEX = void 0;
exports.FIRST_KEY_INDEX = 1;
function transformArguments(sourceKey, destinationKey, aggregationType, bucketDuration, alignTimestamp) {
    const args = [
        'TS.CREATERULE',
        sourceKey,
        destinationKey,
        'AGGREGATION',
        aggregationType,
        bucketDuration.toString()
    ];
    if (alignTimestamp) {
        args.push(alignTimestamp.toString());
    }
    return args;
}
exports.transformArguments = transformArguments;
