var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/index.ts
var src_exports = {};
__export(src_exports, {
  EventStreamCodec: () => EventStreamCodec,
  HeaderMarshaller: () => HeaderMarshaller,
  Int64: () => Int64,
  MessageDecoderStream: () => MessageDecoderStream,
  MessageEncoderStream: () => MessageEncoderStream,
  SmithyMessageDecoderStream: () => SmithyMessageDecoderStream,
  SmithyMessageEncoderStream: () => SmithyMessageEncoderStream
});
module.exports = __toCommonJS(src_exports);

// src/EventStreamCodec.ts
var import_crc322 = require("@aws-crypto/crc32");

// src/HeaderMarshaller.ts


// src/Int64.ts
var import_util_hex_encoding = require("@smithy/util-hex-encoding");
var _Int64 = class _Int64 {
  constructor(bytes) {
    this.bytes = bytes;
    if (bytes.byteLength !== 8) {
      throw new Error("Int64 buffers must be exactly 8 bytes");
    }
  }
  static fromNumber(number) {
    if (number > 9223372036854776e3 || number < -9223372036854776e3) {
      throw new Error(`${number} is too large (or, if negative, too small) to represent as an Int64`);
    }
    const bytes = new Uint8Array(8);
    for (let i = 7, remaining = Math.abs(Math.round(number)); i > -1 && remaining > 0; i--, remaining /= 256) {
      bytes[i] = remaining;
    }
    if (number < 0) {
      negate(bytes);
    }
    return new _Int64(bytes);
  }
  /**
   * Called implicitly by infix arithmetic operators.
   */
  valueOf() {
    const bytes = this.bytes.slice(0);
    const negative = bytes[0] & 128;
    if (negative) {
      negate(bytes);
    }
    return parseInt((0, import_util_hex_encoding.toHex)(bytes), 16) * (negative ? -1 : 1);
  }
  toString() {
    return String(this.valueOf());
  }
};
__name(_Int64, "Int64");
var Int64 = _Int64;
function negate(bytes) {
  for (let i = 0; i < 8; i++) {
    bytes[i] ^= 255;
  }
  for (let i = 7; i > -1; i--) {
    bytes[i]++;
    if (bytes[i] !== 0)
      break;
  }
}
__name(negate, "negate");

