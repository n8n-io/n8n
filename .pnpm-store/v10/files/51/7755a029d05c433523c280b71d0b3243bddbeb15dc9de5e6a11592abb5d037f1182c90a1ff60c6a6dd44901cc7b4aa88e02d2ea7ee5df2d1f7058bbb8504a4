"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getEncoding = exports.DecodeStream = exports.decodeBuffer = void 0;
var node_stream_1 = require("node:stream");
var iconv_lite_1 = __importDefault(require("iconv-lite"));
var sniffer_js_1 = require("./sniffer.js");
/**
 * Sniff the encoding of a buffer, then decode it.
 *
 * @param buffer Buffer to be decoded
 * @param options Options for the sniffer
 * @returns The decoded buffer
 */
function decodeBuffer(buffer, options) {
    if (options === void 0) { options = {}; }
    return iconv_lite_1.default.decode(buffer, (0, sniffer_js_1.getEncoding)(buffer, options));
}
exports.decodeBuffer = decodeBuffer;
/**
 * Decodes a stream of buffers into a stream of strings.
 *
 * Reads the first 1024 bytes and passes them to the sniffer. Once an encoding
 * has been determined, it passes all data to iconv-lite's stream and outputs
 * the results.
 */
var DecodeStream = /** @class */ (function (_super) {
    __extends(DecodeStream, _super);
    function DecodeStream(options) {
        var _a;
        var _this = _super.call(this, { decodeStrings: false, encoding: "utf-8" }) || this;
        _this.buffers = [];
        /** The iconv decode stream. If it is set, we have read more than `options.maxBytes` bytes. */
        _this.iconv = null;
        _this.readBytes = 0;
        _this.sniffer = new sniffer_js_1.Sniffer(options);
        _this.maxBytes = (_a = options === null || options === void 0 ? void 0 : options.maxBytes) !== null && _a !== void 0 ? _a : 1024;
        return _this;
    }
    DecodeStream.prototype._transform = function (chunk, _encoding, callback) {
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
    };
    DecodeStream.prototype.getIconvStream = function () {
        var _this = this;
        if (this.iconv) {
            return this.iconv;
        }
        var stream = iconv_lite_1.default.decodeStream(this.sniffer.encoding);
        stream.on("data", function (chunk) { return _this.push(chunk, "utf-8"); });
        stream.on("end", function () { return _this.push(null); });
        this.iconv = stream;
        for (var _i = 0, _a = this.buffers; _i < _a.length; _i++) {
            var buffer = _a[_i];
            stream.write(buffer);
        }
        this.buffers.length = 0;
        return stream;
    };
    DecodeStream.prototype._flush = function (callback) {
        this.getIconvStream().end(callback);
    };
    return DecodeStream;
}(node_stream_1.Transform));
exports.DecodeStream = DecodeStream;
var sniffer_js_2 = require("./sniffer.js");
Object.defineProperty(exports, "getEncoding", { enumerable: true, get: function () { return sniffer_js_2.getEncoding; } });
//# sourceMappingURL=index.js.map