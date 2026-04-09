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
exports.getSerializedBloomFilterData = exports.setFilterOffset = exports.serializeFilterData = exports.serializeFilterHeaders = exports.createSBBF = void 0;
const parquet_util = __importStar(require("../util"));
const parquet_types_1 = __importDefault(require("../../gen-nodejs/parquet_types"));
const sbbf_1 = __importDefault(require("../bloom/sbbf"));
const createSBBF = (params) => {
    const { numFilterBytes, falsePositiveRate, numDistinct } = params;
    const bloomFilter = new sbbf_1.default();
    const hasOptions = numFilterBytes || falsePositiveRate || numDistinct;
    if (!hasOptions)
        return bloomFilter.init();
    if (numFilterBytes)
        return bloomFilter.setOptionNumFilterBytes(numFilterBytes).init();
    if (falsePositiveRate)
        bloomFilter.setOptionFalsePositiveRate(falsePositiveRate);
    if (numDistinct)
        bloomFilter.setOptionNumDistinct(numDistinct);
    return bloomFilter.init();
};
exports.createSBBF = createSBBF;
const serializeFilterBlocks = (blocks) => Buffer.concat(blocks.map((block) => Buffer.from(block.buffer)));
const buildFilterHeader = (numBytes) => {
    const bloomFilterHeader = new parquet_types_1.default.BloomFilterHeader();
    bloomFilterHeader.numBytes = numBytes;
    bloomFilterHeader.algorithm = new parquet_types_1.default.BloomFilterAlgorithm();
    bloomFilterHeader.hash = new parquet_types_1.default.BloomFilterHash();
    bloomFilterHeader.compression = new parquet_types_1.default.BloomFilterCompression();
    return bloomFilterHeader;
};
const serializeFilterHeaders = (numberOfBytes) => {
    const bloomFilterHeader = buildFilterHeader(numberOfBytes);
    return parquet_util.serializeThrift(bloomFilterHeader);
};
exports.serializeFilterHeaders = serializeFilterHeaders;
const serializeFilterData = (params) => {
    const serializedFilterBlocks = serializeFilterBlocks(params.filterBlocks);
    const serializedFilterHeaders = (0, exports.serializeFilterHeaders)(params.filterByteSize);
    return Buffer.concat([serializedFilterHeaders, serializedFilterBlocks]);
};
exports.serializeFilterData = serializeFilterData;
const setFilterOffset = (column, offset) => {
    column.meta_data.bloom_filter_offset = parquet_util.cloneInteger(offset);
};
exports.setFilterOffset = setFilterOffset;
const getSerializedBloomFilterData = (splitBlockBloomFilter) => {
    const filterBlocks = splitBlockBloomFilter.getFilter();
    const filterByteSize = splitBlockBloomFilter.getNumFilterBytes();
    return (0, exports.serializeFilterData)({ filterBlocks, filterByteSize });
};
exports.getSerializedBloomFilterData = getSerializedBloomFilterData;