// src/HeaderMarshaller.ts
var _HeaderMarshaller = class _HeaderMarshaller {
  constructor(toUtf8, fromUtf8) {
    this.toUtf8 = toUtf8;
    this.fromUtf8 = fromUtf8;
  }
  format(headers) {
    const chunks = [];
    for (const headerName of Object.keys(headers)) {
      const bytes = this.fromUtf8(headerName);
      chunks.push(Uint8Array.from([bytes.byteLength]), bytes, this.formatHeaderValue(headers[headerName]));
    }
    const out = new Uint8Array(chunks.reduce((carry, bytes) => carry + bytes.byteLength, 0));
    let position = 0;
    for (const chunk of chunks) {
      out.set(chunk, position);
      position += chunk.byteLength;
    }
    return out;
  }
  formatHeaderValue(header) {
    switch (header.type) {
      case "boolean":
        return Uint8Array.from([header.value ? 0 /* boolTrue */ : 1 /* boolFalse */]);
      case "byte":
        return Uint8Array.from([2 /* byte */, header.value]);
      case "short":
        const shortView = new DataView(new ArrayBuffer(3));
        shortView.setUint8(0, 3 /* short */);
        shortView.setInt16(1, header.value, false);
        return new Uint8Array(shortView.buffer);
      case "integer":
        const intView = new DataView(new ArrayBuffer(5));
        intView.setUint8(0, 4 /* integer */);
        intView.setInt32(1, header.value, false);
        return new Uint8Array(intView.buffer);
      case "long":
        const longBytes = new Uint8Array(9);
        longBytes[0] = 5 /* long */;
        longBytes.set(header.value.bytes, 1);
        return longBytes;
      case "binary":
        const binView = new DataView(new ArrayBuffer(3 + header.value.byteLength));
        binView.setUint8(0, 6 /* byteArray */);
        binView.setUint16(1, header.value.byteLength, false);
        const binBytes = new Uint8Array(binView.buffer);
        binBytes.set(header.value, 3);
        return binBytes;
      case "string":
        const utf8Bytes = this.fromUtf8(header.value);
        const strView = new DataView(new ArrayBuffer(3 + utf8Bytes.byteLength));
        strView.setUint8(0, 7 /* string */);
        strView.setUint16(1, utf8Bytes.byteLength, false);
        const strBytes = new Uint8Array(strView.buffer);
        strBytes.set(utf8Bytes, 3);
        return strBytes;
      case "timestamp":
        const tsBytes = new Uint8Array(9);
        tsBytes[0] = 8 /* timestamp */;
        tsBytes.set(Int64.fromNumber(header.value.valueOf()).bytes, 1);
        return tsBytes;
      case "uuid":
        if (!UUID_PATTERN.test(header.value)) {
          throw new Error(`Invalid UUID received: ${header.value}`);
        }
        const uuidBytes = new Uint8Array(17);
        uuidBytes[0] = 9 /* uuid */;
        uuidBytes.set((0, import_util_hex_encoding.fromHex)(header.value.replace(/\-/g, "")), 1);
        return uuidBytes;
    }
  }
  parse(headers) {
    const out = {};
    let position = 0;
    while (position < headers.byteLength) {
      const nameLength = headers.getUint8(position++);
      const name = this.toUtf8(new Uint8Array(headers.buffer, headers.byteOffset + position, nameLength));
      position += nameLength;
      switch (headers.getUint8(position++)) {
        case 0 /* boolTrue */:
          out[name] = {
            type: BOOLEAN_TAG,
            value: true
          };
          break;
        case 1 /* boolFalse */:
          out[name] = {
            type: BOOLEAN_TAG,
            value: false
          };
          break;
        case 2 /* byte */:
          out[name] = {
            type: BYTE_TAG,
            value: headers.getInt8(position++)
          };
          break;
        case 3 /* short */:
          out[name] = {
            type: SHORT_TAG,
            value: headers.getInt16(position, false)
          };
          position += 2;
          break;
        case 4 /* integer */:
          out[name] = {
            type: INT_TAG,
            value: headers.getInt32(position, false)
          };
          position += 4;
          break;
        case 5 /* long */:
          out[name] = {
            type: LONG_TAG,
            value: new Int64(new Uint8Array(headers.buffer, headers.byteOffset + position, 8))
          };
          position += 8;
          break;
        case 6 /* byteArray */:
          const binaryLength = headers.getUint16(position, false);
          position += 2;
          out[name] = {
            type: BINARY_TAG,
            value: new Uint8Array(headers.buffer, headers.byteOffset + position, binaryLength)
          };
          position += binaryLength;
          break;
        case 7 /* string */:
          const stringLength = headers.getUint16(position, false);
          position += 2;
          out[name] = {
            type: STRING_TAG,
            value: this.toUtf8(new Uint8Array(headers.buffer, headers.byteOffset + position, stringLength))
          };
          position += stringLength;
          break;
        case 8 /* timestamp */:
          out[name] = {
            type: TIMESTAMP_TAG,
            value: new Date(new Int64(new Uint8Array(headers.buffer, headers.byteOffset + position, 8)).valueOf())
          };
          position += 8;
          break;
        case 9 /* uuid */:
          const uuidBytes = new Uint8Array(headers.buffer, headers.byteOffset + position, 16);
          position += 16;
          out[name] = {
            type: UUID_TAG,
            value: `${(0, import_util_hex_encoding.toHex)(uuidBytes.subarray(0, 4))}-${(0, import_util_hex_encoding.toHex)(uuidBytes.subarray(4, 6))}-${(0, import_util_hex_encoding.toHex)(
              uuidBytes.subarray(6, 8)
            )}-${(0, import_util_hex_encoding.toHex)(uuidBytes.subarray(8, 10))}-${(0, import_util_hex_encoding.toHex)(uuidBytes.subarray(10))}`
          };
          break;
        default:
          throw new Error(`Unrecognized header type tag`);
      }
    }
    return out;
  }
};
__name(_HeaderMarshaller, "HeaderMarshaller");
var HeaderMarshaller = _HeaderMarshaller;
var BOOLEAN_TAG = "boolean";
var BYTE_TAG = "byte";
var SHORT_TAG = "short";
var INT_TAG = "integer";
var LONG_TAG = "long";
var BINARY_TAG = "binary";
var STRING_TAG = "string";
var TIMESTAMP_TAG = "timestamp";
var UUID_TAG = "uuid";
var UUID_PATTERN = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/;

