"use strict";
// Tar can encode large and negative numbers using a leading byte of
// 0xff for negative, and 0x80 for positive.
Object.defineProperty(exports, "__esModule", { value: true });
exports.parse = exports.encode = void 0;
const encode = (num, buf) => {
    if (!Number.isSafeInteger(num)) {
        // The number is so large that javascript cannot represent it with integer
        // precision.
        throw Error('cannot encode number outside of javascript safe integer range');
    }
    else if (num < 0) {
        encodeNegative(num, buf);
    }
    else {
        encodePositive(num, buf);
    }
    return buf;
};
exports.encode = encode;
const encodePositive = (num, buf) => {
    buf[0] = 0x80;
    for (var i = buf.length; i > 1; i--) {
        buf[i - 1] = num & 0xff;
        num = Math.floor(num / 0x100);
    }
};
const encodeNegative = (num, buf) => {
    buf[0] = 0xff;
    var flipped = false;
    num = num * -1;
    for (var i = buf.length; i > 1; i--) {
        var byte = num & 0xff;
        num = Math.floor(num / 0x100);
        if (flipped) {
            buf[i - 1] = onesComp(byte);
        }
        else if (byte === 0) {
            buf[i - 1] = 0;
        }
        else {
            flipped = true;
            buf[i - 1] = twosComp(byte);
        }
    }
};
const parse = (buf) => {
    const pre = buf[0];
    const value = pre === 0x80 ? pos(buf.subarray(1, buf.length))
        : pre === 0xff ? twos(buf)
            : null;
    if (value === null) {
        throw Error('invalid base256 encoding');
    }
    if (!Number.isSafeInteger(value)) {
        // The number is so large that javascript cannot represent it with integer
        // precision.
        throw Error('parsed number outside of javascript safe integer range');
    }
    return value;
};
exports.parse = parse;
const twos = (buf) => {
    var len = buf.length;
    var sum = 0;
    var flipped = false;
    for (var i = len - 1; i > -1; i--) {
        var byte = Number(buf[i]);
        var f;
        if (flipped) {
            f = onesComp(byte);
        }
        else if (byte === 0) {
            f = byte;
        }
        else {
            flipped = true;
            f = twosComp(byte);
        }
        if (f !== 0) {
            sum -= f * Math.pow(256, len - i - 1);
        }
    }
    return sum;
};
const pos = (buf) => {
    var len = buf.length;
    var sum = 0;
    for (var i = len - 1; i > -1; i--) {
        var byte = Number(buf[i]);
        if (byte !== 0) {
            sum += byte * Math.pow(256, len - i - 1);
        }
    }
    return sum;
};
const onesComp = (byte) => (0xff ^ byte) & 0xff;
const twosComp = (byte) => ((0xff ^ byte) + 1) & 0xff;
//# sourceMappingURL=large-numbers.js.map