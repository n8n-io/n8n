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
exports.compress = compress;
exports.inflate = inflate;
// Thanks to https://github.com/httptoolkit/brotli-wasm/issues/8#issuecomment-1746768478
const brotli_wasm_js_1 = __importStar(require("../../node_modules/brotli-wasm/pkg.web/brotli_wasm.js")), brotliWasm = brotli_wasm_js_1;
const brotli_wasm_bg_wasm_1 = __importDefault(require("../../node_modules/brotli-wasm/pkg.web/brotli_wasm_bg.wasm"));
const brotliPromise = (0, brotli_wasm_js_1.default)(brotli_wasm_bg_wasm_1.default).then(() => brotliWasm);
// We chunk to protect the wasm memory
const OUTPUT_SIZE = 131_072;
function mergeUint8Arrays(arrs, totalLength) {
    const output = new Uint8Array(totalLength);
    let priorLength = 0;
    for (const arr of arrs) {
        output.set(arr, priorLength);
        priorLength += arr.length;
    }
    return output;
}
async function compress(input) {
    // Get a stream for your input:
    const inputStream = new ReadableStream({
        start(controller) {
            controller.enqueue(input);
            controller.close();
        },
    });
    // Create a stream to incrementally compress the data as it streams:
    const brotli = await brotliPromise;
    const compressStream = new brotli.CompressStream();
    const compressionStream = new TransformStream({
        transform(chunk, controller) {
            let resultCode;
            let inputOffset = 0;
            // Compress this chunk, producing up to OUTPUT_SIZE output bytes at a time, until the
            // entire input has been compressed.
            do {
                const inputChunk = chunk.slice(inputOffset);
                const result = compressStream.compress(inputChunk, OUTPUT_SIZE);
                controller.enqueue(result.buf);
                resultCode = result.code;
                inputOffset += result.input_offset;
            } while (resultCode === brotli.BrotliStreamResultCode.NeedsMoreOutput);
            if (resultCode !== brotli.BrotliStreamResultCode.NeedsMoreInput) {
                controller.error(`Brotli compression failed when transforming with code ${resultCode}`);
            }
        },
        flush(controller) {
            // Once the chunks are finished, flush any remaining data (again in repeated fixed-output
            // chunks) to finish the stream:
            let resultCode;
            do {
                const result = compressStream.compress(undefined, OUTPUT_SIZE);
                controller.enqueue(result.buf);
                resultCode = result.code;
            } while (resultCode === brotli.BrotliStreamResultCode.NeedsMoreOutput);
            if (resultCode !== brotli.BrotliStreamResultCode.ResultSuccess) {
                controller.error(`Brotli compression failed when flushing with code ${resultCode}`);
            }
            controller.terminate();
        },
    });
    const outputs = [];
    let outputLength = 0;
    const outputStream = new WritableStream({
        write(chunk) {
            outputs.push(chunk);
            outputLength += chunk.length;
        },
    });
    await inputStream.pipeThrough(compressionStream).pipeTo(outputStream);
    return mergeUint8Arrays(outputs, outputLength);
}
async function inflate(input) {
    // Get a stream for your input:
    const inputStream = new ReadableStream({
        start(controller) {
            controller.enqueue(input);
            controller.close();
        },
    });
    const brotli = await brotliPromise;
    const decompressStream = new brotli.DecompressStream();
    const decompressionStream = new TransformStream({
        transform(chunk, controller) {
            let resultCode;
            let inputOffset = 0;
            // Decompress this chunk, producing up to OUTPUT_SIZE output bytes at a time, until the
            // entire input has been decompressed.
            do {
                const inputChunk = chunk.slice(inputOffset);
                const result = decompressStream.decompress(inputChunk, OUTPUT_SIZE);
                controller.enqueue(result.buf);
                resultCode = result.code;
                inputOffset += result.input_offset;
            } while (resultCode === brotli.BrotliStreamResultCode.NeedsMoreOutput);
            if (resultCode !== brotli.BrotliStreamResultCode.NeedsMoreInput &&
                resultCode !== brotli.BrotliStreamResultCode.ResultSuccess) {
                controller.error(`Brotli decompression failed with code ${resultCode}`);
            }
        },
        flush(controller) {
            controller.terminate();
        },
    });
    const outputs = [];
    let outputLength = 0;
    const outputStream = new WritableStream({
        write(chunk) {
            outputs.push(chunk);
            outputLength += chunk.length;
        },
    });
    await inputStream.pipeThrough(decompressionStream).pipeTo(outputStream);
    return mergeUint8Arrays(outputs, outputLength);
}
