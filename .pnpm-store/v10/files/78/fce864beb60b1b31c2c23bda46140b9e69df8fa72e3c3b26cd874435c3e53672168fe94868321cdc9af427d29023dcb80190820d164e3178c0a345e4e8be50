'use strict';

// JavaScript is numerically challenged
var SHIFT_LEFT_32 = (1 << 16) * (1 << 16);
var SHIFT_RIGHT_32 = 1 / SHIFT_LEFT_32;

// The maximum contiguous integer that can be held in a IEEE754 double
var MAX_INT = 0x1fffffffffffff;

function isContiguousInt(val) {
    return val <= MAX_INT && val >= -MAX_INT;
}

function assertContiguousInt(val) {
    if (!isContiguousInt(val)) {
        throw new TypeError("number cannot be represented as a contiguous integer");
    }
}

module.exports.isContiguousInt = isContiguousInt;
module.exports.assertContiguousInt = assertContiguousInt;

// Fill in the regular procedures
['UInt', 'Int'].forEach(function (sign) {
  var suffix = sign + '8';
  module.exports['read' + suffix] =
    Buffer.prototype['read' + suffix].call;
  module.exports['write' + suffix] =
    Buffer.prototype['write' + suffix].call;

  ['16', '32'].forEach(function (size) {
    ['LE', 'BE'].forEach(function (endian) {
      var suffix = sign + size + endian;
      var read = Buffer.prototype['read' + suffix];
      module.exports['read' + suffix] =
        function (buf, offset) {
          return read.call(buf, offset);
        };
      var write = Buffer.prototype['write' + suffix];
      module.exports['write' + suffix] =
        function (buf, val, offset) {
          return write.call(buf, val, offset);
        };
    });
  });
});

// Check that a value is an integer within the given range
function check_value(val, min, max) {
    val = +val;
    if (typeof(val) != 'number' || val < min || val > max || Math.floor(val) !== val) {
        throw new TypeError("\"value\" argument is out of bounds");
    }
    return val;
}

// Check that something is within the Buffer bounds
function check_bounds(buf, offset, len) {
    if (offset < 0 || offset + len > buf.length) {
        throw new RangeError("Index out of range");
    }
}

function readUInt24BE(buf, offset) {
  return buf.readUInt8(offset) << 16 | buf.readUInt16BE(offset + 1);
}
module.exports.readUInt24BE = readUInt24BE;

function writeUInt24BE(buf, val, offset) {
    val = check_value(val, 0, 0xffffff);
    check_bounds(buf, offset, 3);
    buf.writeUInt8(val >>> 16, offset);
    buf.writeUInt16BE(val & 0xffff, offset + 1);
}
module.exports.writeUInt24BE = writeUInt24BE;

function readUInt40BE(buf, offset) {
    return (buf.readUInt8(offset) || 0) * SHIFT_LEFT_32 + buf.readUInt32BE(offset + 1);
}
module.exports.readUInt40BE = readUInt40BE;

function writeUInt40BE(buf, val, offset) {
    val = check_value(val, 0, 0xffffffffff);
    check_bounds(buf, offset, 5);
    buf.writeUInt8(Math.floor(val * SHIFT_RIGHT_32), offset);
    buf.writeInt32BE(val & -1, offset + 1);
}
module.exports.writeUInt40BE = writeUInt40BE;

function readUInt48BE(buf, offset) {
    return buf.readUInt16BE(offset) * SHIFT_LEFT_32 + buf.readUInt32BE(offset + 2);
}
module.exports.readUInt48BE = readUInt48BE;

function writeUInt48BE(buf, val, offset) {
    val = check_value(val, 0, 0xffffffffffff);
    check_bounds(buf, offset, 6);
    buf.writeUInt16BE(Math.floor(val * SHIFT_RIGHT_32), offset);
    buf.writeInt32BE(val & -1, offset + 2);
}
module.exports.writeUInt48BE = writeUInt48BE;

function readUInt56BE(buf, offset) {
    return ((buf.readUInt8(offset) || 0) << 16 | buf.readUInt16BE(offset + 1)) * SHIFT_LEFT_32 + buf.readUInt32BE(offset + 3);
}
module.exports.readUInt56BE = readUInt56BE;

