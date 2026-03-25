"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChecksumStream = void 0;
const util_base64_1 = require("@smithy/util-base64");
const stream_1 = require("stream");
class ChecksumStream extends stream_1.Duplex {
    constructor({ expectedChecksum, checksum, source, checksumSourceLocation, base64Encoder, }) {
        var _a, _b;
        super();
        if (typeof source.pipe === "function") {
            this.source = source;
        }
        else {
            throw new Error(`@smithy/util-stream: unsupported source type ${(_b = (_a = source === null || source === void 0 ? void 0 : source.constructor) === null || _a === void 0 ? void 0 : _a.name) !== null && _b !== void 0 ? _b : source} in ChecksumStream.`);
        }
        this.base64Encoder = base64Encoder !== null && base64Encoder !== void 0 ? base64Encoder : util_base64_1.toBase64;
        this.expectedChecksum = expectedChecksum;
        this.checksum = checksum;
        this.checksumSourceLocation = checksumSourceLocation;
        this.source.pipe(this);
    }
    _read(size) { }
    _write(chunk, encoding, callback) {
        try {
            this.checksum.update(chunk);
            this.push(chunk);
        }
        catch (e) {
            return callback(e);
        }
        return callback();
    }
    async _final(callback) {
        try {
            const digest = await this.checksum.digest();
            const received = this.base64Encoder(digest);
            if (this.expectedChecksum !== received) {
                return callback(new Error(`Checksum mismatch: expected "${this.expectedChecksum}" but received "${received}"` +
                    ` in response header "${this.checksumSourceLocation}".`));
            }
        }
        catch (e) {
            return callback(e);
        }
        this.push(null);
        return callback();
    }
}
exports.ChecksumStream = ChecksumStream;
