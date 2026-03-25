"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getStringLength = getStringLength;
const graphemer_1 = __importDefault(require("graphemer"));
let splitter;
function isASCII(value) {
    return /^[\u0020-\u007f]*$/u.test(value);
}
function getStringLength(value) {
    if (isASCII(value)) {
        return value.length;
    }
    splitter ??= new graphemer_1.default();
    return splitter.countGraphemes(value);
}
