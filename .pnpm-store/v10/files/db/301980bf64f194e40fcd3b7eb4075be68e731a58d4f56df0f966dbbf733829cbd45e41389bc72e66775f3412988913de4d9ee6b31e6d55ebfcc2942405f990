"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BSIGMA = void 0;
exports.G1s = G1s;
exports.G2s = G2s;
/**
 * Internal helpers for blake hash.
 * @module
 */
const utils_ts_1 = require("./utils.js");
/**
 * Internal blake variable.
 * For BLAKE2b, the two extra permutations for rounds 10 and 11 are SIGMA[10..11] = SIGMA[0..1].
 */
// prettier-ignore
exports.BSIGMA = Uint8Array.from([
    0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15,
    14, 10, 4, 8, 9, 15, 13, 6, 1, 12, 0, 2, 11, 7, 5, 3,
    11, 8, 12, 0, 5, 2, 15, 13, 10, 14, 3, 6, 7, 1, 9, 4,
    7, 9, 3, 1, 13, 12, 11, 14, 2, 6, 5, 10, 4, 0, 15, 8,
    9, 0, 5, 7, 2, 4, 10, 15, 14, 1, 11, 12, 6, 8, 3, 13,
    2, 12, 6, 10, 0, 11, 8, 3, 4, 13, 7, 5, 15, 14, 1, 9,
    12, 5, 1, 15, 14, 13, 4, 10, 0, 7, 6, 3, 9, 2, 8, 11,
    13, 11, 7, 14, 12, 1, 3, 9, 5, 0, 15, 4, 8, 6, 2, 10,
    6, 15, 14, 9, 11, 3, 0, 8, 12, 2, 13, 7, 1, 4, 10, 5,
    10, 2, 8, 4, 7, 6, 1, 5, 15, 11, 9, 14, 3, 12, 13, 0,
    0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15,
    14, 10, 4, 8, 9, 15, 13, 6, 1, 12, 0, 2, 11, 7, 5, 3,
    // Blake1, unused in others
    11, 8, 12, 0, 5, 2, 15, 13, 10, 14, 3, 6, 7, 1, 9, 4,
    7, 9, 3, 1, 13, 12, 11, 14, 2, 6, 5, 10, 4, 0, 15, 8,
    9, 0, 5, 7, 2, 4, 10, 15, 14, 1, 11, 12, 6, 8, 3, 13,
    2, 12, 6, 10, 0, 11, 8, 3, 4, 13, 7, 5, 15, 14, 1, 9,
]);
// Mixing function G splitted in two halfs
function G1s(a, b, c, d, x) {
    a = (a + b + x) | 0;
    d = (0, utils_ts_1.rotr)(d ^ a, 16);
    c = (c + d) | 0;
    b = (0, utils_ts_1.rotr)(b ^ c, 12);
    return { a, b, c, d };
}
function G2s(a, b, c, d, x) {
    a = (a + b + x) | 0;
    d = (0, utils_ts_1.rotr)(d ^ a, 8);
    c = (c + d) | 0;
    b = (0, utils_ts_1.rotr)(b ^ c, 7);
    return { a, b, c, d };
}
//# sourceMappingURL=_blake.js.map