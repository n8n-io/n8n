"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.highSurrogateTo = exports.highSurrogateFrom = exports.getCodePoint = exports.fromCodePoint = void 0;
exports.fromCodePoint = String.fromCodePoint ||
    function (astralCodePoint) {
        return String.fromCharCode(Math.floor((astralCodePoint - 0x10000) / 0x400) + 0xd800, ((astralCodePoint - 0x10000) % 0x400) + 0xdc00);
    };
// @ts-expect-error - String.prototype.codePointAt might not exist in older node versions
exports.getCodePoint = String.prototype.codePointAt
    ? function (input, position) {
        return input.codePointAt(position);
    }
    : function (input, position) {
        return (input.charCodeAt(position) - 0xd800) * 0x400 + input.charCodeAt(position + 1) - 0xdc00 + 0x10000;
    };
exports.highSurrogateFrom = 0xd800;
exports.highSurrogateTo = 0xdbff;
//# sourceMappingURL=surrogate-pairs.js.map