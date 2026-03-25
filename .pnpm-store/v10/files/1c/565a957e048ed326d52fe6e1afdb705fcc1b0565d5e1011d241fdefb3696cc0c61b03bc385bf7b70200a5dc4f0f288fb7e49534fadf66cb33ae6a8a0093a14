import express = require("express");

// This module adds a res.flush() method to force the partially-compressed response to be flushed to the client.

declare global {
    namespace Express {
        interface Response {
            /**
             * Forces the partially-compressed response to be flushed to the client.
             */
            flush(): void;
        }
    }
}
/**
 * Returns the compression middleware using the given `options`. The middleware will attempt to compress response bodies
 * for all request that traverse through the middleware, based on the given `options`.
 *
 * This middleware will never compress responses that include a `Cache-Control` header with the `no-transform` directive,
 * as compressing will transform the body.
 *
 * @see {@link https://github.com/expressjs/compression#compressionoptions|`compression([options]) documentation`}
 */
declare function compression(options?: compression.CompressionOptions): express.RequestHandler;

declare namespace compression {
    /**
     * The default `filter` function. This is used to construct a custom filter function that is an extension of the default function.
     *
     * ```js
     * var compression = require('compression')
     * var express = require('express')
     *
     * var app = express()
     * app.use(compression({ filter: shouldCompress }))
     *
     * function shouldCompress (req, res) {
     *   if (req.headers['x-no-compression']) {
     *     // don't compress responses with this request header
     *     return false
     *   }
     *
     *   // fallback to standard filter function
     *   return compression.filter(req, res)
     * }
     * ```
     *
     * @see {@link https://github.com/expressjs/compression#filter-1|`.filter` documentation}
     */
    function filter(req: express.Request, res: express.Response): boolean;

    /**
     * A function to decide if the response should be considered for compression.
     */
    interface CompressionFilter {
        (req: express.Request, res: express.Response): boolean;
    }

    /**
     * compression() accepts these properties in the options object.
     * In addition to those listed below, `zlib` options may be passed in to the options object.
     */
    interface CompressionOptions {
        /**
         * @default zlib.constants.Z_DEFAULT_CHUNK or 16384
         * @see {@link https://nodejs.org/api/zlib.html#zlib_memory_usage_tuning| Node.js documentation}
         * @see {@link https://github.com/expressjs/compression#chunksize|chunkSize documentation}
         */
        chunkSize?: number | undefined;

        /**
         * A function to decide if the response should be considered for compression. This function is called as
         * `filter(req, res)` and is expected to return `true` to consider the response for compression, or `false` to
         * not compress the response.
         *
         * The default filter function uses the `compressible` module to determine if `res.getHeader('Content-Type')`
         * is compressible.
         *
         * @see {@link https://github.com/expressjs/compression#filter|`filter` documentation}
         * @see {@link https://www.npmjs.com/package/compressible|compressible module}
         */
        filter?: CompressionFilter | undefined;

        /**
         * The level of zlib compression to apply to responses. A higher level will result in better compression, but
         * will take longer to complete. A lower level will result in less compression, but will be much faster.
         *
         * This is an integer in the range of `0` (no compression) to `9` (maximum compression). The special value `-1`
         * can be used to mean the "default compression level", which is a default compromise between speed and
         * compression (currently equivalent to level 6).
         *
         * - `-1` Default compression level (also `zlib.constants.Z_DEFAULT_COMPRESSION`).
         * - `0` No compression (also `zlib.constants.Z_NO_COMPRESSION`).
         * - `1` Fastest compression (also `zlib.constants.Z_BEST_SPEED`).
         * - `2`
         * - `3`
         * - `4`
         * - `5`
         * - `6` (currently what `zlib.constants.Z_DEFAULT_COMPRESSION` points to).
         * - `7`
         * - `8`
         * - `9` Best compression (also `zlib.constants.Z_BEST_COMPRESSION`).
         *
         * **Note** in the list above, `zlib` is from `zlib = require('zlib')`.
         *
         * @default zlib.constants.DEFAULT_COMPRESSION or -1
         * @see {@link https://github.com/expressjs/compression#level|`level` documentation}
         */
        level?: number | undefined;

        /**
         * This specifies how much memory should be allocated for the internal compression state and is an integer in
         * the range of `1` (minimum level) and `9` (maximum level).
         *
         * @default zlib.constants.DEFAULT_MEMLEVEL or 8
         * @see {@link https://nodejs.org/api/zlib.html#zlib_memory_usage_tuning|Node.js documentation}
         * @see {@link https://github.com/expressjs/compression#memlevel|`memLevel` documentation}
         */
        memLevel?: number | undefined;

        /**
         * This is used to tune the compression algorithm. This value only affects the compression ratio, not the
         * correctness of the compressed output, even if it is not set appropriately.
         *
         * - `zlib.constants.Z_DEFAULT_STRATEGY` Use for normal data.
         * - `zlib.constants.Z_FILTERED` Use for data produced by a filter (or predictor). Filtered data consists mostly of small
         *   values with a somewhat random distribution. In this case, the compression algorithm is tuned to compress
         *   them better. The effect is to force more Huffman coding and less string matching; it is somewhat intermediate
         *   between `zlib.constants.Z_DEFAULT_STRATEGY` and `zlib.constants.Z_HUFFMAN_ONLY`.
         * - `zlib.constants.Z_FIXED` Use to prevent the use of dynamic Huffman codes, allowing for a simpler decoder for special applications.
         * - `zlib.constants.Z_HUFFMAN_ONLY` Use to force Huffman encoding only (no string match).
         * - `zlib.constants.Z_RLE` Use to limit match distances to one (run-length encoding). This is designed to be almost as
         *    fast as `zlib.constants.Z_HUFFMAN_ONLY`, but give better compression for PNG image data.
         *
         * **Note** in the list above, `zlib` is from `zlib = require('zlib')`.
         */
        strategy?: number | undefined;

        /**
         * The byte threshold for the response body size before compression is considered for the response, defaults to
         * 1kb. This is a number of bytes or any string accepted by the bytes module.
         *
         * **Note** this is only an advisory setting; if the response size cannot be determined at the time the response
         * headers are written, then it is assumed the response is *over* the threshold. To guarantee the response size
         * can be determined, be sure set a `Content-Length` response header.
         *
         * @see {@link https://www.npmjs.com/package/bytes|`bytes` module}
         * @see {@link https://github.com/expressjs/compression#threshold|`threshold` documentation}
         */
        threshold?: number | string | undefined;

        /**
         * @default zlib.constants.Z_DEFAULT_WINDOWBITS or 15.
         * @see {@link https://nodejs.org/api/zlib.html#zlib_memory_usage_tuning|Node.js documentation}
         */
        windowBits?: number | undefined;
        /**
         * In addition , `zlib` options may be passed in to the options object.
         */
        [property: string]: any;
    }
}

export = compression;
