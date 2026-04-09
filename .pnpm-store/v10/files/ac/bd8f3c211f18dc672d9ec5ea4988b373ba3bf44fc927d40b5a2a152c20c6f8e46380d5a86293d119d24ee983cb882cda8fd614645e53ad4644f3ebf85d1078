"use strict";
// For questions about RLE encoding, see the spec:
//
// https://github.com/apache/parquet-format/blob/master/Encodings.md
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.decodeValues = exports.encodeValues = void 0;
const varint_1 = __importDefault(require("varint"));
function encodeRunBitpacked(values, opts) {
    for (let i = 0; i < values.length % 8; i++) {
        values.push(0);
    }
    const buf = Buffer.alloc(Math.ceil(opts.bitWidth * (values.length / 8)));
    for (let b = 0; b < opts.bitWidth * values.length; ++b) {
        if ((values[Math.floor(b / opts.bitWidth)] & (1 << b % opts.bitWidth)) > 0) {
            buf[Math.floor(b / 8)] |= 1 << b % 8;
        }
    }
    return Buffer.concat([Buffer.from(varint_1.default.encode(((values.length / 8) << 1) | 1)), buf]);
}
function encodeRunRepeated(value, count, opts) {
    const buf = Buffer.alloc(Math.ceil(opts.bitWidth / 8));
    let remainingValue = value;
    // This is encoded LSB to MSB, so we pick off the least
    // significant byte and shift to get the next one.
    for (let i = 0; i < buf.length; ++i) {
        buf.writeUInt8(remainingValue & 0xff, i);
        remainingValue = remainingValue >> 8;
    }
    return Buffer.concat([Buffer.from(varint_1.default.encode(count << 1)), buf]);
}
function unknownToParsedInt(value) {
    if (typeof value === 'string') {
        return parseInt(value, 10);
    }
    else {
        return value;
    }
}
const encodeValues = function (type, values, opts) {
    if (!('bitWidth' in opts)) {
        throw new Error('bitWidth is required');
    }
    switch (type) {
        case 'BOOLEAN':
        case 'INT32':
        case 'INT64':
            values = values.map((x) => unknownToParsedInt(x));
            break;
        default:
            throw new Error('unsupported type: ' + type);
    }
    let buf = Buffer.alloc(0);
    let run = [];
    let repeats = 0;
    for (let i = 0; i < values.length; i++) {
        // If we are at the beginning of a run and the next value is same we start
        // collecting repeated values
        if (repeats === 0 && run.length % 8 === 0 && values[i] === values[i + 1]) {
            // If we have any data in runs we need to encode them
            if (run.length) {
                buf = Buffer.concat([buf, encodeRunBitpacked(run, opts)]);
                run = [];
            }
            repeats = 1;
        }
        else if (repeats > 0 && values[i] === values[i - 1]) {
            repeats += 1;
        }
        else {
            // If values changes we need to post any previous repeated values
            if (repeats) {
                buf = Buffer.concat([buf, encodeRunRepeated(values[i - 1], repeats, opts)]);
                repeats = 0;
            }
            run.push(values[i]);
        }
    }
    if (repeats) {
        buf = Buffer.concat([buf, encodeRunRepeated(values[values.length - 1], repeats, opts)]);
    }
    else if (run.length) {
        buf = Buffer.concat([buf, encodeRunBitpacked(run, opts)]);
    }
    if (opts.disableEnvelope) {
        return buf;
    }
    const envelope = Buffer.alloc(buf.length + 4);
    envelope.writeUInt32LE(buf.length);
    buf.copy(envelope, 4);
    return envelope;
};
exports.encodeValues = encodeValues;
function decodeRunBitpacked(cursor, count, opts) {
    if (count % 8 !== 0) {
        throw new Error('must be a multiple of 8');
    }
    const values = new Array(count).fill(0);
    for (let b = 0; b < opts.bitWidth * count; ++b) {
        if (cursor.buffer[cursor.offset + Math.floor(b / 8)] & (1 << b % 8)) {
            values[Math.floor(b / opts.bitWidth)] |= 1 << b % opts.bitWidth;
        }
    }
    cursor.offset += opts.bitWidth * (count / 8);
    return values;
}
function decodeRunRepeated(cursor, count, opts) {
    const bytesNeededForFixedBitWidth = Math.ceil(opts.bitWidth / 8);
    let value = 0;
    for (let i = 0; i < bytesNeededForFixedBitWidth; ++i) {
        const byte = cursor.buffer[cursor.offset];
        // Bytes are stored LSB to MSB, so we need to shift
        // each new byte appropriately.
        value += byte << (i * 8);
        cursor.offset += 1;
    }
    return new Array(count).fill(value);
}
const decodeValues = function (_, cursor, count, opts) {
    if (!('bitWidth' in opts)) {
        throw new Error('bitWidth is required');
    }
    if (!opts.disableEnvelope) {
        cursor.offset += 4;
    }
    let values = [];
    let res;
    while (values.length < count) {
        const header = varint_1.default.decode(cursor.buffer, cursor.offset);
        cursor.offset += varint_1.default.encodingLength(header);
        if (header & 1) {
            res = decodeRunBitpacked(cursor, (header >> 1) * 8, opts);
        }
        else {
            res = decodeRunRepeated(cursor, header >> 1, opts);
        }
        for (let i = 0; i < res.length; i++) {
            values.push(res[i]);
        }
    }
    values = values.slice(0, count);
    if (values.length !== count) {
        throw new Error('invalid RLE encoding');
    }
    return values;
};
exports.decodeValues = decodeValues;
