// @flow
// This is an internal module, not part of the KaTeX distribution,
// whose purpose is to generate `unicodeSymbols` in Parser.js
// In this way, only this module, and not the distribution/browser,
// needs String's normalize function. As this file is not transpiled,
// Flow comment types syntax is used.
const accents = require('./unicodeAccents');

const result /*: {[string]: string}*/ = {};
const letters = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ" +
    "αβγδεϵζηθϑικλμνξοπϖρϱςστυφϕχψωΓΔΘΛΞΠΣΥΦΨΩ";
for (const letter of letters) {
    for (const accent of Object.getOwnPropertyNames(accents)) {
        const combined = letter + accent;
        const normalized = combined.normalize('NFC');
        if (normalized.length === 1) {
            result[normalized] = combined;
        }
        for (const accent2 of Object.getOwnPropertyNames(accents)) {
            if (accent === accent2) {
                continue;
            }
            const combined2 = combined + accent2;
            const normalized2 = combined2.normalize('NFC');
            if (normalized2.length === 1) {
                result[normalized2] = combined2;
            }
        }
    }
}

module.exports = result;
