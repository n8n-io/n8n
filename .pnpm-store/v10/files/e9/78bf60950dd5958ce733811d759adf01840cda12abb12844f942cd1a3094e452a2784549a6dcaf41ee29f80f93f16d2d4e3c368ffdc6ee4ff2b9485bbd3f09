"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateUnicode = generateUnicode;
const wrapWith_1 = require("./wrapWith");
function* generateUnicode(code, offset, info) {
    if (needToUnicode(code)) {
        yield* (0, wrapWith_1.wrapWith)(offset, offset + code.length, info, toUnicode(code));
    }
    else {
        yield [code, 'template', offset, info];
    }
}
function needToUnicode(str) {
    return str.includes('\\') || str.includes('\n');
}
function toUnicode(str) {
    return str.split('').map(value => {
        const temp = value.charCodeAt(0).toString(16).padStart(4, '0');
        if (temp.length > 2) {
            return '\\u' + temp;
        }
        return value;
    }).join('');
}
//# sourceMappingURL=unicode.js.map