// src/splitMessage.ts
var import_crc32 = require("@aws-crypto/crc32");
var PRELUDE_MEMBER_LENGTH = 4;
var PRELUDE_LENGTH = PRELUDE_MEMBER_LENGTH * 2;
var CHECKSUM_LENGTH = 4;
var MINIMUM_MESSAGE_LENGTH = PRELUDE_LENGTH + CHECKSUM_LENGTH * 2;
function splitMessage({ byteLength, byteOffset, buffer }) {
  if (byteLength < MINIMUM_MESSAGE_LENGTH) {
    throw new Error("Provided message too short to accommodate event stream message overhead");
  }
  const view = new DataView(buffer, byteOffset, byteLength);
  const messageLength = view.getUint32(0, false);
  if (byteLength !== messageLength) {
    throw new Error("Reported message length does not match received message length");
  }
  const headerLength = view.getUint32(PRELUDE_MEMBER_LENGTH, false);
  const expectedPreludeChecksum = view.getUint32(PRELUDE_LENGTH, false);
  const expectedMessageChecksum = view.getUint32(byteLength - CHECKSUM_LENGTH, false);
  const checksummer = new import_crc32.Crc32().update(new Uint8Array(buffer, byteOffset, PRELUDE_LENGTH));
  if (expectedPreludeChecksum !== checksummer.digest()) {
    throw new Error(
      `The prelude checksum specified in the message (${expectedPreludeChecksum}) does not match the calculated CRC32 checksum (${checksummer.digest()})`
    );
  }
  checksummer.update(
    new Uint8Array(buffer, byteOffset + PRELUDE_LENGTH, byteLength - (PRELUDE_LENGTH + CHECKSUM_LENGTH))
  );
  if (expectedMessageChecksum !== checksummer.digest()) {
    throw new Error(
      `The message checksum (${checksummer.digest()}) did not match the expected value of ${expectedMessageChecksum}`
    );
  }
  return {
    headers: new DataView(buffer, byteOffset + PRELUDE_LENGTH + CHECKSUM_LENGTH, headerLength),
    body: new Uint8Array(
      buffer,
      byteOffset + PRELUDE_LENGTH + CHECKSUM_LENGTH + headerLength,
      messageLength - headerLength - (PRELUDE_LENGTH + CHECKSUM_LENGTH + CHECKSUM_LENGTH)
    )
  };
}
__name(splitMessage, "splitMessage");

