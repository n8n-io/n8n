"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.decompress = exports.compress = exports.argPrefix = void 0;
const zlib_1 = require("zlib");
/** @internal */
exports.argPrefix = '--brotli-base64-config=';
/** @internal */
function compress(object) {
    return (0, zlib_1.brotliCompressSync)(Buffer.from(JSON.stringify(object), 'utf8'), {
        [zlib_1.constants.BROTLI_PARAM_QUALITY]: zlib_1.constants.BROTLI_MIN_QUALITY,
    }).toString('base64');
}
exports.compress = compress;
/** @internal */
function decompress(str) {
    return JSON.parse((0, zlib_1.brotliDecompressSync)(Buffer.from(str, 'base64')).toString());
}
exports.decompress = decompress;
//# sourceMappingURL=argv-payload.js.map