"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.hex = exports.dec = exports.codePoint = void 0;
var dingbats_1 = __importDefault(require("./dingbats"));
var dingbatsByCodePoint = {};
var fromCodePoint = String.fromCodePoint ? String.fromCodePoint : fromCodePointPolyfill;
for (var _i = 0, dingbats_2 = dingbats_1.default; _i < dingbats_2.length; _i++) {
    var dingbat = dingbats_2[_i];
    var codePoint_1 = parseInt(dingbat["Unicode dec"], 10);
    var scalarValue = {
        codePoint: codePoint_1,
        string: fromCodePoint(codePoint_1),
    };
    dingbatsByCodePoint[dingbat["Typeface name"].toUpperCase() + "_" + dingbat["Dingbat dec"]] = scalarValue;
}
function codePoint(typeface, codePoint) {
    return dingbatsByCodePoint[typeface.toUpperCase() + "_" + codePoint];
}
exports.codePoint = codePoint;
function dec(typeface, dec) {
    return codePoint(typeface, parseInt(dec, 10));
}
exports.dec = dec;
function hex(typeface, hex) {
    return codePoint(typeface, parseInt(hex, 16));
}
exports.hex = hex;
function fromCodePointPolyfill(codePoint) {
    if (codePoint <= 0xFFFF) {
        // BMP
        return String.fromCharCode(codePoint);
    }
    else {
        // Astral
        // https://mathiasbynens.be/notes/javascript-encoding#surrogate-formulae
        var highSurrogate = Math.floor((codePoint - 0x10000) / 0x400) + 0xD800;
        var lowSurrogate = (codePoint - 0x10000) % 0x400 + 0xDC00;
        return String.fromCharCode(highSurrogate, lowSurrogate);
    }
}
;
