"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PARQUET_COMPRESSION_METHODS = void 0;
exports.deflate = deflate;
exports.inflate = inflate;
// NOTICE: This is the NodeJS implementation.
// The browser implementation is ./browser/compression.ts
const zlib_1 = __importDefault(require("zlib"));
const snappyjs_1 = __importDefault(require("snappyjs"));
// LZO compression is disabled. See: https://github.com/LibertyDSNP/parquetjs/issues/18
exports.PARQUET_COMPRESSION_METHODS = {
    UNCOMPRESSED: {
        deflate: deflate_identity,
        inflate: inflate_identity,
    },
    GZIP: {
        deflate: deflate_gzip,
        inflate: inflate_gzip,
    },
    SNAPPY: {
        deflate: deflate_snappy,
        inflate: inflate_snappy,
    },
    BROTLI: {
        deflate: deflate_brotli,
        inflate: inflate_brotli,
    },
};
/**
 * Deflate a value using compression method `method`
 */
async function deflate(method, value) {
    if (!(method in exports.PARQUET_COMPRESSION_METHODS)) {
        throw new Error('invalid compression method: ' + method);
    }
    return exports.PARQUET_COMPRESSION_METHODS[method].deflate(value);
}
function deflate_identity(value) {
    return buffer_from_result(value);
}
function deflate_gzip(value) {
    return zlib_1.default.gzipSync(value);
}
function deflate_snappy(value) {
    const compressedValue = snappyjs_1.default.compress(value);
    return buffer_from_result(compressedValue);
}
async function deflate_brotli(value) {
    return zlib_1.default.brotliCompressSync(value);
}
/**
 * Inflate a value using compression method `method`
 */
async function inflate(method, value) {
    if (!(method in exports.PARQUET_COMPRESSION_METHODS)) {
        throw new Error('invalid compression method: ' + method);
    }
    return await exports.PARQUET_COMPRESSION_METHODS[method].inflate(value);
}
async function inflate_identity(value) {
    return buffer_from_result(value);
}
async function inflate_gzip(value) {
    return zlib_1.default.gunzipSync(value);
}
function inflate_snappy(value) {
    const uncompressedValue = snappyjs_1.default.uncompress(value);
    return buffer_from_result(uncompressedValue);
}
async function inflate_brotli(value) {
    return zlib_1.default.brotliDecompressSync(value);
}
function buffer_from_result(result) {
    if (Buffer.isBuffer(result)) {
        return result;
    }
    else {
        return Buffer.from(new Uint8Array(result));
    }
}