// src/EventStreamCodec.ts
var _EventStreamCodec = class _EventStreamCodec {
  constructor(toUtf8, fromUtf8) {
    this.headerMarshaller = new HeaderMarshaller(toUtf8, fromUtf8);
    this.messageBuffer = [];
    this.isEndOfStream = false;
  }
  feed(message) {
    this.messageBuffer.push(this.decode(message));
  }
  endOfStream() {
    this.isEndOfStream = true;
  }
  getMessage() {
    const message = this.messageBuffer.pop();
    const isEndOfStream = this.isEndOfStream;
    return {
      getMessage() {
        return message;
      },
      isEndOfStream() {
        return isEndOfStream;
      }
    };
  }
  getAvailableMessages() {
    const messages = this.messageBuffer;
    this.messageBuffer = [];
    const isEndOfStream = this.isEndOfStream;
    return {
      getMessages() {
        return messages;
      },
      isEndOfStream() {
        return isEndOfStream;
      }
    };
  }
  /**
   * Convert a structured JavaScript object with tagged headers into a binary
   * event stream message.
   */
  encode({ headers: rawHeaders, body }) {
    const headers = this.headerMarshaller.format(rawHeaders);
    const length = headers.byteLength + body.byteLength + 16;
    const out = new Uint8Array(length);
    const view = new DataView(out.buffer, out.byteOffset, out.byteLength);
    const checksum = new import_crc322.Crc32();
    view.setUint32(0, length, false);
    view.setUint32(4, headers.byteLength, false);
    view.setUint32(8, checksum.update(out.subarray(0, 8)).digest(), false);
    out.set(headers, 12);
    out.set(body, headers.byteLength + 12);
    view.setUint32(length - 4, checksum.update(out.subarray(8, length - 4)).digest(), false);
    return out;
  }
  /**
   * Convert a binary event stream message into a JavaScript object with an
   * opaque, binary body and tagged, parsed headers.
   */
  decode(message) {
    const { headers, body } = splitMessage(message);
    return { headers: this.headerMarshaller.parse(headers), body };
  }
  /**
   * Convert a structured JavaScript object with tagged headers into a binary
   * event stream message header.
   */
  formatHeaders(rawHeaders) {
    return this.headerMarshaller.format(rawHeaders);
  }
};
__name(_EventStreamCodec, "EventStreamCodec");
var EventStreamCodec = _EventStreamCodec;

// src/MessageDecoderStream.ts
var _MessageDecoderStream = class _MessageDecoderStream {
  constructor(options) {
    this.options = options;
  }
  [Symbol.asyncIterator]() {
    return this.asyncIterator();
  }
  async *asyncIterator() {
    for await (const bytes of this.options.inputStream) {
      const decoded = this.options.decoder.decode(bytes);
      yield decoded;
    }
  }
};
__name(_MessageDecoderStream, "MessageDecoderStream");
var MessageDecoderStream = _MessageDecoderStream;

// src/MessageEncoderStream.ts
var _MessageEncoderStream = class _MessageEncoderStream {
  constructor(options) {
    this.options = options;
  }
  [Symbol.asyncIterator]() {
    return this.asyncIterator();
  }
  async *asyncIterator() {
    for await (const msg of this.options.messageStream) {
      const encoded = this.options.encoder.encode(msg);
      yield encoded;
    }
    if (this.options.includeEndFrame) {
      yield new Uint8Array(0);
    }
  }
};
__name(_MessageEncoderStream, "MessageEncoderStream");
var MessageEncoderStream = _MessageEncoderStream;

// src/SmithyMessageDecoderStream.ts
var _SmithyMessageDecoderStream = class _SmithyMessageDecoderStream {
  constructor(options) {
    this.options = options;
  }
  [Symbol.asyncIterator]() {
    return this.asyncIterator();
  }
  async *asyncIterator() {
    for await (const message of this.options.messageStream) {
      const deserialized = await this.options.deserializer(message);
      if (deserialized === void 0)
        continue;
      yield deserialized;
    }
  }
};
__name(_SmithyMessageDecoderStream, "SmithyMessageDecoderStream");
var SmithyMessageDecoderStream = _SmithyMessageDecoderStream;

// src/SmithyMessageEncoderStream.ts
var _SmithyMessageEncoderStream = class _SmithyMessageEncoderStream {
  constructor(options) {
    this.options = options;
  }
  [Symbol.asyncIterator]() {
    return this.asyncIterator();
  }
  async *asyncIterator() {
    for await (const chunk of this.options.inputStream) {
      const payloadBuf = this.options.serializer(chunk);
      yield payloadBuf;
    }
  }
};
__name(_SmithyMessageEncoderStream, "SmithyMessageEncoderStream");
var SmithyMessageEncoderStream = _SmithyMessageEncoderStream;
// Annotate the CommonJS export names for ESM import in node:

0 && (module.exports = {
  EventStreamCodec,
  HeaderMarshaller,
  Int64,
  MessageDecoderStream,
  MessageEncoderStream,
  SmithyMessageDecoderStream,
  SmithyMessageEncoderStream
});

