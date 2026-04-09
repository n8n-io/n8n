import { Transform } from "node:stream";
import iconv from "iconv-lite";
import { Sniffer, getEncoding } from "./sniffer.js";
/**
 * Sniff the encoding of a buffer, then decode it.
 *
 * @param buffer Buffer to be decoded
 * @param options Options for the sniffer
 * @returns The decoded buffer
 */
export function decodeBuffer(buffer, options = {}) {
    return iconv.decode(buffer, getEncoding(buffer, options));
}
/**
 * Decodes a stream of buffers into a stream of strings.
 *
 * Reads the first 1024 bytes and passes them to the sniffer. Once an encoding
 * has been determined, it passes all data to iconv-lite's stream and outputs
 * the results.
 */
export class DecodeStream extends Transform {
    constructor(options) {
        var _a;
        super({ decodeStrings: false, encoding: "utf-8" });
        this.buffers = [];
        /** The iconv decode stream. If it is set, we have read more than `options.maxBytes` bytes. */
        this.iconv = null;
        this.readBytes = 0;
        this.sniffer = new Sniffer(options);
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
        const stream = iconv.decodeStream(this.sniffer.encoding);
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
export { getEncoding } from "./sniffer.js";
//# sourceMappingURL=index.js.map