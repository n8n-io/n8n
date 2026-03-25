"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.transformReply = exports.transformArguments = void 0;
const generic_transformers_1 = require("@redis/client/dist/lib/commands/generic-transformers");
function transformArguments(index) {
    return ['FT.INFO', index];
}
exports.transformArguments = transformArguments;
function transformReply(rawReply) {
    return {
        indexName: rawReply[1],
        indexOptions: rawReply[3],
        indexDefinition: (0, generic_transformers_1.transformTuplesReply)(rawReply[5]),
        attributes: rawReply[7].map(attribute => (0, generic_transformers_1.transformTuplesReply)(attribute)),
        numDocs: rawReply[9],
        maxDocId: rawReply[11],
        numTerms: rawReply[13],
        numRecords: rawReply[15],
        invertedSzMb: rawReply[17],
        vectorIndexSzMb: rawReply[19],
        totalInvertedIndexBlocks: rawReply[21],
        offsetVectorsSzMb: rawReply[23],
        docTableSizeMb: rawReply[25],
        sortableValuesSizeMb: rawReply[27],
        keyTableSizeMb: rawReply[29],
        recordsPerDocAvg: rawReply[31],
        bytesPerRecordAvg: rawReply[33],
        offsetsPerTermAvg: rawReply[35],
        offsetBitsPerRecordAvg: rawReply[37],
        hashIndexingFailures: rawReply[39],
        indexing: rawReply[41],
        percentIndexed: rawReply[43],
        gcStats: {
            bytesCollected: rawReply[45][1],
            totalMsRun: rawReply[45][3],
            totalCycles: rawReply[45][5],
            averageCycleTimeMs: rawReply[45][7],
            lastRunTimeMs: rawReply[45][9],
            gcNumericTreesMissed: rawReply[45][11],
            gcBlocksDenied: rawReply[45][13]
        },
        cursorStats: {
            globalIdle: rawReply[47][1],
            globalTotal: rawReply[47][3],
            indexCapacity: rawReply[47][5],
            idnexTotal: rawReply[47][7]
        },
        stopWords: rawReply[49]
    };
}
exports.transformReply = transformReply;
