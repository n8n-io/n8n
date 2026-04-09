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
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.HttpCursor = void 0;
const byte_queue_js_1 = require("../byte_queue.js");
const cursor_js_1 = require("../cursor.js");
const jsond = __importStar(require("../encoding/json/decode.js"));
const protobufd = __importStar(require("../encoding/protobuf/decode.js"));
const errors_js_1 = require("../errors.js");
const util_js_1 = require("../util.js");
const json_decode_js_1 = require("./json_decode.js");
const protobuf_decode_js_1 = require("./protobuf_decode.js");
const json_decode_js_2 = require("../shared/json_decode.js");
const protobuf_decode_js_2 = require("../shared/protobuf_decode.js");
class HttpCursor extends cursor_js_1.Cursor {
    #stream;
    #encoding;
    #reader;
    #queue;
    #closed;
    #done;
    /** @private */
    constructor(stream, encoding) {
        super();
        this.#stream = stream;
        this.#encoding = encoding;
        this.#reader = undefined;
        this.#queue = new byte_queue_js_1.ByteQueue(16 * 1024);
        this.#closed = undefined;
        this.#done = false;
    }
    async open(response) {
        if (response.body === null) {
            throw new errors_js_1.ProtoError("No response body for cursor request");
        }
        // node-fetch do not fully support WebStream API, especially getReader() function
        // see https://github.com/node-fetch/node-fetch/issues/387
        // so, we are using async iterator which behaves similarly here instead
        this.#reader = response.body[Symbol.asyncIterator]();
        const respBody = await this.#nextItem(json_decode_js_1.CursorRespBody, protobuf_decode_js_1.CursorRespBody);
        if (respBody === undefined) {
            throw new errors_js_1.ProtoError("Empty response to cursor request");
        }
        return respBody;
    }
    /** Fetch the next entry from the cursor. */
    next() {
        return this.#nextItem(json_decode_js_2.CursorEntry, protobuf_decode_js_2.CursorEntry);
    }
    /** Close the cursor. */
    close() {
        this._setClosed(new errors_js_1.ClientError("Cursor was manually closed"));
    }
    /** @private */
    _setClosed(error) {
        if (this.#closed !== undefined) {
            return;
        }
        this.#closed = error;
        this.#stream._cursorClosed(this);
        if (this.#reader !== undefined) {
            this.#reader.return();
        }
    }
    /** True if the cursor is closed. */
    get closed() {
        return this.#closed !== undefined;
    }
    async #nextItem(jsonFun, protobufDef) {
        for (;;) {
            if (this.#done) {
                return undefined;
            }
            else if (this.#closed !== undefined) {
                throw new errors_js_1.ClosedError("Cursor is closed", this.#closed);
            }
            if (this.#encoding === "json") {
                const jsonData = this.#parseItemJson();
                if (jsonData !== undefined) {
                    const jsonText = new TextDecoder().decode(jsonData);
                    const jsonValue = JSON.parse(jsonText);
                    return jsond.readJsonObject(jsonValue, jsonFun);
                }
            }
            else if (this.#encoding === "protobuf") {
                const protobufData = this.#parseItemProtobuf();
                if (protobufData !== undefined) {
                    return protobufd.readProtobufMessage(protobufData, protobufDef);
                }
            }
            else {
                throw (0, util_js_1.impossible)(this.#encoding, "Impossible encoding");
            }
            if (this.#reader === undefined) {
                throw new errors_js_1.InternalError("Attempted to read from HTTP cursor before it was opened");
            }
            const { value, done } = await this.#reader.next();
            if (done && this.#queue.length === 0) {
                this.#done = true;
            }
            else if (done) {
                throw new errors_js_1.ProtoError("Unexpected end of cursor stream");
            }
            else {
                this.#queue.push(value);
            }
        }
    }
    #parseItemJson() {
        const data = this.#queue.data();
        const newlineByte = 10;
        const newlinePos = data.indexOf(newlineByte);
        if (newlinePos < 0) {
            return undefined;
        }
        const jsonData = data.slice(0, newlinePos);
        this.#queue.shift(newlinePos + 1);
        return jsonData;
    }
    #parseItemProtobuf() {
        const data = this.#queue.data();
        let varintValue = 0;
        let varintLength = 0;
        for (;;) {
            if (varintLength >= data.byteLength) {
                return undefined;
            }
            const byte = data[varintLength];
            varintValue |= (byte & 0x7f) << (7 * varintLength);
            varintLength += 1;
            if (!(byte & 0x80)) {
                break;
            }
        }
        if (data.byteLength < varintLength + varintValue) {
            return undefined;
        }
        const protobufData = data.slice(varintLength, varintLength + varintValue);
        this.#queue.shift(varintLength + varintValue);
        return protobufData;
    }
}
exports.HttpCursor = HttpCursor;
