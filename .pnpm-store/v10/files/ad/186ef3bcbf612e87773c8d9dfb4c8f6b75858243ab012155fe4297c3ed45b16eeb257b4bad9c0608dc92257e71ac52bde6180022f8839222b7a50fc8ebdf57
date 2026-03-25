//
//
//

/*

The AMQP 0-9-1 is a mess when it comes to the types that can be
encoded on the wire.

There are four encoding schemes, and three overlapping sets of types:
frames, methods, (field-)tables, and properties.

Each *frame type* has a set layout in which values of given types are
concatenated along with sections of "raw binary" data.

In frames there are `shortstr`s, that is length-prefixed strings of
UTF8 chars, 8 bit unsigned integers (called `octet`), unsigned 16 bit
integers (called `short` or `short-uint`), unsigned 32 bit integers
(called `long` or `long-uint`), unsigned 64 bit integers (called
`longlong` or `longlong-uint`), and flags (called `bit`).

Methods are encoded as a frame giving a method ID and a sequence of
arguments of known types. The encoded method argument values are
concatenated (with some fun complications around "packing" consecutive
bit values into bytes).

Along with the types given in frames, method arguments may be long
byte strings (`longstr`, not required to be UTF8) or 64 bit unsigned
integers to be interpreted as timestamps (yeah I don't know why
either), or arbitrary sets of key-value pairs (called `field-table`).

Inside a field table the keys are `shortstr` and the values are
prefixed with a byte tag giving the type. The types are any of the
above except for bits (which are replaced by byte-wide `bool`), along
with a NULL value `void`, a special fixed-precision number encoding
(`decimal`), IEEE754 `float`s and `double`s, signed integers,
`field-array` (a sequence of tagged values), and nested field-tables.

RabbitMQ and QPid use a subset of the field-table types, and different
value tags, established before the AMQP 0-9-1 specification was
published. So far as I know, no-one uses the types and tags as
published. http://www.rabbitmq.com/amqp-0-9-1-errata.html gives the
list of field-table types.

Lastly, there are (sets of) properties, only one of which is given in
AMQP 0-9-1: `BasicProperties`. These are almost the same as methods,
except that they appear in content header frames, which include a
content size, and they carry a set of flags indicating which
properties are present. This scheme can save ones of bytes per message
(messages which take a minimum of three frames each to send).

*/

'use strict';

var ints = require('buffer-more-ints');

// JavaScript uses only doubles so what I'm testing for is whether
// it's *better* to encode a number as a float or double. This really
// just amounts to testing whether there's a fractional part to the
// number, except that see below. NB I don't use bitwise operations to
// do this 'efficiently' -- it would mask the number to 32 bits.
//
// At 2^50, doubles don't have sufficient precision to distinguish
// between floating point and integer numbers (`Math.pow(2, 50) + 0.1
// === Math.pow(2, 50)` (and, above 2^53, doubles cannot represent all
// integers (`Math.pow(2, 53) + 1 === Math.pow(2, 53)`)). Hence
// anything with a magnitude at or above 2^50 may as well be encoded
// as a 64-bit integer. Except that only signed integers are supported
// by RabbitMQ, so anything above 2^63 - 1 must be a double.
function isFloatingPoint(n) {
    return n >= 0x8000000000000000 ||
        (Math.abs(n) < 0x4000000000000
         && Math.floor(n) !== n);
}

function encodeTable(buffer, val, offset) {
    var start = offset;
    offset += 4; // leave room for the table length
    for (var key in val) {
        if (val[key] !== undefined) {
          var len = Buffer.byteLength(key);
          buffer.writeUInt8(len, offset); offset++;
          buffer.write(key, offset, 'utf8'); offset += len;
          offset += encodeFieldValue(buffer, val[key], offset);
        }
    }
    var size = offset - start;
    buffer.writeUInt32BE(size - 4, start);
    return size;
}

function encodeArray(buffer, val, offset) {
    var start = offset;
    offset += 4;
    for (var i=0, num=val.length; i < num; i++) {
        offset += encodeFieldValue(buffer, val[i], offset);
    }
    var size = offset - start;
    buffer.writeUInt32BE(size - 4, start);
    return size;
}

