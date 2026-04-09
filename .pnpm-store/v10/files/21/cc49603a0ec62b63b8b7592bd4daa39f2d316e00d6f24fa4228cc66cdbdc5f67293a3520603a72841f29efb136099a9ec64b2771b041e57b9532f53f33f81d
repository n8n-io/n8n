"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getBloomFiltersFor = exports.siftAllByteOffsets = exports.parseBloomFilterOffsets = void 0;
const parquet_util = __importStar(require("../util"));
const parquet_types_1 = __importDefault(require("../../gen-nodejs/parquet_types"));
const sbbf_1 = __importDefault(require("../bloom/sbbf"));
const filterColumnChunksWithBloomFilters = (columnChunkDataCollection) => {
    return columnChunkDataCollection.filter((columnChunk) => {
        return columnChunk.column.meta_data?.bloom_filter_offset;
    });
};
const toInteger = (buffer) => {
    const integer = parseInt(buffer.toString('hex'), 16);
    if (integer >= Number.MAX_VALUE) {
        throw Error('Number exceeds Number.MAX_VALUE: Godspeed');
    }
    return integer;
};
const parseBloomFilterOffsets = (ColumnChunkDataCollection) => {
    return ColumnChunkDataCollection.map(({ rowGroupIndex, column }) => {
        const { bloom_filter_offset: bloomOffset, path_in_schema: pathInSchema } = column.meta_data || {};
        return {
            offsetBytes: toInteger(bloomOffset.buffer),
            columnName: pathInSchema.join(','),
            rowGroupIndex,
        };
    });
};
exports.parseBloomFilterOffsets = parseBloomFilterOffsets;
const getBloomFilterHeader = async (offsetBytes, envelopeReader) => {
    const headerByteSizeEstimate = 200;
    let bloomFilterHeaderData;
    try {
        bloomFilterHeaderData = await envelopeReader.read(offsetBytes, headerByteSizeEstimate);
    }
    catch (e) {
        if (typeof e === 'string')
            throw new Error(e);
        else
            throw e;
    }
    const bloomFilterHeader = new parquet_types_1.default.BloomFilterHeader();
    const sizeOfBloomFilterHeader = parquet_util.decodeThrift(bloomFilterHeader, bloomFilterHeaderData);
    return {
        bloomFilterHeader,
        sizeOfBloomFilterHeader,
    };
};
const readFilterData = async (offsetBytes, envelopeReader) => {
    const { bloomFilterHeader, sizeOfBloomFilterHeader } = await getBloomFilterHeader(offsetBytes, envelopeReader);
    const { numBytes: filterByteSize } = bloomFilterHeader;
    try {
        const filterBlocksOffset = offsetBytes + sizeOfBloomFilterHeader;
        const buffer = await envelopeReader.read(filterBlocksOffset, filterByteSize);
        return buffer;
    }
    catch (e) {
        if (typeof e === 'string')
            throw new Error(e);
        else
            throw e;
    }
};
const readFilterDataFrom = (offsets, envelopeReader) => {
    return Promise.all(offsets.map((offset) => readFilterData(offset, envelopeReader)));
};
const siftAllByteOffsets = (columnChunkDataCollection) => {
    return (0, exports.parseBloomFilterOffsets)(filterColumnChunksWithBloomFilters(columnChunkDataCollection));
};
exports.siftAllByteOffsets = siftAllByteOffsets;
const getBloomFiltersFor = async (paths, envelopeReader) => {
    const columnChunkDataCollection = envelopeReader.getAllColumnChunkDataFor(paths);
    const bloomFilterOffsetData = (0, exports.siftAllByteOffsets)(columnChunkDataCollection);
    const offsetByteValues = bloomFilterOffsetData.map(({ offsetBytes }) => offsetBytes);
    const filterBlocksBuffers = await readFilterDataFrom(offsetByteValues, envelopeReader);
    return filterBlocksBuffers.map((buffer, index) => {
        const { columnName, rowGroupIndex } = bloomFilterOffsetData[index];
        return {
            sbbf: sbbf_1.default.from(buffer),
            columnName,
            rowGroupIndex,
        };
    });
};
exports.getBloomFiltersFor = getBloomFiltersFor;
