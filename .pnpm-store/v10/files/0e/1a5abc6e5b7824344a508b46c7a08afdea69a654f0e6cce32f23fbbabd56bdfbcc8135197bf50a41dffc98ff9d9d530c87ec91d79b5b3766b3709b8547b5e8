'use strict';

require('./polyfill');

// A simple abbreviation to obtain a buffer from a hex string
function h2b(str) {
    return new Buffer(str, "hex");
}

// Reverse a buffer
function reverse(buf) {
    var res = new Buffer(buf.length);
    for (var i = 0, j = buf.length - 1; j >= 0; i++, j--) {
        res[i] = buf[j];
    }
    return res;
}

// Fill a buffer with distinctive data
function scrub(buf) {
    var pos = 0;
    var written;
    while ((written = buf.write("deadbeef", pos, 4, "hex")) == 4) {
        pos += written;
    }
    return buf;
}

function xint_case(xint) {
    return function (assert, hex, val, inexact) {
        var readBE = "read" + xint + "BE";
        var writeBE = "write" + xint + "BE";
        var readLE = "read" + xint + "LE";
        var writeLE = "write" + xint + "LE";

        var len = hex.length / 2;

        // Straightforward read cases
        assert.equal(h2b(hex)[readBE](len, 0), val);
        assert.equal(reverse(h2b(hex))[readLE](len, 0), val);

        // Test straightforward writes and noAssert writes off the ends of
        // the buffer
        var buf = scrub(new Buffer(len));
        buf[writeBE](len, val, 0);
        if (!inexact) {
            assert.equal(buf.toString("hex"), hex);
        } else {
            assert.equal(buf[readBE](len, 0), val);
        }

        scrub(buf);
        buf[writeLE](len, val, 0);
        if (!inexact) {
            assert.equal(reverse(buf).toString("hex"), hex);
        } else {
            assert.equal(buf[readLE](len, 0), val);
        }

        // Accesses off the ends of the buffer should throw.
        assert.throws(function () { h2b(hex)[readBE](len, -1); });
        assert.throws(function () { h2b(hex)[readBE](len, 1); });
        assert.throws(function () { reverse(h2b(hex))[readLE](len, 1); });
        assert.throws(function () { reverse(h2b(hex))[readLE](len, -1); });
        assert.throws(function () { buf[writeBE](len, val, 1); });
        assert.throws(function () { buf[writeBE](len, val, -1); });
        assert.throws(function () { buf[writeLE](len, val, 1); });
        assert.throws(function () { buf[writeLE](len, val, -1); });
    };
}

var uint_case = xint_case("UInt");
var int_case = xint_case("Int");

module.exports.uint = function (assert) {
    uint_case(assert, "00", 0x00);
    uint_case(assert, "01", 0x01);
    uint_case(assert, "ff", 0xff);

    uint_case(assert, "0000", 0x0000);
    uint_case(assert, "0102", 0x0102);
    uint_case(assert, "ffff", 0xffff);

    uint_case(assert, "000000", 0x000000);
    uint_case(assert, "010203", 0x010203);
    uint_case(assert, "ffffff", 0xffffff);

    uint_case(assert, "00000000", 0x00000000);
    uint_case(assert, "01020304", 0x01020304);
    uint_case(assert, "ffffffff", 0xffffffff);

    uint_case(assert, "0000000000", 0x0000000000);
    uint_case(assert, "0102030405", 0x0102030405);
    uint_case(assert, "ffffffffff", 0xffffffffff);

    uint_case(assert, "000000000000", 0x000000000000);
    uint_case(assert, "010203040506", 0x010203040506);
    uint_case(assert, "ffffffffffff", 0xffffffffffff);

    uint_case(assert, "00000000000000", 0x00000000000000);
    uint_case(assert, "01020304050607", 0x01020304050607);
    uint_case(assert, "ffffffffffffff", 0xffffffffffffff);

    uint_case(assert, "0000000000000000", 0x0000000000000000);
    uint_case(assert, "0102030405060708", 0x0102030405060708, true);
    uint_case(assert, "ffffffffffffffff", 0xffffffffffffffff);

    assert.done();
};

module.exports.int = function (assert) {
    int_case(assert, "00", 0x00);
    int_case(assert, "01", 0x01);
    int_case(assert, "7f", 0x7f);
    int_case(assert, "80", -0x80);
    int_case(assert, "ff", -0x01);

    int_case(assert, "0000", 0x0000);
    int_case(assert, "0102", 0x0102);
    int_case(assert, "7fff", 0x7fff);
    int_case(assert, "8000", -0x8000);
    int_case(assert, "ffff", -0x0001);

    int_case(assert, "000000", 0x000000);
    int_case(assert, "010203", 0x010203);
    int_case(assert, "7fffff", 0x7fffff);
    int_case(assert, "800000", -0x800000);
    int_case(assert, "ffffff", -0x000001);

    int_case(assert, "00000000", 0x00000000);
    int_case(assert, "01020304", 0x01020304);
    int_case(assert, "7fffffff", 0x7fffffff);
    int_case(assert, "80000000", -0x80000000);
    int_case(assert, "ffffffff", -0x00000001);

    int_case(assert, "0000000000", 0x0000000000);
    int_case(assert, "0102030405", 0x0102030405);
    int_case(assert, "7fffffffff", 0x7fffffffff);
    int_case(assert, "8000000000", -0x8000000000);
    int_case(assert, "ffffffffff", -0x0000000001);

    int_case(assert, "000000000000", 0x000000000000);
    int_case(assert, "010203040506", 0x010203040506);
    int_case(assert, "7fffffffffff", 0x7fffffffffff);
    int_case(assert, "800000000000", -0x800000000000);
    int_case(assert, "ffffffffffff", -0x000000000001);

    int_case(assert, "00000000000000", 0x00000000000000);
    int_case(assert, "01020304050607", 0x01020304050607);
    int_case(assert, "7fffffffffffff", 0x7fffffffffffff);
    int_case(assert, "80000000000000", -0x80000000000000);
    int_case(assert, "ffffffffffffff", -0x00000000000001);

    int_case(assert, "0000000000000000", 0x0000000000000000);
    int_case(assert, "0102030405060708", 0x0102030405060708, true);
    int_case(assert, "7fffffffffffffff", 0x7fffffffffffffff);
    int_case(assert, "8000000000000000", -0x8000000000000000);
    int_case(assert, "ffffffffffffffff", -0x0000000000000001);

    assert.done();
};

module.exports.isContiguousInt = function (assert) {
    assert.equal(Buffer.isContiguousInt(0x1fffffffffffff), true);
    assert.equal(Buffer.isContiguousInt(0x20000000000000), false);
    assert.equal(Buffer.isContiguousInt(-0x1fffffffffffff), true);
    assert.equal(Buffer.isContiguousInt(-0x20000000000000), false);

    assert.doesNotThrow(function () {
        Buffer.assertContiguousInt(0x1fffffffffffff);
    });
    assert.throws(function () {
        Buffer.assertContiguousInt(0x20000000000000);
    });
    assert.doesNotThrow(function () {
        Buffer.assertContiguousInt(-0x1fffffffffffff);
    });
    assert.throws(function () {
        Buffer.assertContiguousInt(-0x20000000000000);
    });

    assert.done();
};
