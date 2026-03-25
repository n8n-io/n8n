"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ucs2length = ucs2length;
function ucs2length(s) {
    let result = 0;
    let length = s.length;
    let index = 0;
    let charCode;
    while (index < length) {
        result++;
        charCode = s.charCodeAt(index++);
        if (charCode >= 0xd800 && charCode <= 0xdbff && index < length) {
            charCode = s.charCodeAt(index);
            if ((charCode & 0xfc00) == 0xdc00) {
                index++;
            }
        }
    }
    return result;
}