function writeUInt56BE(buf, val, offset) {
    val = check_value(val, 0, 0xffffffffffffff);
    check_bounds(buf, offset, 7);

    if (val < 0x100000000000000) {
        var hi = Math.floor(val * SHIFT_RIGHT_32);
        buf.writeUInt8(hi >>> 16, offset);
        buf.writeUInt16BE(hi & 0xffff, offset + 1);
        buf.writeInt32BE(val & -1, offset + 3);
    } else {
        // Special case because 2^56-1 gets rounded up to 2^56
        buf[offset] = 0xff;
        buf[offset+1] = 0xff;
        buf[offset+2] = 0xff;
        buf[offset+3] = 0xff;
        buf[offset+4] = 0xff;
        buf[offset+5] = 0xff;
        buf[offset+6] = 0xff;
    }
}
module.exports.writeUInt56BE = writeUInt56BE;

function readUInt64BE(buf, offset) {
    return buf.readUInt32BE(offset) * SHIFT_LEFT_32 + buf.readUInt32BE(offset + 4);
}
module.exports.readUInt64BE = readUInt64BE;

function writeUInt64BE(buf, val, offset) {
    val = check_value(val, 0, 0xffffffffffffffff);
    check_bounds(buf, offset, 8);

    if (val < 0x10000000000000000) {
        buf.writeUInt32BE(Math.floor(val * SHIFT_RIGHT_32), offset);
        buf.writeInt32BE(val & -1, offset + 4);
    } else {
        // Special case because 2^64-1 gets rounded up to 2^64
        buf[offset] = 0xff;
        buf[offset+1] = 0xff;
        buf[offset+2] = 0xff;
        buf[offset+3] = 0xff;
        buf[offset+4] = 0xff;
        buf[offset+5] = 0xff;
        buf[offset+6] = 0xff;
        buf[offset+7] = 0xff;
    }
}
module.exports.writeUInt64BE = writeUInt64BE;

function readUInt24LE(buf, offset) {
    return buf.readUInt8(offset + 2) << 16 | buf.readUInt16LE(offset);
}
module.exports.readUInt24LE = readUInt24LE;

function writeUInt24LE(buf, val, offset) {
    val = check_value(val, 0, 0xffffff);
    check_bounds(buf, offset, 3);

    buf.writeUInt16LE(val & 0xffff, offset);
    buf.writeUInt8(val >>> 16, offset + 2);
}
module.exports.writeUInt24LE = writeUInt24LE;

function readUInt40LE(buf, offset) {
    return (buf.readUInt8(offset + 4) || 0) * SHIFT_LEFT_32 + buf.readUInt32LE(offset);
}
module.exports.readUInt40LE = readUInt40LE;

function writeUInt40LE(buf, val, offset) {
    val = check_value(val, 0, 0xffffffffff);
    check_bounds(buf, offset, 5);
    buf.writeInt32LE(val & -1, offset);
    buf.writeUInt8(Math.floor(val * SHIFT_RIGHT_32), offset + 4);
}
module.exports.writeUInt40LE = writeUInt40LE;

function readUInt48LE(buf, offset) {
    return buf.readUInt16LE(offset + 4) * SHIFT_LEFT_32 + buf.readUInt32LE(offset);
}
module.exports.readUInt48LE = readUInt48LE;

function writeUInt48LE(buf, val, offset) {
    val = check_value(val, 0, 0xffffffffffff);
    check_bounds(buf, offset, 6);
    buf.writeInt32LE(val & -1, offset);
    buf.writeUInt16LE(Math.floor(val * SHIFT_RIGHT_32), offset + 4);
}
module.exports.writeUInt48LE = writeUInt48LE;

function readUInt56LE(buf, offset) {
    return ((buf.readUInt8(offset + 6) || 0) << 16 | buf.readUInt16LE(offset + 4)) * SHIFT_LEFT_32 + buf.readUInt32LE(offset);
}
module.exports.readUInt56LE = readUInt56LE;

function writeUInt56LE(buf, val, offset) {
    val = check_value(val, 0, 0xffffffffffffff);
    check_bounds(buf, offset, 7);

    if (val < 0x100000000000000) {
        buf.writeInt32LE(val & -1, offset);
        var hi = Math.floor(val * SHIFT_RIGHT_32);
        buf.writeUInt16LE(hi & 0xffff, offset + 4);
        buf.writeUInt8(hi >>> 16, offset + 6);
    } else {
        // Special case because 2^56-1 gets rounded up to 2^56
        buf[offset] = 0xff;
        buf[offset+1] = 0xff;
        buf[offset+2] = 0xff;
        buf[offset+3] = 0xff;
        buf[offset+4] = 0xff;
        buf[offset+5] = 0xff;
        buf[offset+6] = 0xff;
    }
}
module.exports.writeUInt56LE = writeUInt56LE;