function encodeFieldValue(buffer, value, offset) {
    var start = offset;
    var type = typeof value, val = value;
    // A trapdoor for specifying a type, e.g., timestamp
    if (value && type === 'object' && value.hasOwnProperty('!')) {
        val = value.value;
        type = value['!'];
    }

    // If it's a JS number, we'll have to guess what type to encode it
    // as.
    if (type == 'number') {
        // Making assumptions about the kind of number (floating point
        // v integer, signed, unsigned, size) desired is dangerous in
        // general; however, in practice RabbitMQ uses only
        // longstrings and unsigned integers in its arguments, and
        // other clients generally conflate number types anyway. So
        // the only distinction we care about is floating point vs
        // integers, preferring integers since those can be promoted
        // if necessary. If floating point is required, we may as well
        // use double precision.
        if (isFloatingPoint(val)) {
            type = 'double';
        }
        else { // only signed values are used in tables by
               // RabbitMQ. It *used* to (< v3.3.0) treat the byte 'b'
               // type as unsigned, but most clients (and the spec)
               // think it's signed, and now RabbitMQ does too.
            if (val < 128 && val >= -128) {
                type = 'byte';
            }
            else if (val >= -0x8000 && val < 0x8000) {
                type = 'short'
            }
            else if (val >= -0x80000000 && val < 0x80000000) {
                type = 'int';
            }
            else {
                type = 'long';
            }
        }
    }

    function tag(t) { buffer.write(t, offset); offset++; }

    switch (type) {
    case 'string': // no shortstr in field tables
        var len = Buffer.byteLength(val, 'utf8');
        tag('S');
        buffer.writeUInt32BE(len, offset); offset += 4;
        buffer.write(val, offset, 'utf8'); offset += len;
        break;
    case 'object':
        if (val === null) {
            tag('V');
        }
        else if (Array.isArray(val)) {
            tag('A');
            offset += encodeArray(buffer, val, offset);
        }
        else if (Buffer.isBuffer(val)) {
            tag('x');
            buffer.writeUInt32BE(val.length, offset); offset += 4;
            val.copy(buffer, offset); offset += val.length;
        }
        else {
            tag('F');
            offset += encodeTable(buffer, val, offset);
        }
        break;
    case 'boolean':
        tag('t');
        buffer.writeUInt8((val) ? 1 : 0, offset); offset++;
        break;
    // These are the types that are either guessed above, or
    // explicitly given using the {'!': type} notation.
    case 'double':
    case 'float64':
        tag('d');
        buffer.writeDoubleBE(val, offset);
        offset += 8;
        break;
    case 'byte':
    case 'int8':
        tag('b');
        buffer.writeInt8(val, offset); offset++;
        break;
    case 'unsignedbyte':
    case 'uint8':
        tag('B');
        buffer.writeUInt8(val, offset); offset++;
        break;
    case 'short':
    case 'int16':
        tag('s');
        buffer.writeInt16BE(val, offset); offset += 2;
        break;
    case 'unsignedshort':
    case 'uint16':
        tag('u');
        buffer.writeUInt16BE(val, offset); offset += 2;
        break;
    case 'int':
    case 'int32':
        tag('I');
        buffer.writeInt32BE(val, offset); offset += 4;
        break;
    case 'unsignedint':
    case 'uint32':
        tag('i');
        buffer.writeUInt32BE(val, offset); offset += 4;
        break;
    case 'long':
    case 'int64':
        tag('l');
        ints.writeInt64BE(buffer, val, offset); offset += 8;
        break;

    // Now for exotic types, those can _only_ be denoted by using
    // `{'!': type, value: val}
    case 'timestamp':
        tag('T');
        ints.writeUInt64BE(buffer, val, offset); offset += 8;
        break;
    case 'float':
        tag('f');
        buffer.writeFloatBE(val, offset); offset += 4;
        break;
    case 'decimal':
        tag('D');
        if (val.hasOwnProperty('places') && val.hasOwnProperty('digits')
            && val.places >= 0 && val.places < 256) {
            buffer[offset] = val.places; offset++;
            buffer.writeUInt32BE(val.digits, offset); offset += 4;
        }
        else throw new TypeError(
            "Decimal value must be {'places': 0..255, 'digits': uint32}, " +
                "got " + JSON.stringify(val));
        break;
    default:
        throw new TypeError('Unknown type to encode: ' + type);
    }
    return offset - start;
}

// Assume we're given a slice of the buffer that contains just the
// fields.
function decodeFields(slice) {
    var fields = {}, offset = 0, size = slice.length;
    var len, key, val;

    function decodeFieldValue() {
        var tag = String.fromCharCode(slice[offset]); offset++;
        switch (tag) {
        case 'b':
            val = slice.readInt8(offset); offset++;
            break;
        case 'B':
            val = slice.readUInt8(offset); offset++;
            break;
        case 'S':
            len = slice.readUInt32BE(offset); offset += 4;
            val = slice.toString('utf8', offset, offset + len);
            offset += len;
            break;
        case 'I':
            val = slice.readInt32BE(offset); offset += 4;
            break;
        case 'i':
            val = slice.readUInt32BE(offset); offset += 4;
            break;
        case 'D': // only positive decimals, apparently.
            var places = slice[offset]; offset++;
            var digits = slice.readUInt32BE(offset); offset += 4;
            val = {'!': 'decimal', value: {places: places, digits: digits}};
            break;
        case 'T':
            val = ints.readUInt64BE(slice, offset); offset += 8;
            val = {'!': 'timestamp', value: val};
            break;
        case 'F':
            len = slice.readUInt32BE(offset); offset += 4;
            val = decodeFields(slice.subarray(offset, offset + len));
            offset += len;
            break;
        case 'A':
            len = slice.readUInt32BE(offset); offset += 4;
            decodeArray(offset + len);
            // NB decodeArray will itself update offset and val
            break;
        case 'd':
            val = slice.readDoubleBE(offset); offset += 8;
            break;
        case 'f':
            val = slice.readFloatBE(offset); offset += 4;
            break;
        case 'l':
            val = ints.readInt64BE(slice, offset); offset += 8;
            break;
        case 's':
            val = slice.readInt16BE(offset); offset += 2;
            break;
        case 'u':
            val = slice.readUInt16BE(offset); offset += 2;
            break;
        case 't':
            val = slice[offset] != 0; offset++;
            break;
        case 'V':
            val = null;
            break;
        case 'x':
            len = slice.readUInt32BE(offset); offset += 4;
            val = slice.subarray(offset, offset + len);
            offset += len;
            break;
        default:
            throw new TypeError('Unexpected type tag "' + tag +'"');
        }
    }

    function decodeArray(until) {
        var vals = [];
        while (offset < until) {
            decodeFieldValue();
            vals.push(val);
        }
        val = vals;
    }

    while (offset < size) {
        len = slice.readUInt8(offset); offset++;
        key = slice.toString('utf8', offset, offset + len);
        offset += len;
        decodeFieldValue();
        fields[key] = val;
    }
    return fields;
}

module.exports.encodeTable = encodeTable;
module.exports.decodeFields = decodeFields;
