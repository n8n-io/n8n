"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.maxLetterValue = exports.bitsPerByte = exports.bitsPerLetter = exports.alphabetByValue = exports.alphabetByEncoding = void 0;
const chars = `ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/`;
exports.alphabetByEncoding = Object.entries(chars).reduce((acc, [i, c]) => {
    acc[c] = Number(i);
    return acc;
}, {});
exports.alphabetByValue = chars.split("");
exports.bitsPerLetter = 6;
exports.bitsPerByte = 8;
exports.maxLetterValue = 0b111111;