function readUInt64LE(buf, offset) {
    return buf.readUInt32LE(offset + 4) * SHIFT_LEFT_32 + buf.readUInt32LE(offset);
}
module.exports.readUInt64LE = readUInt64LE;

function writeUInt64LE(buf, val, offset) {
    val = check_value(val, 0, 0xffffffffffffffff);
    check_bounds(buf, offset, 8);

    if (val < 0x10000000000000000) {
        buf.writeInt32LE(val & -1, offset);
        buf.writeUInt32LE(Math.floor(val * SHIFT_RIGHT_32), offset + 4);
    } else {
        // Special case because 2^64-1 gets rounded up to 2^64
        buf[offset] = 0xff;
        buf[offset+1] = 0xff;
        buf[offset+2] = 0xff;
        buf[offset+3] = 0xff;
        buf[offset+4] = 0xff;
        buf[offset+5] = 0xff;
        buf[offset+6] = 0xff;
        buf[offset+7] = 0xff;
    }
}
module.exports.writeUInt64LE = writeUInt64LE;


function readInt24BE(buf, offset) {
    return (buf.readInt8(offset) << 16) + buf.readUInt16BE(offset + 1);
}
module.exports.readInt24BE = readInt24BE;

function writeInt24BE(buf, val, offset) {
    val = check_value(val, -0x800000, 0x7fffff);
    check_bounds(buf, offset, 3);
    buf.writeInt8(val >> 16, offset);
    buf.writeUInt16BE(val & 0xffff, offset + 1);
}
module.exports.writeInt24BE = writeInt24BE;

function readInt40BE(buf, offset) {
    return (buf.readInt8(offset) || 0) * SHIFT_LEFT_32 + buf.readUInt32BE(offset + 1);
}
module.exports.readInt40BE = readInt40BE;

function writeInt40BE(buf, val, offset) {
    val = check_value(val, -0x8000000000, 0x7fffffffff);
    check_bounds(buf, offset, 5);
    buf.writeInt8(Math.floor(val * SHIFT_RIGHT_32), offset);
    buf.writeInt32BE(val & -1, offset + 1);
}
module.exports.writeInt40BE = writeInt40BE;

function readInt48BE(buf, offset) {
    return buf.readInt16BE(offset) * SHIFT_LEFT_32 + buf.readUInt32BE(offset + 2);
}
module.exports.readInt48BE = readInt48BE;

function writeInt48BE(buf, val, offset) {
    val = check_value(val, -0x800000000000, 0x7fffffffffff);
    check_bounds(buf, offset, 6);
    buf.writeInt16BE(Math.floor(val * SHIFT_RIGHT_32), offset);
    buf.writeInt32BE(val & -1, offset + 2);
}
module.exports.writeInt48BE = writeInt48BE;

function readInt56BE(buf, offset) {
    return (((buf.readInt8(offset) || 0) << 16) + buf.readUInt16BE(offset + 1)) * SHIFT_LEFT_32 + buf.readUInt32BE(offset + 3);
}
module.exports.readInt56BE = readInt56BE;

function writeInt56BE(buf, val, offset) {
    val = check_value(val, -0x800000000000000, 0x7fffffffffffff);
    check_bounds(buf, offset, 7);

    if (val < 0x80000000000000) {
        var hi = Math.floor(val * SHIFT_RIGHT_32);
        buf.writeInt8(hi >> 16, offset);
        buf.writeUInt16BE(hi & 0xffff, offset + 1);
        buf.writeInt32BE(val & -1, offset + 3);
    } else {
        // Special case because 2^55-1 gets rounded up to 2^55
        buf[offset] = 0x7f;
        buf[offset+1] = 0xff;
        buf[offset+2] = 0xff;
        buf[offset+3] = 0xff;
        buf[offset+4] = 0xff;
        buf[offset+5] = 0xff;
        buf[offset+6] = 0xff;
    }
}
module.exports.writeInt56BE = writeInt56BE;

function readInt64BE(buf, offset) {
    return buf.readInt32BE(offset) * SHIFT_LEFT_32 + buf.readUInt32BE(offset + 4);
}
module.exports.readInt64BE = readInt64BE;

