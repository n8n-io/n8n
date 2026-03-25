'use strict';

var bmi = require('./buffer-more-ints');

Buffer.isContiguousInt = bmi.isContiguousInt;
Buffer.assertContiguousInt = bmi.assertContiguousInt;

['UInt', 'Int'].forEach(function (signed) {
    ['24', '40', '48', '56', '64'].forEach(function (size) {
        ['BE', 'LE'].forEach(function (endian) {
            var read = 'read' + signed + size + endian;
            var reader = bmi[read];
            Buffer.prototype[read] = function(offset) {
                return reader(this, offset);
            };
            var write = 'write' + signed + size + endian;
            var writer = bmi[write];
            Buffer.prototype[write] = function(val, offset) {
                writer(this, val, offset);
            };
        });
    });
});

// Buffer.prototype.read{UInt,Int}8 returns undefined if the offset is
// outside of the buffer, unlike for other widths.  These functions
// make it consistent with the others.
var consistent_readX8 = {
    readUInt8: function (offset) {
        return this.readUInt8(offset) || 0;
    },
    readInt8: function (offset) {
        return this.readInt8(offset) || 0;
    }
};

function make_accessor(read, prefix, suffix) {
    var accessors = [false,
                    (read ? consistent_readX8 : Buffer.prototype)[prefix + 8]];

    for (var i = 16; i <= 64; i += 8) {
        accessors.push(Buffer.prototype[prefix + i + suffix]);
    }

    if (read) {
        Buffer.prototype[prefix + suffix] = function (len, offset) {
            var reader = accessors[len];
            if (reader) {
                return reader.call(this, offset);
            } else {
                throw new Error("Cannot read integer of length " + len);
            }
        };
    } else {
        Buffer.prototype[prefix + suffix] = function (len, val, offset) {
            var writer = accessors[len];
            if (writer) {
                return writer.call(this, val, offset);
            } else {
                throw new Error("Cannot write integer of length " + len);
            }
        }
    }
}

['UInt', 'Int'].forEach(function (t) {
    ['BE', 'LE'].forEach(function (e) {
        make_accessor(true, "read" + t, e);
        make_accessor(false, "write" + t, e);
    });
});
