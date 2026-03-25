"use strict";
// Copyright 2022 Google LLC
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
var __classPrivateFieldSet = (this && this.__classPrivateFieldSet) || function (receiver, state, value, kind, f) {
    if (kind === "m") throw new TypeError("Private method is not writable");
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a setter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot write private member to an object whose class did not declare it");
    return (kind === "a" ? f.call(receiver, value) : f ? f.value = value : state.set(receiver, value)), value;
};
var __classPrivateFieldGet = (this && this.__classPrivateFieldGet) || function (receiver, state, kind, f) {
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a getter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot read private member from an object whose class did not declare it");
    return kind === "m" ? f : kind === "a" ? f.call(receiver) : f ? f.value : state.get(receiver);
};
var _CRC32C_crc32c;
Object.defineProperty(exports, "__esModule", { value: true });
exports.CRC32C_EXTENSION_TABLE = exports.CRC32C_EXTENSIONS = exports.CRC32C_EXCEPTION_MESSAGES = exports.CRC32C_DEFAULT_VALIDATOR_GENERATOR = exports.CRC32C = void 0;
const fs_1 = require("fs");
/**
 * Ported from {@link https://github.com/google/crc32c/blob/21fc8ef30415a635e7351ffa0e5d5367943d4a94/src/crc32c_portable.cc#L16-L59 github.com/google/crc32c}
 */
