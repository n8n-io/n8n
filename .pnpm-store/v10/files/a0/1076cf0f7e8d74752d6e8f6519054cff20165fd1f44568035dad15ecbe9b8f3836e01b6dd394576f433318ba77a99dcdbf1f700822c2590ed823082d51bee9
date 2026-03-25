"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.findWidthInConsole = exports.stripAnsi = void 0;
const simple_wcswidth_1 = require("simple-wcswidth");
/* eslint-disable no-control-regex */
const colorRegex = /\x1b\[\d{1,3}(;\d{1,3})*m/g; // \x1b[30m \x1b[305m \x1b[38;5m
const stripAnsi = (str) => str.replace(colorRegex, '');
exports.stripAnsi = stripAnsi;
const findWidthInConsole = (str, charLength) => {
    let strLen = 0;
    str = (0, exports.stripAnsi)(str);
    if (charLength) {
        Object.entries(charLength).forEach(([key, value]) => {
            // count appearance of the key in the string and remove from original string
            let regex = new RegExp(key, 'g');
            strLen += (str.match(regex) || []).length * value;
            str = str.replace(key, '');
        });
    }
    strLen += (0, simple_wcswidth_1.wcswidth)(str);
    return strLen;
};
exports.findWidthInConsole = findWidthInConsole;
