// NOTICE: This is NOT tested by the normal unit tests as this is the browser version
// Needs to be tested manually for now by:
// 1. Load up the example server
// 2. examples/service/README.md
// 3. Test the files
'use strict';
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
exports.PARQUET_COMPRESSION_METHODS = void 0;
exports.deflate = deflate;
exports.inflate = inflate;
const snappyjs_1 = __importDefault(require("snappyjs"));
const brotli = __importStar(require("./brotli.js"));
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
async function deflate_gzip(value) {
    const cs = new CompressionStream('gzip');
    const pipedCs = new Response(value).body?.pipeThrough(cs);
    return buffer_from_result(await new Response(pipedCs).arrayBuffer());
}
function deflate_snappy(value) {
    const compressedValue = snappyjs_1.default.compress(value);
    return buffer_from_result(compressedValue);
}
async function deflate_brotli(value) {
    return buffer_from_result(await brotli.compress(value));
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
    const ds = new DecompressionStream('gzip');
    const pipedDs = new Response(value).body?.pipeThrough(ds);
    return buffer_from_result(await new Response(pipedDs).arrayBuffer());
}
function inflate_snappy(value) {
    const uncompressedValue = snappyjs_1.default.uncompress(value);
    return buffer_from_result(uncompressedValue);
}
async function inflate_brotli(value) {
    return buffer_from_result(await brotli.inflate(value));
}
function buffer_from_result(result) {
    if (Buffer.isBuffer(result)) {
        return result;
    }
    else {
        return Buffer.from(new Uint8Array(result));
    }
}