function writeInt64BE(buf, val, offset) {
    val = check_value(val, -0x800000000000000000, 0x7fffffffffffffff);
    check_bounds(buf, offset, 8);

    if (val < 0x8000000000000000) {
        buf.writeInt32BE(Math.floor(val * SHIFT_RIGHT_32), offset);
        buf.writeInt32BE(val & -1, offset + 4);
    } else {
        // Special case because 2^63-1 gets rounded up to 2^63
        buf[offset] = 0x7f;
        buf[offset+1] = 0xff;
        buf[offset+2] = 0xff;
        buf[offset+3] = 0xff;
        buf[offset+4] = 0xff;
        buf[offset+5] = 0xff;
        buf[offset+6] = 0xff;
        buf[offset+7] = 0xff;
    }
}
module.exports.writeInt64BE = writeInt64BE;

function readInt24LE(buf, offset) {
    return (buf.readInt8(offset + 2) << 16) + buf.readUInt16LE(offset);
}
module.exports.readInt24LE = readInt24LE;

function writeInt24LE(buf, val, offset) {
    val = check_value(val, -0x800000, 0x7fffff);
    check_bounds(buf, offset, 3);
    buf.writeUInt16LE(val & 0xffff, offset);
    buf.writeInt8(val >> 16, offset + 2);
}
module.exports.writeInt24LE = writeInt24LE;

function readInt40LE(buf, offset) {
    return (buf.readInt8(offset + 4) || 0) * SHIFT_LEFT_32 + buf.readUInt32LE(offset);
}
module.exports.readInt40LE = readInt40LE;

function writeInt40LE(buf, val, offset) {
    val = check_value(val, -0x8000000000, 0x7fffffffff);
    check_bounds(buf, offset, 5);
    buf.writeInt32LE(val & -1, offset);
    buf.writeInt8(Math.floor(val * SHIFT_RIGHT_32), offset + 4);
}
module.exports.writeInt40LE = writeInt40LE;

function readInt48LE(buf, offset) {
    return buf.readInt16LE(offset + 4) * SHIFT_LEFT_32 + buf.readUInt32LE(offset);
}
module.exports.readInt48LE = readInt48LE;

function writeInt48LE(buf, val, offset) {
    val = check_value(val, -0x800000000000, 0x7fffffffffff);
    check_bounds(buf, offset, 6);
    buf.writeInt32LE(val & -1, offset);
    buf.writeInt16LE(Math.floor(val * SHIFT_RIGHT_32), offset + 4);
}
module.exports.writeInt48LE = writeInt48LE;

function readInt56LE(buf, offset) {
    return (((buf.readInt8(offset + 6) || 0) << 16) + buf.readUInt16LE(offset + 4)) * SHIFT_LEFT_32 + buf.readUInt32LE(offset);
}
module.exports.readInt56LE = readInt56LE;

function writeInt56LE(buf, val, offset) {
    val = check_value(val, -0x80000000000000, 0x7fffffffffffff);
    check_bounds(buf, offset, 7);

    if (val < 0x80000000000000) {
        buf.writeInt32LE(val & -1, offset);
        var hi = Math.floor(val * SHIFT_RIGHT_32);
        buf.writeUInt16LE(hi & 0xffff, offset + 4);
        buf.writeInt8(hi >> 16, offset + 6);
    } else {
        // Special case because 2^55-1 gets rounded up to 2^55
        buf[offset] = 0xff;
        buf[offset+1] = 0xff;
        buf[offset+2] = 0xff;
        buf[offset+3] = 0xff;
        buf[offset+4] = 0xff;
        buf[offset+5] = 0xff;
        buf[offset+6] = 0x7f;
    }
}
module.exports.writeInt56LE = writeInt56LE;

function readInt64LE(buf, offset) {
    return buf.readInt32LE(offset + 4) * SHIFT_LEFT_32 + buf.readUInt32LE(offset);
}
module.exports.readInt64LE = readInt64LE;

function writeInt64LE(buf, val, offset) {
    val = check_value(val, -0x8000000000000000, 0x7fffffffffffffff);
    check_bounds(buf, offset, 8);

    if (val < 0x8000000000000000) {
        buf.writeInt32LE(val & -1, offset);
        buf.writeInt32LE(Math.floor(val * SHIFT_RIGHT_32), offset + 4);
    } else {
        // Special case because 2^55-1 gets rounded up to 2^55
        buf[offset] = 0xff;
        buf[offset+1] = 0xff;
        buf[offset+2] = 0xff;
        buf[offset+3] = 0xff;
        buf[offset+4] = 0xff;
        buf[offset+5] = 0xff;
        buf[offset+6] = 0xff;
        buf[offset+7] = 0x7f;
    }
}
module.exports.writeInt64LE = writeInt64LE;
