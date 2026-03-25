"use strict";
// biome-ignore-all format lint: copied code
// prettier-ignore
Object.defineProperty(exports, "__esModule", { value: true });
exports._hchacha20 = void 0;
/**
 * Copied from `@noble/ciphers/chacha`
 */
var _hchacha20 = function (s, k, i, o32) {
    var x00 = s[0], x01 = s[1], x02 = s[2], x03 = s[3], x04 = k[0], x05 = k[1], x06 = k[2], x07 = k[3], x08 = k[4], x09 = k[5], x10 = k[6], x11 = k[7], x12 = i[0], x13 = i[1], x14 = i[2], x15 = i[3];
    for (var r = 0; r < 20; r += 2) {
        x00 = (x00 + x04) | 0;
        x12 = rotl(x12 ^ x00, 16);
        x08 = (x08 + x12) | 0;
        x04 = rotl(x04 ^ x08, 12);
        x00 = (x00 + x04) | 0;
        x12 = rotl(x12 ^ x00, 8);
        x08 = (x08 + x12) | 0;
        x04 = rotl(x04 ^ x08, 7);
        x01 = (x01 + x05) | 0;
        x13 = rotl(x13 ^ x01, 16);
        x09 = (x09 + x13) | 0;
        x05 = rotl(x05 ^ x09, 12);
        x01 = (x01 + x05) | 0;
        x13 = rotl(x13 ^ x01, 8);
        x09 = (x09 + x13) | 0;
        x05 = rotl(x05 ^ x09, 7);
        x02 = (x02 + x06) | 0;
        x14 = rotl(x14 ^ x02, 16);
        x10 = (x10 + x14) | 0;
        x06 = rotl(x06 ^ x10, 12);
        x02 = (x02 + x06) | 0;
        x14 = rotl(x14 ^ x02, 8);
        x10 = (x10 + x14) | 0;
        x06 = rotl(x06 ^ x10, 7);
        x03 = (x03 + x07) | 0;
        x15 = rotl(x15 ^ x03, 16);
        x11 = (x11 + x15) | 0;
        x07 = rotl(x07 ^ x11, 12);
        x03 = (x03 + x07) | 0;
        x15 = rotl(x15 ^ x03, 8);
        x11 = (x11 + x15) | 0;
        x07 = rotl(x07 ^ x11, 7);
        x00 = (x00 + x05) | 0;
        x15 = rotl(x15 ^ x00, 16);
        x10 = (x10 + x15) | 0;
        x05 = rotl(x05 ^ x10, 12);
        x00 = (x00 + x05) | 0;
        x15 = rotl(x15 ^ x00, 8);
        x10 = (x10 + x15) | 0;
        x05 = rotl(x05 ^ x10, 7);
        x01 = (x01 + x06) | 0;
        x12 = rotl(x12 ^ x01, 16);
        x11 = (x11 + x12) | 0;
        x06 = rotl(x06 ^ x11, 12);
        x01 = (x01 + x06) | 0;
        x12 = rotl(x12 ^ x01, 8);
        x11 = (x11 + x12) | 0;
        x06 = rotl(x06 ^ x11, 7);
        x02 = (x02 + x07) | 0;
        x13 = rotl(x13 ^ x02, 16);
        x08 = (x08 + x13) | 0;
        x07 = rotl(x07 ^ x08, 12);
        x02 = (x02 + x07) | 0;
        x13 = rotl(x13 ^ x02, 8);
        x08 = (x08 + x13) | 0;
        x07 = rotl(x07 ^ x08, 7);
        x03 = (x03 + x04) | 0;
        x14 = rotl(x14 ^ x03, 16);
        x09 = (x09 + x14) | 0;
        x04 = rotl(x04 ^ x09, 12);
        x03 = (x03 + x04) | 0;
        x14 = rotl(x14 ^ x03, 8);
        x09 = (x09 + x14) | 0;
        x04 = rotl(x04 ^ x09, 7);
    }
    var oi = 0;
    o32[oi++] = x00;
    o32[oi++] = x01;
    o32[oi++] = x02;
    o32[oi++] = x03;
    o32[oi++] = x12;
    o32[oi++] = x13;
    o32[oi++] = x14;
    o32[oi++] = x15;
};
exports._hchacha20 = _hchacha20;
var rotl = function (a, b) {
    return (a << b) | (a >>> (32 - b));
};
