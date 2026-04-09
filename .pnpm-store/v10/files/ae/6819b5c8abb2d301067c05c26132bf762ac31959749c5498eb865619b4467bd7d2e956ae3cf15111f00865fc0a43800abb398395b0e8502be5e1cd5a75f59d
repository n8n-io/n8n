"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getEncoding = exports.DecodeStream = void 0;
exports.decodeBuffer = decodeBuffer;
const node_stream_1 = require("node:stream");
const iconv_lite_1 = __importDefault(require("iconv-lite"));
const sniffer_js_1 = require("./sniffer.js");
/**
 * Sniff the encoding of a buffer, then decode it.
 *
 * @param buffer Buffer to be decoded
 * @param options Options for the sniffer
 * @returns The decoded buffer
 */
function decodeBuffer(buffer, options = {}) {
    return iconv_lite_1.default.decode(buffer, (0, sniffer_js_1.getEncoding)(buffer, options));
}
/**
 * Decodes a stream of buffers into a stream of strings.
 *
 * Reads the first 1024 bytes and passes them to the sniffer. Once an encoding
 * has been determined, it passes all data to iconv-lite's stream and outputs
 * the results.
 */
class DecodeStream extends node_stream_1.Transform {
    constructor(options) {
        var _a;
        super({ decodeStrings: false, encoding: "utf-8" });
        this.buffers = [];
        /** The iconv decode stream. If it is set, we have read more than `options.maxBytes` bytes. */
        this.iconv = null;
        this.readBytes = 0;
        this.sniffer = new sniffer_js_1.Sniffer(options);
        this.maxBytes = (_a = options === null || options === void 0 ? void 0 : options.maxBytes) !== null && _a !== void 0 ? _a : 1024;
    }
    _transform(chunk, _encoding, callback) {
        if (this.readBytes < this.maxBytes) {
            this.sniffer.write(chunk);
            this.readBytes += chunk.length;
            if (this.readBytes < this.maxBytes) {
                this.buffers.push(chunk);
                callback();
                return;
            }
        }
        this.getIconvStream().write(chunk, callback);
    }
    getIconvStream() {
        if (this.iconv) {
            return this.iconv;
        }
        const stream = iconv_lite_1.default.decodeStream(this.sniffer.encoding);
        stream.on("data", (chunk) => this.push(chunk, "utf-8"));
        stream.on("end", () => this.push(null));
        this.iconv = stream;
        for (const buffer of this.buffers) {
            stream.write(buffer);
        }
        this.buffers.length = 0;
        return stream;
    }
    _flush(callback) {
        this.getIconvStream().end(callback);
    }
}
exports.DecodeStream = DecodeStream;
var sniffer_js_2 = require("./sniffer.js");
Object.defineProperty(exports, "getEncoding", { enumerable: true, get: function () { return sniffer_js_2.getEncoding; } });
//# sourceMappingURL=index.js.map