const CRC32C_EXTENSIONS = [
    0x00000000, 0xf26b8303, 0xe13b70f7, 0x1350f3f4, 0xc79a971f, 0x35f1141c,
    0x26a1e7e8, 0xd4ca64eb, 0x8ad958cf, 0x78b2dbcc, 0x6be22838, 0x9989ab3b,
    0x4d43cfd0, 0xbf284cd3, 0xac78bf27, 0x5e133c24, 0x105ec76f, 0xe235446c,
    0xf165b798, 0x030e349b, 0xd7c45070, 0x25afd373, 0x36ff2087, 0xc494a384,
    0x9a879fa0, 0x68ec1ca3, 0x7bbcef57, 0x89d76c54, 0x5d1d08bf, 0xaf768bbc,
    0xbc267848, 0x4e4dfb4b, 0x20bd8ede, 0xd2d60ddd, 0xc186fe29, 0x33ed7d2a,
    0xe72719c1, 0x154c9ac2, 0x061c6936, 0xf477ea35, 0xaa64d611, 0x580f5512,
    0x4b5fa6e6, 0xb93425e5, 0x6dfe410e, 0x9f95c20d, 0x8cc531f9, 0x7eaeb2fa,
    0x30e349b1, 0xc288cab2, 0xd1d83946, 0x23b3ba45, 0xf779deae, 0x05125dad,
    0x1642ae59, 0xe4292d5a, 0xba3a117e, 0x4851927d, 0x5b016189, 0xa96ae28a,
    0x7da08661, 0x8fcb0562, 0x9c9bf696, 0x6ef07595, 0x417b1dbc, 0xb3109ebf,
    0xa0406d4b, 0x522bee48, 0x86e18aa3, 0x748a09a0, 0x67dafa54, 0x95b17957,
    0xcba24573, 0x39c9c670, 0x2a993584, 0xd8f2b687, 0x0c38d26c, 0xfe53516f,
    0xed03a29b, 0x1f682198, 0x5125dad3, 0xa34e59d0, 0xb01eaa24, 0x42752927,
    0x96bf4dcc, 0x64d4cecf, 0x77843d3b, 0x85efbe38, 0xdbfc821c, 0x2997011f,
    0x3ac7f2eb, 0xc8ac71e8, 0x1c661503, 0xee0d9600, 0xfd5d65f4, 0x0f36e6f7,
    0x61c69362, 0x93ad1061, 0x80fde395, 0x72966096, 0xa65c047d, 0x5437877e,
    0x4767748a, 0xb50cf789, 0xeb1fcbad, 0x197448ae, 0x0a24bb5a, 0xf84f3859,
    0x2c855cb2, 0xdeeedfb1, 0xcdbe2c45, 0x3fd5af46, 0x7198540d, 0x83f3d70e,
    0x90a324fa, 0x62c8a7f9, 0xb602c312, 0x44694011, 0x5739b3e5, 0xa55230e6,
    0xfb410cc2, 0x092a8fc1, 0x1a7a7c35, 0xe811ff36, 0x3cdb9bdd, 0xceb018de,
    0xdde0eb2a, 0x2f8b6829, 0x82f63b78, 0x709db87b, 0x63cd4b8f, 0x91a6c88c,
    0x456cac67, 0xb7072f64, 0xa457dc90, 0x563c5f93, 0x082f63b7, 0xfa44e0b4,
    0xe9141340, 0x1b7f9043, 0xcfb5f4a8, 0x3dde77ab, 0x2e8e845f, 0xdce5075c,
    0x92a8fc17, 0x60c37f14, 0x73938ce0, 0x81f80fe3, 0x55326b08, 0xa759e80b,
    0xb4091bff, 0x466298fc, 0x1871a4d8, 0xea1a27db, 0xf94ad42f, 0x0b21572c,
    0xdfeb33c7, 0x2d80b0c4, 0x3ed04330, 0xccbbc033, 0xa24bb5a6, 0x502036a5,
    0x4370c551, 0xb11b4652, 0x65d122b9, 0x97baa1ba, 0x84ea524e, 0x7681d14d,
    0x2892ed69, 0xdaf96e6a, 0xc9a99d9e, 0x3bc21e9d, 0xef087a76, 0x1d63f975,
    0x0e330a81, 0xfc588982, 0xb21572c9, 0x407ef1ca, 0x532e023e, 0xa145813d,
    0x758fe5d6, 0x87e466d5, 0x94b49521, 0x66df1622, 0x38cc2a06, 0xcaa7a905,
    0xd9f75af1, 0x2b9cd9f2, 0xff56bd19, 0x0d3d3e1a, 0x1e6dcdee, 0xec064eed,
    0xc38d26c4, 0x31e6a5c7, 0x22b65633, 0xd0ddd530, 0x0417b1db, 0xf67c32d8,
    0xe52cc12c, 0x1747422f, 0x49547e0b, 0xbb3ffd08, 0xa86f0efc, 0x5a048dff,
    0x8ecee914, 0x7ca56a17, 0x6ff599e3, 0x9d9e1ae0, 0xd3d3e1ab, 0x21b862a8,
    0x32e8915c, 0xc083125f, 0x144976b4, 0xe622f5b7, 0xf5720643, 0x07198540,
    0x590ab964, 0xab613a67, 0xb831c993, 0x4a5a4a90, 0x9e902e7b, 0x6cfbad78,
    0x7fab5e8c, 0x8dc0dd8f, 0xe330a81a, 0x115b2b19, 0x020bd8ed, 0xf0605bee,
    0x24aa3f05, 0xd6c1bc06, 0xc5914ff2, 0x37faccf1, 0x69e9f0d5, 0x9b8273d6,
    0x88d28022, 0x7ab90321, 0xae7367ca, 0x5c18e4c9, 0x4f48173d, 0xbd23943e,
    0xf36e6f75, 0x0105ec76, 0x12551f82, 0xe03e9c81, 0x34f4f86a, 0xc69f7b69,
    0xd5cf889d, 0x27a40b9e, 0x79b737ba, 0x8bdcb4b9, 0x988c474d, 0x6ae7c44e,
    0xbe2da0a5, 0x4c4623a6, 0x5f16d052, 0xad7d5351,
];
exports.CRC32C_EXTENSIONS = CRC32C_EXTENSIONS;
const CRC32C_EXTENSION_TABLE = new Int32Array(CRC32C_EXTENSIONS);
exports.CRC32C_EXTENSION_TABLE = CRC32C_EXTENSION_TABLE;
const CRC32C_DEFAULT_VALIDATOR_GENERATOR = () => new CRC32C();
exports.CRC32C_DEFAULT_VALIDATOR_GENERATOR = CRC32C_DEFAULT_VALIDATOR_GENERATOR;
const CRC32C_EXCEPTION_MESSAGES = {
    INVALID_INIT_BASE64_RANGE: (l) => `base64-encoded data expected to equal 4 bytes, not ${l}`,
    INVALID_INIT_BUFFER_LENGTH: (l) => `Buffer expected to equal 4 bytes, not ${l}`,
    INVALID_INIT_INTEGER: (l) => `Number expected to be a safe, unsigned 32-bit integer, not ${l}`,
};
exports.CRC32C_EXCEPTION_MESSAGES = CRC32C_EXCEPTION_MESSAGES;
class CRC32C {
    /**
     * Constructs a new `CRC32C` object.
     *
     * Reconstruction is recommended via the `CRC32C.from` static method.
     *
     * @param initialValue An initial CRC32C value - a signed 32-bit integer.
     */
    constructor(initialValue = 0) {
        /** Current CRC32C value */
        _CRC32C_crc32c.set(this, 0);
        __classPrivateFieldSet(this, _CRC32C_crc32c, initialValue, "f");
    }
    /**
     * Calculates a CRC32C from a provided buffer.
     *
     * Implementation inspired from:
     * - {@link https://github.com/google/crc32c/blob/21fc8ef30415a635e7351ffa0e5d5367943d4a94/src/crc32c_portable.cc github.com/google/crc32c}
     * - {@link https://github.com/googleapis/python-crc32c/blob/a595e758c08df445a99c3bf132ee8e80a3ec4308/src/google_crc32c/python.py github.com/googleapis/python-crc32c}
     * - {@link https://github.com/googleapis/java-storage/pull/1376/files github.com/googleapis/java-storage}
     *
     * @param data The `Buffer` to generate the CRC32C from
     */
    update(data) {
        let current = __classPrivateFieldGet(this, _CRC32C_crc32c, "f") ^ 0xffffffff;
        for (const d of data) {
            const tablePoly = CRC32C.CRC32C_EXTENSION_TABLE[(d ^ current) & 0xff];
            current = tablePoly ^ (current >>> 8);
        }
        __classPrivateFieldSet(this, _CRC32C_crc32c, current ^ 0xffffffff, "f");
    }
    /**
     * Validates a provided input to the current CRC32C value.
     *
     * @param input A Buffer, `CRC32C`-compatible object, base64-encoded data (string), or signed 32-bit integer
     */
    validate(input) {
        if (typeof input === 'number') {
            return input === __classPrivateFieldGet(this, _CRC32C_crc32c, "f");
        }
        else if (typeof input === 'string') {
            return input === this.toString();
        }
        else if (Buffer.isBuffer(input)) {
            return Buffer.compare(input, this.toBuffer()) === 0;
        }
        else {
            // `CRC32C`-like object
            return input.toString() === this.toString();
        }
    }
    /**
     * Returns a `Buffer` representation of the CRC32C value
     */
    toBuffer() {
        const buffer = Buffer.alloc(4);
        buffer.writeInt32BE(__classPrivateFieldGet(this, _CRC32C_crc32c, "f"));
        return buffer;
    }
    /**
     * Returns a JSON-compatible, base64-encoded representation of the CRC32C value.
     *
     * See {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/JSON/stringify `JSON#stringify`}
     */
    toJSON() {
        return this.toString();
    }
    /**
     * Returns a base64-encoded representation of the CRC32C value.
     *
     * See {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/toString `Object#toString`}
     */
    toString() {
        return this.toBuffer().toString('base64');
    }
    /**
     * Returns the `number` representation of the CRC32C value as a signed 32-bit integer
     *
     * See {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/valueOf `Object#valueOf`}
     */
    valueOf() {
        return __classPrivateFieldGet(this, _CRC32C_crc32c, "f");
    }
    /**
     * Generates a `CRC32C` from a compatible buffer format.
     *
     * @param value 4-byte `ArrayBufferView`/`Buffer`/`TypedArray`
     */
    static fromBuffer(value) {
        let buffer;
        if (Buffer.isBuffer(value)) {
            buffer = value;
        }
        else if ('buffer' in value) {
            // `ArrayBufferView`
            buffer = Buffer.from(value.buffer);
        }
        else {
            // `ArrayBuffer`
            buffer = Buffer.from(value);
        }
        if (buffer.byteLength !== 4) {
            throw new RangeError(CRC32C_EXCEPTION_MESSAGES.INVALID_INIT_BUFFER_LENGTH(buffer.byteLength));
        }
        return new CRC32C(buffer.readInt32BE());
    }
    static async fromFile(file) {
        const crc32c = new CRC32C();
        await new Promise((resolve, reject) => {
            (0, fs_1.createReadStream)(file)
                .on('data', (d) => crc32c.update(d))
                .on('end', resolve)
                .on('error', reject);
        });
        return crc32c;
    }
    /**
     * Generates a `CRC32C` from 4-byte base64-encoded data (string).
     *
     * @param value 4-byte base64-encoded data (string)
     */
    static fromString(value) {
        const buffer = Buffer.from(value, 'base64');
        if (buffer.byteLength !== 4) {
            throw new RangeError(CRC32C_EXCEPTION_MESSAGES.INVALID_INIT_BASE64_RANGE(buffer.byteLength));
        }
        return this.fromBuffer(buffer);
    }
    /**
     * Generates a `CRC32C` from a safe, unsigned 32-bit integer.
     *
     * @param value an unsigned 32-bit integer
     */
    static fromNumber(value) {
        if (!Number.isSafeInteger(value) || value > 2 ** 32 || value < -(2 ** 32)) {
            throw new RangeError(CRC32C_EXCEPTION_MESSAGES.INVALID_INIT_INTEGER(value));
        }
        return new CRC32C(value);
    }
    /**
     * Generates a `CRC32C` from a variety of compatable types.
     * Note: strings are treated as input, not as file paths to read from.
     *
     * @param value A number, 4-byte `ArrayBufferView`/`Buffer`/`TypedArray`, or 4-byte base64-encoded data (string)
     */
    static from(value) {
        if (typeof value === 'number') {
            return this.fromNumber(value);
        }
        else if (typeof value === 'string') {
            return this.fromString(value);
        }
        else if ('byteLength' in value) {
            // `ArrayBuffer` | `Buffer` | `ArrayBufferView`
            return this.fromBuffer(value);
        }
        else {
            // `CRC32CValidator`/`CRC32C`-like
            return this.fromString(value.toString());
        }
    }
}
exports.CRC32C = CRC32C;
_CRC32C_crc32c = new WeakMap();
CRC32C.CRC32C_EXTENSIONS = CRC32C_EXTENSIONS;
CRC32C.CRC32C_EXTENSION_TABLE = CRC32C_EXTENSION_TABLE;
