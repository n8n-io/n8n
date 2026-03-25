"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deflate = exports.inflate = void 0;
const util_1 = require("util");
const zlib_1 = require("zlib");
const errors_js_1 = require("../util/errors.js");
const inflateRaw = (0, util_1.promisify)(zlib_1.inflateRaw);
const deflateRaw = (0, util_1.promisify)(zlib_1.deflateRaw);
const inflate = (input) => inflateRaw(input, { maxOutputLength: 250000 }).catch(() => {
    throw new errors_js_1.JWEDecompressionFailed();
});
exports.inflate = inflate;
const deflate = (input) => deflateRaw(input);
exports.deflate = deflate;
